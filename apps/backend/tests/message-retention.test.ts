/**
 * Durée de conservation des messages des habitants (#342) : réglage des administrateurs, tâche de
 * nuit qui supprime les messages traités trop anciens (pièces jointes comprises), jamais un message
 * non traité ni une demande RGPD dans son délai, chaque commune avec sa durée, une ligne au journal
 * par passage ; demandes d'inscription non confirmées supprimées au bout de 30 jours.
 */
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { purgeExpiredMessages, purgeUnconfirmedSignups } from '../src/services/message-retention';
import { setupStrapi, teardownStrapi } from './strapi';

const UID = 'api::contact-submission.contact-submission';
const LOG = 'api::activity-log.activity-log';
const MONTH = 30.5 * 86_400_000;

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let editor: string;
let siteA: string;
let siteB: string;
let siteC: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const ago = (months: number) => new Date(Date.now() - months * MONTH);

/** Message d'un habitant, dernière modification (et réception) datées dans le passé */
async function message(
  site: string,
  { status, months, category = 'voirie', createdMonths = months }: { status: string; months: number; category?: string; createdMonths?: number },
) {
  const created = await strapi.documents(UID).create({
    data: {
      first_name: 'Marc',
      last_name: 'Dupuis',
      email: 'marc.dupuis@example.test',
      subject: `${status} il y a ${months} mois`,
      message: 'Bonjour',
      category,
      status,
      reference_number: `SVE-2025-${Math.floor(Math.random() * 900000) + 100000}`,
      history: [],
      site,
    } as any,
  });
  await strapi.db
    .connection('contact_submissions')
    .where({ document_id: created.documentId })
    .update({ updated_at: ago(months), created_at: ago(createdMonths) });
  return created.documentId;
}

const exists = async (documentId: string) => !!(await strapi.db.query(UID).findOne({ where: { documentId } }));
const purgeLines = (site: string) =>
  strapi.db.query(LOG).findMany({ where: { action: 'messages_purge', site: { documentId: site } } });

async function createSite(name: string, slug: string, retention: string | null) {
  const site = await strapi.documents('api::site.site').create({
    data: { name, slug, contact_mail: `mairie@${slug}.test`, message_retention: retention } as any,
  });
  return site.documentId;
}

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth(admin))).body.site.documentId;
  siteB = await createSite('Commune B', 'commune-b-conservation', 'months_6');
  siteC = await createSite('Commune C', 'commune-c-conservation', 'never');

  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const site = await strapi.db.query('api::site.site').findOne({ where: { documentId: siteA } });
  const password = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: 'jardin-loire-2026' })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: 'redac@conservation.test', email: 'redac@conservation.test', password, first_name: 'Rémi', last_name: 'Dac', municipality_role: 'editor', blocked: false, active: true, confirmed: true, provider: 'local', role: role.id, site: site.id },
  });
  editor = (await http.post('/api/auth/local').send({ identifier: 'redac@conservation.test', password: 'jardin-loire-2026' })).body.jwt;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('réglage', () => {
  it('pas encore choisi : 1 an appliqué, point de conformité à faire', async () => {
    const site = (await http.get(`/api/sites/${siteA}`).set(auth(admin))).body.data;
    expect(site.message_retention).toBeNull();
    const report = (await http.get('/api/compliance').set(auth(admin))).body.data;
    expect(report.points.find((point: any) => point.id === 'rgpd-conservation')).toMatchObject({ done: false });
  });

  it('réservé aux administrateurs ; valeurs de la liste seulement', async () => {
    const byEditor = await http.put(`/api/sites/${siteA}`).set(auth(editor)).send({ data: { message_retention: 'never' } });
    expect(byEditor.status).toBe(403);
    const invalid = await http.put(`/api/sites/${siteA}`).set(auth(admin)).send({ data: { message_retention: 'months_120' } });
    expect(invalid.status).toBe(400);

    const saved = await http.put(`/api/sites/${siteA}`).set(auth(admin)).send({ data: { message_retention: 'months_24' } });
    expect(saved.status).toBe(200);
    expect(saved.body.data.message_retention).toBe('months_24');
    const report = (await http.get('/api/compliance').set(auth(admin))).body.data;
    expect(report.points.find((point: any) => point.id === 'rgpd-conservation')).toMatchObject({ done: true });

    // Retour à la valeur par défaut (non choisie) pour la suite
    await strapi.db.connection('sites').where({ document_id: siteA }).update({ message_retention: null });
  });
});

describe('suppression automatique', () => {
  it('messages traités trop anciens supprimés, pièces jointes comprises ; le reste conservé ; chaque commune avec sa durée', async () => {
    // Commune A : rien choisi, 1 an
    const resolved = await message(siteA, { status: 'resolved', months: 13 });
    const closed = await message(siteA, { status: 'closed', months: 13 });
    const received = await message(siteA, { status: 'received', months: 30 });
    const inProgress = await message(siteA, { status: 'in_progress', months: 30 });
    const recent = await message(siteA, { status: 'resolved', months: 11 });
    const sevenMonthsA = await message(siteA, { status: 'resolved', months: 7 });
    // Demande RGPD close, mais reçue il y a dix jours : son délai d'un mois court encore
    const rgpdInDelay = await message(siteA, { status: 'closed', months: 13, createdMonths: 0.3, category: 'rgpd' });
    const rgpdOld = await message(siteA, { status: 'resolved', months: 13, category: 'rgpd' });
    // Commune B : 6 mois
    const sevenMonthsB = await message(siteB, { status: 'resolved', months: 7 });
    const receivedB = await message(siteB, { status: 'received', months: 7 });
    // Commune C : jamais
    const veryOldC = await message(siteC, { status: 'closed', months: 60 });

    // Pièce jointe du message traité : fichier sur le disque, lié au message
    const uploads = path.join(strapi.dirs.static.public, 'uploads');
    fs.mkdirSync(uploads, { recursive: true });
    const diskFile = path.join(uploads, 'conservation-piece-jointe.pdf');
    fs.writeFileSync(diskFile, '%PDF-1.4');
    const file = await strapi.db.query('plugin::upload.file').create({
      data: { name: 'piece-jointe.pdf', hash: 'conservation-piece-jointe', ext: '.pdf', mime: 'application/pdf', size: 1, url: '/uploads/conservation-piece-jointe.pdf', provider: 'local' },
    });
    const row = await strapi.db.query(UID).findOne({ where: { documentId: resolved } });
    await strapi.db.connection('files_related_mph').insert({ file_id: file.id, related_id: row.id, related_type: UID, field: 'attachments', order: 1 });
    // Un fichier de la médiathèque joint à un message n'est jamais supprimé avec lui
    const libraryFile = await strapi.db.query('plugin::upload.file').create({
      data: { name: 'plan.pdf', hash: 'conservation-plan', ext: '.pdf', mime: 'application/pdf', size: 1, url: '/uploads/conservation-plan.pdf', provider: 'local' },
    });
    await strapi.documents('api::media-item.media-item').create({ data: { name: 'Plan', file: libraryFile.id, site: siteA } as any });
    const closedRow = await strapi.db.query(UID).findOne({ where: { documentId: closed } });
    await strapi.db.connection('files_related_mph').insert({ file_id: libraryFile.id, related_id: closedRow.id, related_type: UID, field: 'attachments', order: 1 });

    const deleted = await purgeExpiredMessages();
    expect(deleted).toBe(4);

    for (const id of [resolved, closed, rgpdOld, sevenMonthsB]) expect(await exists(id)).toBe(false);
    for (const id of [received, inProgress, recent, sevenMonthsA, rgpdInDelay, receivedB, veryOldC]) expect(await exists(id)).toBe(true);

    expect(await strapi.db.query('plugin::upload.file').findOne({ where: { id: file.id } })).toBeNull();
    expect(fs.existsSync(diskFile)).toBe(false);
    expect(await strapi.db.query('plugin::upload.file').findOne({ where: { id: libraryFile.id } })).not.toBeNull();
  });

  it('journal d’activité : une ligne par commune et par passage, pas une par message', async () => {
    const [lineA] = await purgeLines(siteA);
    expect(await purgeLines(siteA)).toHaveLength(1);
    expect(lineA).toMatchObject({ actor_name: 'Suppression automatique', details: { count: 3, retention: 'months_12', label: '1 an' } });
    expect(await purgeLines(siteB)).toHaveLength(1);
    expect(await purgeLines(siteC)).toHaveLength(0);
    // Aucune ligne « Suppression » par message
    expect(await strapi.db.query(LOG).count({ where: { action: 'delete', target_type: 'contact-submission' } })).toBe(0);

    // Passage suivant sans rien à supprimer : pas de nouvelle ligne
    expect(await purgeExpiredMessages()).toBe(0);
    expect(await purgeLines(siteA)).toHaveLength(1);
  });

  it('visible par l’administrateur de la commune, pas par une autre commune', async () => {
    const { data } = (await http.get('/api/activity-log?action=messages_purge').set(auth(admin))).body;
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ action: 'messages_purge', actorName: 'Suppression automatique', site: { documentId: siteA } });
  });
});

describe('demandes d’inscription non confirmées', () => {
  it('supprimées au bout de 30 jours ; les autres gardées', async () => {
    const REQUEST = 'api::signup-request.signup-request';
    const base = { code_insee: '49007', commune_name: 'Angers', first_name: 'Anne', last_name: 'Lefèvre', email: 'anne@example.test', terms_accepted_at: new Date() };
    const old = await strapi.db.query(REQUEST).create({ data: { ...base, status: 'pending_email' } });
    const oldConfirmation = await strapi.db.query(REQUEST).create({ data: { ...base, status: 'pending_confirmation' } });
    const fresh = await strapi.db.query(REQUEST).create({ data: { ...base, status: 'pending_email' } });
    const confirmed = await strapi.db.query(REQUEST).create({ data: { ...base, status: 'confirmed' } });
    const longAgo = new Date(Date.now() - 31 * 86_400_000);
    await strapi.db.connection('signup_requests').whereIn('id', [old.id, oldConfirmation.id, confirmed.id]).update({ created_at: longAgo });
    await strapi.db.connection('signup_requests').where({ id: fresh.id }).update({ created_at: new Date(Date.now() - 10 * 86_400_000) });

    expect(await purgeUnconfirmedSignups()).toBe(2);
    const left = (await strapi.db.query(REQUEST).findMany({ select: ['id'] })).map((entry: any) => entry.id);
    expect(left).toEqual(expect.arrayContaining([fresh.id, confirmed.id]));
    expect(left).not.toContain(old.id);
    expect(left).not.toContain(oldConfirmation.id);
  });
});

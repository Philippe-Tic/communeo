/**
 * Export des données d'une commune (#343) : demandé par un administrateur (ou l'équipe), préparé en
 * arrière-plan, téléchargé depuis l'administration ; contenu de l'archive ; cloisonnement entre
 * communes ; possible après la fin de l'essai ; archive effacée après 7 jours et avec la commune.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { Open } from 'unzipper';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { deleteCommune } from '../src/services/commune-deletion';
import { purgeExports, requeueInterruptedExports, startExports } from '../src/services/data-export';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let superAdmin: string;
let adminA: string;
let editorA: string;
let adminC: string;
let siteA: string;
let siteC: string;
let exportDir: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const SITE = 'api::site.site';
const site = (documentId: string) => strapi.db.query(SITE).findOne({ where: { documentId } }) as Promise<any>;
const activity = (action: string) => strapi.db.query('api::activity-log.activity-log').findMany({ where: { action }, orderBy: { id: 'desc' } }) as Promise<any[]>;
// PNG 1 × 1 valide (traité par sharp)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const text = (doc: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: doc }] }] });

async function createUser(email: string, role: 'admin' | 'editor', siteDocumentId: string) {
  const authenticated = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const target = await site(siteDocumentId);
  const password = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: 'jardin-loire-2026' })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: email, email, password, first_name: 'Anne', last_name: 'Maire', municipality_role: role, blocked: false, active: true, confirmed: true, provider: 'local', role: authenticated.id, site: target.id },
  });
  return (await api.post('/api/auth/local').send({ identifier: email, password: 'jardin-loire-2026' })).body.jwt as string;
}

/** Strapi prépare l'export de son côté (son propre module chargé depuis dist) : on attend la fin */
async function settled(documentId: string) {
  for (let i = 0; i < 200; i += 1) {
    await startExports();
    const status = (await site(documentId)).data_export?.status;
    if (status === 'ready' || status === 'failed') return status;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('export jamais terminé');
}

/** Télécharge l'archive et l'ouvre : nom → contenu texte */
async function download(token: string, query = '') {
  const res = await api
    .get(`/api/data-export/download${query}`)
    .set(auth(token))
    .buffer(true)
    .parse((response, callback) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => callback(null, Buffer.concat(chunks)));
    });
  if (res.status !== 200) return { res, files: new Map<string, string>() };
  const zip = await Open.buffer(res.body as Buffer);
  const files = new Map<string, string>();
  for (const entry of zip.files) if (entry.type === 'File') files.set(entry.path, (await entry.buffer()).toString('utf8'));
  return { res, files };
}

beforeAll(async () => {
  exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exports-'));
  process.env.EXPORT_DIR = exportDir;
  process.env.SIGNUP_NOTIFY_EMAIL = 'equipe@communeo.test';
  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  adminA = (await api.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  superAdmin = (await api.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
  siteA = (await api.get('/api/users/me').set(auth(adminA))).body.site.documentId;
  editorA = await createUser('redac@a.test', 'editor', siteA);
  siteC = (await strapi.documents(SITE).create({ data: { name: 'Saint-Éloi-sur-Seine', slug: 'saint-eloi', contact_mail: 'mairie@c.test' } as any })).documentId;
  adminC = await createUser('admin@c.test', 'admin', siteC);

  // Commune A : une image de la médiathèque, une page publiée puis modifiée, un brouillon, des données d'habitants
  const media = (
    await api.post('/api/media-items/upload').set(auth(adminA)).field('folder', 'Bâtiments').field('alt_text', 'Façade de la mairie').attach('files', PNG, { filename: 'mairie.png', contentType: 'image/png' })
  ).body.data;
  const siteRow = await site(siteA);
  const page = await strapi.documents('api::page.page').create({
    data: { title: 'Horaires de la mairie', slug: 'horaires', site: siteRow.id, blocks: [{ __component: 'blocks.text', body: text('Ouvert le lundi') }, { __component: 'blocks.image', image: media.file.id }] } as any,
  });
  await strapi.documents('api::page.page').publish({ documentId: page.documentId });
  await new Promise((resolve) => setTimeout(resolve, 20));
  await strapi.documents('api::page.page').update({ documentId: page.documentId, data: { blocks: [{ __component: 'blocks.text', body: text('Ouvert le lundi et le mardi') }] } as any });
  await strapi.documents('api::page.page').create({ data: { title: 'Projet de salle', slug: 'projet-salle', site: siteRow.id, blocks: [] } as any });
  await strapi.documents('api::contact-submission.contact-submission').create({
    data: { first_name: 'Paul', last_name: 'Durand', email: 'paul@habitant.test', subject: 'Trou dans la route', message: 'Rue des Lilas; devant le n° 3', reference_number: 'MSG-0001', site: siteRow.id } as any,
  });
  await strapi.documents('api::newsletter-subscriber.newsletter-subscriber').create({
    data: { email: 'lea@habitant.test', first_name: 'Léa', subscribed_at: new Date().toISOString(), active: true, unsubscribe_token: 'jeton-secret-de-desinscription', site: siteRow.id } as any,
  });
  // Commune C : ses contenus ne doivent jamais apparaître dans l'archive de A
  await strapi.documents('api::page.page').create({ data: { title: 'Page secrète de Saint-Éloi', slug: 'secrete', site: (await site(siteC)).id, blocks: [] } as any });
});

afterAll(async () => {
  await teardownStrapi();
  fs.rmSync(exportDir, { recursive: true, force: true });
  delete process.env.EXPORT_DIR;
  delete process.env.SIGNUP_NOTIFY_EMAIL;
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe('droits', () => {
  it('réservé aux administrateurs de la commune et à l’équipe', async () => {
    expect((await api.get('/api/data-export').set(auth(editorA))).status).toBe(403);
    expect((await api.post('/api/data-export').set(auth(editorA))).status).toBe(403);
    expect((await api.get('/api/data-export/download').set(auth(editorA))).status).toBe(403);
    expect((await api.get('/api/data-export')).status).toBe(403);
    expect((await api.get('/api/data-export').set(auth(adminA))).body.data).toMatchObject({ status: null, size: null });
  });

  it('l’état ne se pose pas par les réglages du site', async () => {
    await api.put(`/api/sites/${siteA}`).set(auth(adminA)).send({ data: { data_export: { status: 'ready', file: '../../config/database.ts', finishedAt: new Date().toISOString() } } });
    expect((await site(siteA)).data_export).toBeNull();
    expect((await api.get('/api/data-export/download').set(auth(adminA))).status).toBe(404);
  });
});

describe('préparation et téléchargement', () => {
  it('demandé : préparé en arrière-plan, administrateurs prévenus, journal', async () => {
    const res = await api.post('/api/data-export').set(auth(adminA));
    expect(res.status).toBe(202);
    expect(['queued', 'running', 'ready']).toContain(res.body.data.status);
    await settled(siteA);
    const state = (await api.get('/api/data-export').set(auth(adminA))).body.data;
    expect(state).toMatchObject({ status: 'ready', requestedBy: expect.stringContaining('Test'), error: null });
    expect(state.size).toBeGreaterThan(0);
    expect(new Date(state.expiresAt).getTime() - new Date(state.finishedAt).getTime()).toBe(7 * 86_400_000);
    expect(sentEmails.find((email) => email.to === 'test@example.com')?.subject).toMatch(/^Export des données de .* prêt/);
    expect((await activity('data_export'))[0]).toMatchObject({ target_id: siteA });
  });

  it('archive : LISEZMOI, contenus avec leur statut, pages HTML, fichiers et texte alternatif, données personnelles', async () => {
    const { res, files } = await download(adminA);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="communeo-export-.+-\d{4}-\d{2}-\d{2}\.zip"$/);
    expect(res.headers['cache-control']).toBe('private, no-store');

    // Site jamais mis en ligne dans les tests (pas de dossier des sites) : expliqué
    expect(files.get('LISEZMOI.md')).toContain('Le site publié n’est pas inclus');

    const pages = JSON.parse(files.get('contenus/pages.json')!);
    expect(files.get('LISEZMOI.md')).toContain(`\`pages.json\` (${pages.length})`);
    const horaires = pages.find((page: any) => page.slug === 'horaires');
    expect(horaires).toMatchObject({ title: 'Horaires de la mairie', statut: 'publié, modifications en brouillon', publishedAt: expect.any(String) });
    expect(horaires).not.toHaveProperty('id');
    expect(horaires).not.toHaveProperty('site');
    // La version en ligne garde l'image, décrite par son chemin dans l'archive et son texte alternatif
    const image = horaires.versionEnLigne.blocks.find((block: any) => block.__component === 'blocks.image').image;
    expect(image).toMatchObject({ nom: 'mairie.png', texteAlternatif: 'Façade de la mairie', type: 'image/png' });
    expect(image.fichier).toMatch(/^fichiers\/\d+-mairie\.png$/);
    expect(files.has(image.fichier)).toBe(true);
    expect(pages.find((page: any) => page.slug === 'projet-salle')).toMatchObject({ statut: 'brouillon', publishedAt: null });

    expect(files.get('contenus/pages/horaires.html')).toContain('<p>Ouvert le lundi et le mardi</p>');
    expect(files.get('contenus/pages/horaires.html')).toContain('Statut : publié, modifications en brouillon');
    expect(files.get('fichiers/index.csv')).toContain('Façade de la mairie');
    expect(files.get('fichiers/index.csv')).toContain('Bâtiments');
    expect(files.get('contenus/reglages-du-site.json')).not.toContain('data_export');

    expect(files.get('donnees-personnelles/messages.csv')).toContain('MSG-0001;');
    expect(files.get('donnees-personnelles/messages.csv')).toContain('"Rue des Lilas; devant le n° 3"');
    expect(files.get('donnees-personnelles/abonnes-lettre.csv')).toContain('lea@habitant.test;Léa;');
    expect(files.has('donnees-personnelles/associations.csv')).toBe(true);

    // Rien d'une autre commune, aucun jeton de désinscription
    const all = [...files.values()].join('\n');
    expect(all).not.toContain('Page secrète de Saint-Éloi');
    expect(all).not.toContain('jeton-secret-de-desinscription');
    expect((await activity('data_export_download'))[0]).toMatchObject({ target_id: siteA });
  });

  it('une autre commune ne voit ni ne télécharge l’export de A, même en passant son identifiant', async () => {
    expect((await api.get('/api/data-export').set(auth(adminC))).body.data.status).toBeNull();
    expect((await download(adminC)).res.status).toBe(404);
    expect((await download(adminC, `?site=${siteA}`)).res.status).toBe(404);
    expect((await api.get('/api/data-export/download').set(auth(adminC)).set('X-Site-Document-Id', siteA)).status).toBe(404);
  });

  it('l’équipe : depuis l’espace équipe (?site=) ou dans l’administration de la commune', async () => {
    const { res, files } = await download(superAdmin, `?site=${siteA}`);
    expect(res.status).toBe(200);
    expect(files.has('contenus/pages.json')).toBe(true);
    expect((await api.get('/api/data-export').set(auth(superAdmin)).set('X-Site-Document-Id', siteA)).body.data.status).toBe('ready');
    expect((await api.get('/api/data-export').set(auth(superAdmin))).status).toBe(403);
  });

  it('demandé par l’équipe : la commune et la personne de l’équipe sont prévenues', async () => {
    expect((await api.post(`/api/data-export?site=${siteC}`).set(auth(superAdmin))).status).toBe(202);
    await settled(siteC);
    expect(sentEmails.map((email) => email.to).sort()).toEqual(['admin@c.test', 'super@example.com']);
    expect((await site(siteC)).data_export).toMatchObject({ status: 'ready', requestedBy: expect.stringMatching(/^L'équipe Communeo/) });
  });
});

describe('site publié', () => {
  it('servi depuis le dossier des sites (lien vers sa version) : copié sans ses règles Caddy', async () => {
    const sites = fs.mkdtempSync(path.join(os.tmpdir(), 'sites-'));
    const slug = (await site(siteA)).slug;
    fs.mkdirSync(path.join(sites, '.versions', `${slug}-1`, '.regles'), { recursive: true });
    fs.writeFileSync(path.join(sites, '.versions', `${slug}-1`, 'index.html'), '<h1>Accueil publié</h1>');
    fs.writeFileSync(path.join(sites, '.versions', `${slug}-1`, '.regles', 'site.caddy'), 'règles');
    fs.symlinkSync(path.join('.versions', `${slug}-1`), path.join(sites, slug));
    const previous = { PUBLISH_DIR: process.env.PUBLISH_DIR, NETLIFY_TOKEN: process.env.NETLIFY_TOKEN };
    process.env.PUBLISH_DIR = sites;
    delete process.env.NETLIFY_TOKEN;
    try {
      await api.post('/api/data-export').set(auth(adminA));
      expect(await settled(siteA)).toBe('ready');
      const { files } = await download(adminA);
      expect(files.get('site-publie/index.html')).toBe('<h1>Accueil publié</h1>');
      expect([...files.keys()].some((name) => name.includes('.regles'))).toBe(false);
      expect(files.get('LISEZMOI.md')).toContain('`site-publie/`');
    } finally {
      Object.assign(process.env, previous);
      if (previous.PUBLISH_DIR === undefined) delete process.env.PUBLISH_DIR;
      if (previous.NETLIFY_TOKEN === undefined) delete process.env.NETLIFY_TOKEN;
      fs.rmSync(sites, { recursive: true, force: true });
    }
  });
});

describe('essai terminé, reprise, effacement', () => {
  it('possible après la fin de l’essai (administration en lecture seule)', async () => {
    await strapi.db.query(SITE).update({ where: { documentId: siteC }, data: { plan: 'expired', trial_expired_at: new Date() } });
    expect((await api.put(`/api/sites/${siteC}`).set(auth(adminC)).send({ data: { contact_phone: '01' } })).status).toBe(403);
    const res = await api.post('/api/data-export').set(auth(adminC));
    expect(res.status).toBe(202);
    await settled(siteC);
    expect((await download(adminC)).res.status).toBe(200);
    await strapi.db.query(SITE).update({ where: { documentId: siteC }, data: { plan: 'live', trial_expired_at: null } });
  });

  it('préparation interrompue par un redémarrage : reprise', async () => {
    const current = (await site(siteA)).data_export;
    await strapi.db.query(SITE).update({ where: { documentId: siteA }, data: { data_export: { ...current, status: 'running', startedAt: new Date().toISOString() } } });
    await requeueInterruptedExports();
    expect((await site(siteA)).data_export.status).toBe('queued');
    await settled(siteA);
    expect((await site(siteA)).data_export.status).toBe('ready');
  });

  it('effacée 7 jours après sa préparation', async () => {
    const current = (await site(siteA)).data_export;
    expect(fs.existsSync(path.join(exportDir, current.file))).toBe(true);
    await purgeExports(new Date(Date.now() + 6 * 86_400_000));
    expect((await site(siteA)).data_export.status).toBe('ready');
    await purgeExports(new Date(Date.now() + 8 * 86_400_000));
    expect((await site(siteA)).data_export).toBeNull();
    expect(fs.existsSync(path.join(exportDir, current.file))).toBe(false);
    expect((await download(adminA)).res.status).toBe(404);
  });

  it('effacée avec la commune', async () => {
    await api.post('/api/data-export').set(auth(adminC));
    await settled(siteC);
    const file = (await site(siteC)).data_export.file;
    expect(fs.existsSync(path.join(exportDir, file))).toBe(true);
    await deleteCommune(siteC);
    expect(fs.existsSync(path.join(exportDir, file))).toBe(false);
  });
});

/**
 * File de validation de l'équipe Communeo (#313) : inscriptions sans adresse officielle et passages en
 * live demandés, validés ou refusés avec un motif envoyé par e-mail. Réservée à l'équipe.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { addDays } from '@communeo/core';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let superAdmin: string;
let siteA: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const REQUEST = 'api::signup-request.signup-request';
const SITE = 'api::site.site';
const team = () => http.get('/api/validations').set(auth(superAdmin));
/** Demande de passage en live, telle que la laisse un devis validé (tests/quote.test.ts) */
const requestLive = () =>
  strapi.db.query(SITE).update({ where: { documentId: siteA }, data: { live_requested_at: new Date(), live_requested_by: 'Marie Durand, Maire (test@example.com)' } });

const awaitingReview = (insee: string, commune: string, email: string) =>
  strapi.db.query(REQUEST).create({
    data: { code_insee: insee, commune_name: commune, first_name: 'Julie', last_name: 'Secrétaire', email, status: 'awaiting_review', terms_accepted_at: new Date() },
  });

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  superAdmin = (await http.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth(admin))).body.site.documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe('accès', () => {
  it('réservée à l’équipe Communeo', async () => {
    expect((await http.get('/api/validations').set(auth(admin))).status).toBe(403);
    expect((await http.get('/api/validations')).status).toBe(403);
  });
});

describe('inscriptions à vérifier', () => {
  it('valider : commune créée en essai, demandeur invité, demande traitée une seule fois', async () => {
    const pending = await awaitingReview('58100', 'Sans-Annuaire', 'julie@sans-annuaire.test');
    const list = (await team()).body.data;
    expect(list.signups).toEqual([
      expect.objectContaining({ id: pending.id, communeName: 'Sans-Annuaire', insee: '58100', firstName: 'Julie', email: 'julie@sans-annuaire.test' }),
    ]);

    const approved = await http.post(`/api/validations/signups/${pending.id}/approve`).set(auth(superAdmin));
    expect(approved.status).toBe(200);
    const site: any = await strapi.db.query(SITE).findOne({ where: { documentId: approved.body.data.documentId } });
    expect(site).toMatchObject({ name: 'Sans-Annuaire', code_insee: '58100', plan: 'trial', contact_mail: 'julie@sans-annuaire.test' });
    const user: any = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: 'julie@sans-annuaire.test' } });
    expect(user).toMatchObject({ municipality_role: 'admin', blocked: true });
    expect(sentEmails.find((mail) => mail.to === 'julie@sans-annuaire.test')?.text).toMatch(/invitation\?jeton=/);
    expect(await strapi.db.query(REQUEST).findOne({ where: { id: pending.id } })).toMatchObject({ status: 'confirmed', reviewed_by: expect.any(String) });

    expect((await team()).body.data.signups).toEqual([]);
    expect((await http.post(`/api/validations/signups/${pending.id}/approve`).set(auth(superAdmin))).status).toBe(404);
  });

  it('commune déjà sur Communeo : validation refusée', async () => {
    const duplicate = await awaitingReview('58100', 'Sans-Annuaire', 'autre@sans-annuaire.test');
    expect((await http.post(`/api/validations/signups/${duplicate.id}/approve`).set(auth(superAdmin))).status).toBe(409);
    await strapi.db.query(REQUEST).delete({ where: { id: duplicate.id } });
  });

  it('refuser : motif obligatoire, envoyé au demandeur', async () => {
    const pending = await awaitingReview('58200', 'Refusée', 'paul@refusee.test');
    expect((await http.post(`/api/validations/signups/${pending.id}/reject`).set(auth(superAdmin)).send({ reason: '  ' })).status).toBe(400);
    const res = await http.post(`/api/validations/signups/${pending.id}/reject`).set(auth(superAdmin)).send({ reason: 'Nous n’avons pas pu joindre la mairie.' });
    expect(res.body.data).toEqual({ emailed: true });
    const [mail] = sentEmails.filter((email) => email.to === 'paul@refusee.test');
    expect(mail!.text).toContain('Nous n’avons pas pu joindre la mairie.');
    expect(await strapi.db.query(REQUEST).findOne({ where: { id: pending.id } })).toMatchObject({ status: 'rejected', rejection_reason: 'Nous n’avons pas pu joindre la mairie.' });
    expect(await strapi.db.query(SITE).count({ where: { code_insee: '58200' } })).toBe(0);
    expect(await strapi.db.query('api::activity-log.activity-log').count({ where: { action: 'signup_reject' } })).toBe(1);
  });
});

describe('passages en live demandés', () => {
  beforeAll(async () => {
    await strapi.db.query(SITE).update({ where: { documentId: siteA }, data: { plan: 'trial', trial_ends_at: addDays(new Date(), 10) } });
  });

  it('la demande arrive dans la file, avec son auteur', async () => {
    await requestLive();
    const [live] = (await team()).body.data.liveRequests;
    expect(live).toMatchObject({ documentId: siteA, plan: 'trial', requestedBy: 'Marie Durand, Maire (test@example.com)' });
  });

  it('refuser : la demande est retirée, le motif envoyé aux administrateurs', async () => {
    const res = await http.post(`/api/validations/live/${siteA}/reject`).set(auth(superAdmin)).send({ reason: 'Le devis n’a pas été signé.' });
    expect(res.status).toBe(200);
    const mail = sentEmails.find((email) => email.to === 'test@example.com');
    expect(mail!.text).toContain('Le devis n’a pas été signé.');
    expect(await strapi.db.query(SITE).findOne({ where: { documentId: siteA } })).toMatchObject({ plan: 'trial', live_requested_at: null, live_requested_by: null });
    expect((await team()).body.data.liveRequests).toEqual([]);
    // Plus de demande : rien à valider
    expect((await http.post(`/api/validations/live/${siteA}/approve`).set(auth(superAdmin))).status).toBe(404);
  });

  it('valider : la commune passe en live et en est prévenue', async () => {
    await requestLive();
    sentEmails.length = 0;
    expect((await http.post(`/api/validations/live/${siteA}/approve`).set(auth(superAdmin))).status).toBe(200);
    expect(await strapi.db.query(SITE).findOne({ where: { documentId: siteA } })).toMatchObject({ plan: 'live', live_requested_at: null });
    expect(sentEmails.find((email) => email.to === 'test@example.com')?.subject).toMatch(/est en live/);
    expect((await team()).body.data.liveRequests).toEqual([]);
  });

  it('une commune ne passe pas elle-même en live', async () => {
    await strapi.db.query(SITE).update({ where: { documentId: siteA }, data: { plan: 'trial' } });
    expect((await http.put(`/api/sites/${siteA}`).set(auth(admin)).send({ data: { plan: 'live' } })).status).toBe(200);
    expect((await strapi.db.query(SITE).findOne({ where: { documentId: siteA } })).plan).toBe('trial');
    expect((await http.post(`/api/validations/live/${siteA}/approve`).set(auth(admin))).status).toBe(403);
  });
});

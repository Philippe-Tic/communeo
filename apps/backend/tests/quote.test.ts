/**
 * Devis en ligne (#312) : offre selon la population INSEE (API simulée), projet de devis en PDF,
 * validation par un administrateur (signataire, heure, adresse IP, PDF archivé), demande de passage en
 * live pour l'équipe, puis devis accepté au passage en live ou refusé.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { addDays } from '@communeo/core';
import { sha256 } from '../src/services/quote-pdf';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let geo: http.Server;
let admin: string;
let superAdmin: string;
let siteA: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const SITE = 'api::site.site';
const QUOTE = 'api::quote.quote';
const SIRET = '21750001600019';
const signing = { siret: SIRET, address: '1 place de la Mairie, 58300 Saint-Aubin', billingEmail: 'Compta@Mairie.test', signatoryName: 'Marie Durand', signatoryRole: 'Maire', accept: true };

beforeAll(async () => {
  geo = http.createServer((req, res) => {
    const code = /^\/geo\/communes\/([^/?]+)/.exec(req.url ?? '')?.[1];
    res.writeHead(code === '58236' ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(code === '58236' ? { population: 1234 } : { code: 404 }));
  });
  await new Promise<void>((resolve) => geo.listen(0, '127.0.0.1', resolve));
  process.env.GEO_API_URL = `http://127.0.0.1:${(geo.address() as AddressInfo).port}/geo`;
  process.env.SIGNUP_NOTIFY_EMAIL = 'equipe@communeo.test';

  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  admin = (await api.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  superAdmin = (await api.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
  siteA = (await api.get('/api/users/me').set(auth(admin))).body.site.documentId;
  await strapi.db.query(SITE).update({ where: { documentId: siteA }, data: { code_insee: '58236', plan: 'trial', trial_ends_at: addDays(new Date(), 12) } });
});

afterAll(async () => {
  await teardownStrapi();
  geo.close();
  delete process.env.GEO_API_URL;
  delete process.env.SIGNUP_NOTIFY_EMAIL;
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe('offre', () => {
  it('tranche et prix selon la population INSEE, franchise de TVA par défaut', async () => {
    const res = await api.get('/api/quote').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.offer).toEqual({ population: 1234, tierLabel: 'de 500 à 1 999 habitants', amounts: { ht: 390, vatRate: 0, vat: 0, ttc: 390 } });
    expect(res.body.data.quote).toBeNull();
  });

  it('projet de devis en PDF, avec la saisie en cours', async () => {
    const res = await api.get(`/api/quote/draft?siret=${SIRET}`).set(auth(admin)).buffer(true).parse((response, done) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => done(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('population introuvable : l’équipe fait le devis', async () => {
    await strapi.db.query(SITE).update({ where: { documentId: siteA }, data: { code_insee: '99999' } });
    expect((await api.get('/api/quote').set(auth(admin))).status).toBe(409);
    await strapi.db.query(SITE).update({ where: { documentId: siteA }, data: { code_insee: '58236' } });
  });
});

describe('validation du devis', () => {
  it('champs obligatoires, SIRET vérifié, acceptation cochée', async () => {
    const res = await api.post('/api/quote/sign').set(auth(admin)).send({ ...signing, siret: '21750001600018', accept: false });
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors).toEqual([
      'SIRET invalide : 14 chiffres, tel qu’il figure sur l’avis de situation INSEE.',
      'Cochez la case pour accepter le devis et les conditions.',
    ]);
  });

  let documentId: string;

  it('validé : numéroté, signataire, heure et adresse IP, PDF archivé ; demande de passage en live pour l’équipe', async () => {
    const res = await api.post('/api/quote/sign').set({ ...auth(admin), 'X-Forwarded-For': '203.0.113.7' }).send(signing);
    expect(res.status).toBe(200);
    documentId = res.body.data.documentId;
    const year = new Date().getFullYear();
    expect(res.body.data).toMatchObject({ number: `DEV-${year}-0001`, status: 'signed', signatoryName: 'Marie Durand', signatoryRole: 'Maire', amountHT: 390, amountTTC: 390 });

    const quote: any = await strapi.db.query(QUOTE).findOne({ where: { documentId } });
    expect(quote).toMatchObject({ siret: SIRET, billing_email: 'compta@mairie.test', population: 1234, signed_ip: '203.0.113.7', signed_by_email: 'test@example.com' });
    expect(quote.pdf_sha256).toBe(sha256(Buffer.from(quote.pdf, 'base64')));

    const site: any = await strapi.db.query(SITE).findOne({ where: { documentId: siteA } });
    expect(site.live_requested_at).toBeTruthy();
    expect(site.live_requested_by).toBe('Marie Durand, Maire (test@example.com)');
    expect(sentEmails.find((mail) => mail.to === 'equipe@communeo.test')?.subject).toBe(`Devis validé : ${site.name} (DEV-${year}-0001)`);
    expect(await strapi.db.query('api::activity-log.activity-log').count({ where: { action: 'quote_sign' } })).toBe(1);

    // Un seul devis en attente à la fois
    expect((await api.post('/api/quote/sign').set(auth(admin)).send(signing)).status).toBe(409);
    expect((await api.get('/api/quote').set(auth(admin))).body.data.quote).toMatchObject({ number: `DEV-${year}-0001`, status: 'signed' });
  });

  it('le PDF validé est retrouvable par la commune et par l’équipe, pas par les autres', async () => {
    const commune = await api.get(`/api/quote/${documentId}/pdf`).set(auth(admin));
    expect(commune.status).toBe(200);
    expect(commune.headers['content-type']).toBe('application/pdf');
    expect((await api.get(`/api/quote/${documentId}/pdf`).set(auth(superAdmin))).status).toBe(200);
    expect((await api.get(`/api/quote/${documentId}/pdf`)).status).toBe(403);
    // Données privées jamais exposées ailleurs
    expect(JSON.stringify((await api.get('/api/quote').set(auth(admin))).body)).not.toContain('203.0.113.7');
  });

  it('la file de l’équipe joint le devis à la demande', async () => {
    const [live] = (await api.get('/api/validations').set(auth(superAdmin))).body.data.liveRequests;
    expect(live.quote).toMatchObject({ documentId, amountHT: 390, tierLabel: 'de 500 à 1 999 habitants', signatory: 'Marie Durand, Maire' });
  });

  it('refusé par l’équipe : devis refusé, un nouveau devis peut être validé', async () => {
    await api.post(`/api/validations/live/${siteA}/reject`).set(auth(superAdmin)).send({ reason: 'SIRET à vérifier.' });
    expect((await strapi.db.query(QUOTE).findOne({ where: { documentId } })).status).toBe('rejected');
    const again = await api.post('/api/quote/sign').set(auth(admin)).send(signing);
    expect(again.status).toBe(200);
    expect(again.body.data.number).toBe(`DEV-${new Date().getFullYear()}-0002`);
    documentId = again.body.data.documentId;
  });

  it('passage en live : devis accepté ; plus de devis à valider', async () => {
    await api.post(`/api/validations/live/${siteA}/approve`).set(auth(superAdmin));
    expect((await strapi.db.query(QUOTE).findOne({ where: { documentId } })).status).toBe('accepted');
    expect((await api.post('/api/quote/sign').set(auth(admin)).send(signing)).status).toBe(409);
  });
});

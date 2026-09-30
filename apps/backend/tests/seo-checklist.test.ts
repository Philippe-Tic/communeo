/**
 * Référencement au passage sur le domaine (#336) : liste de contrôle vérifiée en direct dans
 * l'Annuaire et Wikidata (services simulés), démarches déclarées par la commune, e-mail aux
 * administrateurs.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { sendChecklistEmail } from '../src/services/seo-checklist';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let server: http.Server;
let admin: string;
let editor: string;
let siteA: string;
let annuaireSite = '["http://ancien-site.fr"]';
let wikidataSite: string | null = 'https://www.mairie-test.fr/';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    if (req.url?.startsWith('/annuaire')) {
      res.end(JSON.stringify({ results: [{ nom: 'Mairie - Test Site', url_service_public: 'https://lannuaire.service-public.gouv.fr/test/mairie', site_internet: annuaireSite.startsWith('[') ? JSON.stringify(JSON.parse(annuaireSite).map((valeur: string) => ({ valeur }))) : annuaireSite }] }));
    } else {
      res.end(JSON.stringify({ results: { bindings: [{ item: { value: 'http://www.wikidata.org/entity/Q1' }, article: { value: 'https://fr.wikipedia.org/wiki/Test' }, ...(wikidataSite ? { site: { value: wikidataSite } } : {}) }] } }));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ANNUAIRE_API_URL = `${base}/annuaire`;
  process.env.WIKIDATA_SPARQL_URL = `${base}/sparql`;

  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  admin = (await api.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await api.get('/api/users/me').set(auth(admin))).body.site.documentId;
  const authenticated = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const site = await strapi.db.query('api::site.site').findOne({ where: { documentId: siteA } });
  const password = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: 'jardin-loire-2026' })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: 'redac@a.test', email: 'redac@a.test', password, municipality_role: 'editor', blocked: false, active: true, confirmed: true, provider: 'local', role: authenticated.id, site: site.id },
  });
  editor = (await api.post('/api/auth/local').send({ identifier: 'redac@a.test', password: 'jardin-loire-2026' })).body.jwt;
});

afterAll(async () => {
  await teardownStrapi();
  server.close();
  delete process.env.ANNUAIRE_API_URL;
  delete process.env.WIKIDATA_SPARQL_URL;
});

beforeEach(() => {
  sentEmails.length = 0;
});

const states = (items: Array<{ id: string; state: string }>) => Object.fromEntries(items.map((item) => [item.id, item.state]));

describe('liste de contrôle du référencement', () => {
  it('réservée aux administrateurs ; rien tant que le site n’est pas publié', async () => {
    expect((await api.get('/api/seo/checklist').set(auth(editor))).status).toBe(403);
    const res = await api.get('/api/seo/checklist').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('vérifie l’Annuaire et Wikidata en direct : ce qui pointe encore ailleurs est à faire', async () => {
    await strapi.db.query('api::site.site').update({ where: { documentId: siteA }, data: { live_url: 'https://mairie-test.fr', code_insee: '58236' } });
    const res = await api.get('/api/seo/checklist?refresh=1').set(auth(admin));
    expect(res.body.data.siteUrl).toBe('https://mairie-test.fr');
    expect(states(res.body.data.items)).toEqual({ annuaire: 'todo', google: 'todo', wikipedia: 'verified' });
    const annuaire = res.body.data.items.find((item: { id: string }) => item.id === 'annuaire');
    expect(annuaire.detail).toContain('http://ancien-site.fr');
    expect(annuaire.links[0]).toEqual({ label: 'Fiche de la mairie dans l’Annuaire', href: 'https://lannuaire.service-public.gouv.fr/test/mairie' });
  });

  it('la commune déclare une démarche faite ; l’Annuaire mis à jour passe « vérifié »', async () => {
    const declared = await api.put('/api/seo/checklist/google').set(auth(admin)).send({ done: true });
    expect(states(declared.body.data.items).google).toBe('declared');
    expect((await api.put('/api/seo/checklist/inconnue').set(auth(admin)).send({ done: true })).status).toBe(404);

    annuaireSite = '["https://www.mairie-test.fr"]';
    const res = await api.get('/api/seo/checklist?refresh=1').set(auth(admin));
    expect(states(res.body.data.items)).toEqual({ annuaire: 'verified', google: 'declared', wikipedia: 'verified' });
  });

  it('e-mail aux administrateurs avec ce qui reste à faire', async () => {
    annuaireSite = '[]';
    wikidataSite = null;
    await sendChecklistEmail(siteA);
    const mail = sentEmails.find((sent) => sent.to === 'test@example.com');
    expect(mail?.subject).toMatch(/mairie-test\.fr : 3 démarches/);
    expect(mail?.text).toContain('https://lannuaire.service-public.gouv.fr/test/mairie');
    expect(mail?.text).toContain('https://www.wikidata.org/wiki/Q1');
  });
});

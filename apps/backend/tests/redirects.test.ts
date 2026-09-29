/**
 * Redirections depuis l'ancien site (#335) : administrateurs seulement, proposition automatique à
 * partir des adresses collées, liste validée puis enregistrée, cloisonnée par commune, transmise au
 * worker ; le plan du site d'un ancien site ne peut pas viser le réseau interne du serveur.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { isPublicAddress } from '../src/utils/public-fetch';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let admin: string;
let editor: string;
let adminB: string;
let siteA: string;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function createUser(email: string, role: 'admin' | 'editor', siteDocumentId: string) {
  const authenticated = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const site = await strapi.db.query('api::site.site').findOne({ where: { documentId: siteDocumentId } });
  const password = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: 'jardin-loire-2026' })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: email, email, password, municipality_role: role, blocked: false, active: true, confirmed: true, provider: 'local', role: authenticated.id, site: site.id },
  });
  return (await api.post('/api/auth/local').send({ identifier: email, password: 'jardin-loire-2026' })).body.jwt as string;
}

beforeAll(async () => {
  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  admin = (await api.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await api.get('/api/users/me').set(auth(admin))).body.site.documentId;
  await strapi.documents('api::page.page').create({ data: { title: 'État civil', slug: 'etat-civil', site: siteA } as any, status: 'published' } as any);
  editor = await createUser('redac@a.test', 'editor', siteA);
  const siteB = (await strapi.documents('api::site.site').create({ data: { name: 'Commune B', slug: 'commune-b-redir', contact_mail: 'b@b.test' } as any })).documentId;
  adminB = await createUser('admin@b.test', 'admin', siteB);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('redirections', () => {
  it('réservées aux administrateurs ; liste des pages proposées', async () => {
    expect((await api.get('/api/redirects').set(auth(editor))).status).toBe(403);
    const res = await api.get('/api/redirects').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.redirects).toEqual([]);
    const paths = res.body.data.destinations.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['/', '/contact', '/etat-civil', '/mentions-legales']));
  });

  it('proposition à partir des adresses collées (adresses complètes, doublons, accueil ignoré)', async () => {
    const res = await api
      .post('/api/redirects/suggest')
      .set(auth(admin))
      .send({ addresses: 'https://mairie-a.fr/services/etat-civil.html\nhttps://mairie-a.fr/horaires.php\n/horaires.php\nhttps://mairie-a.fr/\n/node/42' });
    expect(res.status).toBe(200);
    expect(res.body.data.suggestions).toEqual([
      { from: '/services/etat-civil.html', to: '/etat-civil', confidence: 'sure' },
      { from: '/horaires.php', to: '/contact', confidence: 'probable' },
      { from: '/node/42', to: null, confidence: null },
    ]);
  });

  it('plan du site sur le réseau interne : refusé', async () => {
    for (const sitemapUrl of ['http://127.0.0.1:1337/sitemap.xml', 'http://169.254.169.254/latest/meta-data', 'http://localhost/sitemap.xml', 'file:///etc/passwd']) {
      const res = await api.post('/api/redirects/suggest').set(auth(admin)).send({ sitemapUrl });
      expect(res.status, sitemapUrl).toBe(400);
    }
    expect(isPublicAddress('10.0.0.5')).toBe(false);
    expect(isPublicAddress('::ffff:192.168.1.1')).toBe(false);
    expect(isPublicAddress('93.184.216.34')).toBe(true);
  });

  it('enregistrement : validation, puis la liste remplace la précédente', async () => {
    const invalid = await api.put('/api/redirects').set(auth(admin)).send({ redirects: [{ from: '/a', to: 'https://ailleurs.fr' }, { from: '', to: '/contact' }] });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details.errors).toHaveLength(2);

    const saved = await api
      .put('/api/redirects')
      .set(auth(admin))
      .send({ redirects: [{ from: 'https://mairie-a.fr/horaires.php', to: '/contact' }, { from: '/services/etat-civil.html', to: '/etat-civil' }, { from: '/contact', to: '/contact' }] });
    expect(saved.status).toBe(200);
    // Règle vers elle-même écartée, adresses normalisées
    expect(saved.body.data.redirects).toEqual([
      { from: '/horaires.php', to: '/contact' },
      { from: '/services/etat-civil.html', to: '/etat-civil' },
    ]);
    const pending = await strapi.db.query('api::pending-change.pending-change').findMany({ where: { site: { documentId: siteA }, content_type: 'redirect' } });
    expect(pending).toHaveLength(1);

    const replaced = await api.put('/api/redirects').set(auth(admin)).send({ redirects: [{ from: '/horaires.php', to: '/contact' }] });
    expect(replaced.body.data.redirects).toEqual([{ from: '/horaires.php', to: '/contact' }]);
  });

  it('une autre commune ne voit ni ne modifie ces redirections', async () => {
    expect((await api.get('/api/redirects').set(auth(adminB))).body.data.redirects).toEqual([]);
    await api.put('/api/redirects').set(auth(adminB)).send({ redirects: [] });
    expect((await api.get('/api/redirects').set(auth(admin))).body.data.redirects).toHaveLength(1);
  });

  it('transmises au worker avec le site', async () => {
    const res = await api
      .post('/api/build-worker/jobs/job-redir/start')
      .set(auth('test-worker-secret'))
      .send({ siteDocumentId: siteA, triggeredBy: null, attempt: 0 });
    expect(res.body.site.redirects).toEqual([{ from: '/horaires.php', to: '/contact' }]);
  });
});

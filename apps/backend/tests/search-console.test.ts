/**
 * Référencement : code de vérification Google Search Console, posé par l'équipe Communeo (la commune
 * ne peut pas le modifier). La balise entière copiée depuis la Search Console est acceptée.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let admin: string;
let superAdmin: string;
let siteA: string;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const stored = async () => (await strapi.db.query('api::site.site').findOne({ where: { documentId: siteA } })).google_site_verification;

beforeAll(async () => {
  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  admin = (await api.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  superAdmin = (await api.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
  siteA = (await api.get('/api/users/me').set(auth(admin))).body.site.documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('vérification Google Search Console', () => {
  it('l’équipe colle la balise : seul le code est gardé', async () => {
    const res = await api
      .put(`/api/site-management/${siteA}`)
      .set(auth(superAdmin))
      .send({ googleSiteVerification: '<meta name="google-site-verification" content="AbC_123-xyzVerification" />' });
    expect(res.status).toBe(200);
    expect(res.body.data.googleSiteVerification).toBe('AbC_123-xyzVerification');
    expect(await stored()).toBe('AbC_123-xyzVerification');
  });

  it('code invalide refusé ; vide : retiré', async () => {
    expect((await api.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ googleSiteVerification: '"><script>' })).status).toBe(400);
    expect((await api.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ googleSiteVerification: '' })).status).toBe(200);
    expect(await stored()).toBeNull();
  });

  it('la commune ne peut pas le poser elle-même', async () => {
    await api.put(`/api/sites/${siteA}`).set(auth(admin)).send({ data: { google_site_verification: 'CodeDeLaCommune123' } });
    expect(await stored()).toBeNull();
    expect((await api.put(`/api/site-management/${siteA}`).set(auth(admin)).send({ googleSiteVerification: 'CodeDeLaCommune123' })).status).toBe(403);
  });
});

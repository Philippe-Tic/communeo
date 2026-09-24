/**
 * Jetons de preview : délivrés aux utilisateurs d'une commune, pour leur seule commune.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { verifyPreviewToken } from '@communeo/core';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let siteA: string;
let siteB: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const claimsOf = async (url: string) => verifyPreviewToken(new URL(url).searchParams.get('token'), 'test-preview-secret');

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth(admin))).body.site.documentId;
  siteB = (await strapi.documents('api::site.site').create({ data: { name: 'Autre commune', slug: 'autre-commune', contact_mail: 'mairie@autre.test', contact_phone: '0102030405', address: '1 place de la Mairie' } as any })).documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('POST /api/preview/token', () => {
  it('exige un utilisateur connecté', async () => {
    expect((await http.post('/api/preview/token').send({})).status).toBe(403);
  });

  it("délivre un jeton pour la commune de l'utilisateur, quelle que soit la requête", async () => {
    const res = await http.post('/api/preview/token').set(auth(admin)).send({ site: siteB, siteDocumentId: siteB });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^https:\/\/preview\.test\/\?token=/);
    const claims = await claimsOf(res.body.url);
    expect(claims?.site).toBe(siteA);
    expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
  });

  it("ouvre la page du brouillon demandé, seulement s'il appartient à la commune", async () => {
    const draft = await strapi.documents('api::article.article').create({ data: { title: 'Brocante de printemps', site: siteA } as any });
    const res = await http.post('/api/preview/token').set(auth(admin)).send({ type: 'article', documentId: draft.documentId });
    expect(new URL(res.body.url).pathname).toBe('/actualites/brocante-de-printemps');

    const other = await strapi.documents('api::page.page').create({ data: { title: 'Page de B', site: siteB } as any });
    expect((await http.post('/api/preview/token').set(auth(admin)).send({ type: 'page', documentId: other.documentId })).status).toBe(404);
    expect((await http.post('/api/preview/token').set(auth(admin)).send({ type: 'utilisateur', documentId: 'x' })).status).toBe(400);
  });

  it('accepte un thème disponible et le met dans le jeton', async () => {
    const res = await http.post('/api/preview/token').set(auth(admin)).send({ theme: 'institutionnel' });
    expect((await claimsOf(res.body.url))?.theme).toBe('institutionnel');
    expect((await http.post('/api/preview/token').set(auth(admin)).send({ theme: 'inconnu' })).status).toBe(400);
    // Thème du registre pas encore construit : ni prévisualisable ni choisissable
    const unbuilt = await http.post('/api/preview/token').set(auth(admin)).send({ theme: 'bourg' });
    expect(unbuilt.status).toBe(400);
    expect(unbuilt.body.error.message).toBe("Ce thème n'est pas encore disponible");
  });

  it('répond 503 sans PREVIEW_SECRET', async () => {
    const secret = process.env.PREVIEW_SECRET;
    process.env.PREVIEW_SECRET = '';
    try {
      expect((await http.post('/api/preview/token').set(auth(admin)).send({})).status).toBe(503);
    } finally {
      process.env.PREVIEW_SECRET = secret;
    }
  });
});

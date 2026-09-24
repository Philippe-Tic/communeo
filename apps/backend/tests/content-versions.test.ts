/**
 * Historique des versions (#183) : un instantané à chaque publication, avec un résumé ; lecture
 * d'une version ; brouillon gardé avant une restauration sans toucher la version en ligne ;
 * contenu publié avant l'historique ; limité aux utilisateurs de la commune.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let otherAdmin: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const text = (value: string) => ({
  __component: 'blocks.text',
  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] },
});
const versions = async (documentId: string, token = admin) =>
  http.get(`/api/content-versions/articles/${documentId}`).set(auth(token));

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  // Administrateur d'une autre commune
  const other = await strapi.documents('api::site.site').create({
    data: { name: 'Commune voisine', slug: 'commune-voisine-versions', contact_mail: 'mairie@voisine.test' } as any,
  });
  const site = await strapi.db.query('api::site.site').findOne({ where: { documentId: other.documentId } });
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const password = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: 'jardin-loire-2026' })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: 'voisin@b.test', email: 'voisin@b.test', password, municipality_role: 'admin', blocked: false, active: true, confirmed: true, provider: 'local', role: role.id, site: site.id },
  });
  otherAdmin = (await http.post('/api/auth/local').send({ identifier: 'voisin@b.test', password: 'jardin-loire-2026' })).body.jwt;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('historique', () => {
  let documentId: string;

  it('une version par publication, avec un résumé ; la dernière est en ligne', async () => {
    const created = await http.post('/api/articles?status=published').set(auth(admin)).send({ data: { title: 'Salle des fêtes', blocks: [text('Tarifs 2025')] } });
    documentId = created.body.data.documentId;
    // Un brouillon enregistré n'est pas une version
    await http.put(`/api/articles/${documentId}`).set(auth(admin)).send({ data: { title: 'Salle des fêtes (brouillon)' } });
    await http.put(`/api/articles/${documentId}?status=published`).set(auth(admin)).send({ data: { title: 'Location de la salle', blocks: [text('Tarifs 2026')] } });

    const res = await versions(documentId);
    expect(res.status).toBe(200);
    expect(res.body.data.map((version: any) => [version.kind, version.summary, version.live])).toEqual([
      ['published', 'titre modifié, modification du bloc Texte', true],
      ['published', 'première publication', false],
    ]);
    expect(res.body.data[0]).toMatchObject({ blockCount: 1, authorName: expect.any(String) });
    expect(res.body.meta.createdAt).toBeTruthy();
  });

  it('lecture d’une version : l’instantané publié, blocs compris', async () => {
    const list = (await versions(documentId)).body.data;
    const first = await http.get(`/api/content-versions/articles/${documentId}/${list[1].id}`).set(auth(admin));
    expect(first.body.data.snapshot).toMatchObject({ title: 'Salle des fêtes', blocks: [{ __component: 'blocks.text' }] });
    expect(first.body.data.snapshot.documentId).toBeUndefined();
  });

  it('avant une restauration : le brouillon est gardé, la version en ligne reste la même', async () => {
    await http.put(`/api/articles/${documentId}`).set(auth(admin)).send({ data: { title: 'Brouillon en cours' } });
    expect((await http.post(`/api/content-versions/articles/${documentId}/checkpoint`).set(auth(admin))).status).toBe(204);
    const list = (await versions(documentId)).body.data;
    expect(list[0]).toMatchObject({ kind: 'draft', summary: 'brouillon gardé avant une restauration', live: false });
    const kept = await http.get(`/api/content-versions/articles/${documentId}/${list[0].id}`).set(auth(admin));
    expect(kept.body.data.snapshot.title).toBe('Brouillon en cours');
    const online = await http.get(`/api/articles/${documentId}?status=published`).set(auth(admin));
    expect(online.body.data.title).toBe('Location de la salle');
  });

  it('contenu publié avant l’historique : sa version en ligne apparaît', async () => {
    const created = await http.post('/api/articles?status=published').set(auth(admin)).send({ data: { title: 'Ancienne actualité' } });
    const id = created.body.data.documentId;
    await strapi.db.query('api::content-version.content-version').deleteMany({ where: { content_document_id: id } });
    const list = (await versions(id)).body.data;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: 'published', summary: 'première version connue', live: true });
  });

  it('réservé à la commune du contenu', async () => {
    expect((await versions(documentId, otherAdmin)).status).toBe(404);
    expect((await http.post(`/api/content-versions/articles/${documentId}/checkpoint`).set(auth(otherAdmin))).status).toBe(404);
    expect((await http.get(`/api/content-versions/articles/${documentId}`)).status).toBeGreaterThanOrEqual(401);
    expect((await http.get(`/api/content-versions/inconnu/${documentId}`).set(auth(admin))).status).toBe(404);
  });
});

/**
 * Date de publication des articles : identique en preview (brouillon) et sur le site publié.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let siteId: string;

const versions = async (documentId: string) => {
  const rows = await strapi.db.query('api::article.article').findMany({ where: { documentId } });
  const draft = rows.find((row: any) => !row.publishedAt);
  const published = rows.find((row: any) => row.publishedAt);
  return { draft, published };
};
const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : value);

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteId = (await http.get('/api/users/me').set({ Authorization: `Bearer ${admin}` })).body.site.documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('date de publication des articles', () => {
  it('est remplie à la première publication, sur le brouillon comme sur la version publiée', async () => {
    const article = await strapi.documents('api::article.article').create({ data: { title: 'Brocante', site: siteId } as any });
    expect((await versions(article.documentId)).draft.publication_date).toBeFalsy();

    await strapi.documents('api::article.article').publish({ documentId: article.documentId });
    const { draft, published } = await versions(article.documentId);
    expect(published.publication_date).toBeTruthy();
    expect(iso(draft.publication_date)).toBe(iso(published.publication_date));

    // Republier ne change pas la date
    const first = iso(published.publication_date);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await strapi.documents('api::article.article').update({ documentId: article.documentId, data: { title: 'Brocante (modifiée)' } as any });
    await strapi.documents('api::article.article').publish({ documentId: article.documentId });
    expect(iso((await versions(article.documentId)).published.publication_date)).toBe(first);
  });

  it("est remplie par l'API REST avec ?status=published, sans écraser une date choisie", async () => {
    const auth = { Authorization: `Bearer ${admin}` };
    const created = await http.post('/api/articles?status=published').set(auth).send({ data: { title: 'Kermesse' } });
    expect(created.status).toBeLessThan(300);
    const { draft, published } = await versions(created.body.data.documentId);
    expect(published?.publication_date).toBeTruthy();
    expect(iso(draft.publication_date)).toBe(iso(published.publication_date));

    const chosen = '2026-05-01T08:00:00.000Z';
    const other = await http.post('/api/articles?status=published').set(auth).send({ data: { title: 'Fête', publication_date: chosen } });
    expect(iso((await versions(other.body.data.documentId)).published.publication_date)).toBe(chosen);
  });
});

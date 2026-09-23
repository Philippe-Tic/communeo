/**
 * Publication des contenus pour les listes de l'admin (#134) : état (brouillon, publié, modifié)
 * et dépublication, limités à la commune de l'utilisateur.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let jwt: string;

const auth = () => ({ Authorization: `Bearer ${jwt}` });
const states = async (type = 'pages') => (await http.get(`/api/publication/${type}`).set(auth())).body.data as Record<string, { state: string; scheduledAt: string | null }>;
const status = async (type = 'pages') => Object.fromEntries(Object.entries(await states(type)).map(([id, entry]) => [id, entry.state]));

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  jwt = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('GET /api/publication/:type', () => {
  it('brouillon, puis publié, puis modifié après publication', async () => {
    const created = await http.post('/api/pages').set(auth()).send({ data: { title: 'Horaires de la mairie' } });
    expect(created.status).toBe(201);
    const id = created.body.data.documentId;
    expect((await status())[id]).toBe('draft');

    await http.put(`/api/pages/${id}?status=published`).set(auth()).send({ data: { title: 'Horaires de la mairie' } });
    expect((await status())[id]).toBe('published');

    await new Promise((resolve) => setTimeout(resolve, 20));
    await http.put(`/api/pages/${id}`).set(auth()).send({ data: { title: 'Horaires d’été de la mairie' } });
    expect((await status())[id]).toBe('modified');

    await http.put(`/api/pages/${id}?status=published`).set(auth()).send({ data: { title: 'Horaires d’été de la mairie' } });
    expect((await status())[id]).toBe('published');
  });

  it('donne la date de publication programmée', async () => {
    const at = '2026-11-03T07:00:00.000Z';
    const id = (await http.post('/api/pages').set(auth()).send({ data: { title: 'Inscriptions scolaires', scheduled_at: at } })).body.data.documentId;
    expect((await states())[id]).toEqual({ state: 'draft', scheduledAt: at });
  });

  it('ignore les contenus des autres communes', async () => {
    const other = await strapi.documents('api::site.site').create({ data: { name: 'Autre commune', slug: 'autre-commune', contact_mail: 'autre@example.test' } as any });
    const foreign = await strapi.documents('api::article.article').create({ data: { title: 'Article d’ailleurs', slug: 'ailleurs', site: other.documentId } as any });
    expect(await status('articles')).not.toHaveProperty(foreign.documentId);
  });

  it('dépublier garde le brouillon et ne touche pas aux autres communes', async () => {
    const id = (await http.post('/api/pages?status=published').set(auth()).send({ data: { title: 'Fête de l’été' } })).body.data.documentId;
    const res = await http.post(`/api/publication/pages/${id}/unpublish`).set(auth());
    expect(res.status).toBe(200);
    expect((await http.get(`/api/pages/${id}?status=published`).set(auth())).status).toBe(404);
    expect((await http.get(`/api/pages/${id}?status=draft`).set(auth())).body.data.title).toBe('Fête de l’été');
    expect((await status())[id]).toBe('draft');

    const other = await strapi.documents('api::site.site').create({ data: { name: 'Commune voisine', slug: 'commune-voisine', contact_mail: 'v@example.test' } as any });
    const foreign = await strapi.documents('api::page.page').create({ data: { title: 'Page voisine', slug: 'page-voisine', site: other.documentId } as any, status: 'published' });
    expect((await http.post(`/api/publication/pages/${foreign.documentId}/unpublish`).set(auth())).status).toBe(404);
    expect(await strapi.documents('api::page.page').findOne({ documentId: foreign.documentId, status: 'published' })).not.toBeNull();
  });

  it('refuse un type inconnu, et sans session', async () => {
    expect((await http.get('/api/publication/sites').set(auth())).status).toBe(404);
    expect((await http.get('/api/publication/pages')).status).toBe(403);
  });
});

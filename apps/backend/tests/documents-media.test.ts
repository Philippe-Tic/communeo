/**
 * Documents officiels et fichiers (#139) : comptes par année pour les onglets de la liste,
 * envoi de fichiers dans la médiathèque de la commune (formats, poids, commune consultée).
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let superAdmin: string;
let siteA: string;

const auth = (jwt: string) => ({ Authorization: `Bearer ${jwt}` });
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');

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

describe('GET /api/publication/official-documents/years', () => {
  it('compte les documents de la commune par année, du plus récent au plus ancien', async () => {
    const other = await strapi.documents('api::site.site').create({ data: { name: 'Commune voisine', slug: 'voisine-docs', contact_mail: 'v@example.test' } as any });
    const create = (site: string, year: number, status?: 'published') =>
      strapi.documents('api::official-document.official-document').create({
        data: { title: `Délibération ${year}`, slug: `deliberation-${year}-${Math.random().toString(36).slice(2, 7)}`, document_type: 'deliberation', document_date: `${year}-03-01`, year, site } as any,
        ...(status ? { status } : {}),
      });
    await create(siteA, 2026, 'published');
    await create(siteA, 2026);
    await create(siteA, 2024);
    await create(other.documentId, 2025);

    const res = await http.get('/api/publication/official-documents/years').set(auth(admin));
    expect(res.status).toBe(200);
    // Un document publié compte une fois (brouillon + version en ligne = un document)
    expect(res.body.data).toEqual([
      { year: 2026, count: 2 },
      { year: 2024, count: 1 },
    ]);
    expect((await http.get('/api/publication/pages/years').set(auth(admin))).status).toBe(404);
  });
});

describe('POST /api/media-items/upload', () => {
  it('range un PDF dans la médiathèque de la commune', async () => {
    const res = await http.post('/api/media-items/upload').set(auth(admin)).attach('files', PDF, { filename: 'deliberation.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.data.file).toMatchObject({ ext: '.pdf', mime: 'application/pdf' });
    expect(res.body.data.site.documentId).toBe(siteA);
  });

  it('refuse les formats hors liste et les fichiers de plus de 20 Mo', async () => {
    const html = await http.post('/api/media-items/upload').set(auth(admin)).attach('files', Buffer.from('<script>alert(1)</script>'), { filename: 'page.html', contentType: 'text/html' });
    expect(html.status).toBe(400);
    expect(html.body.error.message).toContain('Format non accepté');
    const heavy = await http.post('/api/media-items/upload').set(auth(admin)).attach('files', Buffer.alloc(21 * 1024 * 1024), { filename: 'lourd.pdf', contentType: 'application/pdf' });
    expect(heavy.status).toBe(400);
    expect(heavy.body.error.message).toContain('20 Mo');
  });

  it('super admin : le fichier va dans la commune consultée', async () => {
    const res = await http.post('/api/media-items/upload').set({ ...auth(superAdmin), 'X-Site-Document-Id': siteA }).attach('files', PDF, { filename: 'arrete.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.data.site.documentId).toBe(siteA);
  });
});

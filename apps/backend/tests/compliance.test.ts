/**
 * Conformité (#147) : GET /api/compliance calcule les 18 points à partir des réglages, des documents
 * publiés (pas des brouillons), des images sans texte alternatif et des demandes RGPD en retard de la
 * commune — jamais de celles d'une autre commune.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let jwt: string;
let siteId: number;
let siteDocumentId: string;
let otherSiteId: number;

const auth = () => ({ Authorization: `Bearer ${jwt}` });
const report = async () => (await http.get('/api/compliance').set(auth())).body.data;
const point = (data: any, id: string) => data.points.find((entry: any) => entry.id === id);

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  jwt = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteDocumentId = (await http.get('/api/users/me').set(auth())).body.site.documentId;
  siteId = (await strapi.db.query('api::site.site').findOne({ where: { documentId: siteDocumentId } })).id;
  const other = await strapi.documents('api::site.site').create({ data: { name: 'Autre commune', slug: 'autre-commune-conformite', contact_mail: 'mairie@autre.test' } as any });
  otherSiteId = (await strapi.db.query('api::site.site').findOne({ where: { documentId: other.documentId } })).id;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('GET /api/compliance', () => {
  it('refusé sans session', async () => {
    expect((await http.get('/api/compliance')).status).toBeGreaterThanOrEqual(401);
  });

  it('18 points ; les réglages de la commune comptent', async () => {
    let data = await report();
    expect(data.total).toBe(18);
    expect(data.categories).toHaveLength(5);
    const before = point(data, 'mentions-directeur').done;
    await strapi.documents('api::site.site').update({
      documentId: siteDocumentId,
      data: {
        address: '1 place de la Mairie, 58300 Saint-Aubin-sur-Loire',
        mentions_legales: { siret: '21580001200017', publication_director: 'Jean Moreau' },
      } as any,
    });
    data = await report();
    expect(point(data, 'mentions-directeur').done).toBe(true);
    expect(point(data, 'mentions-editeur').done).toBe(true);
    if (!before) expect(data.done).toBeGreaterThan(0);
  });

  it('documents : seuls les publiés de la commune comptent', async () => {
    const year = new Date().getFullYear();
    // Un fichier de la médiathèque de chaque commune (un document ne peut pas prendre celui d'une autre)
    const files = new Map<number, number>();
    for (const site of [siteId, otherSiteId]) {
      const file = await strapi.db.query('plugin::upload.file').create({
        data: { name: `deliberation-${site}.pdf`, hash: `deliberation_${site}`, ext: '.pdf', mime: 'application/pdf', size: 1, url: `/uploads/deliberation-${site}.pdf`, provider: 'local' },
      });
      await strapi.db.query('api::media-item.media-item').create({ data: { file: file.id, site } });
      files.set(site, file.id);
    }
    const fields = (title: string, slug: string, site: number) =>
      ({ title, slug, document_type: 'deliberation', year, document_date: `${year}-01-15`, file: files.get(site), site }) as any;
    await strapi.documents('api::official-document.official-document').create({
      data: fields('Délibération brouillon', 'deliberation-brouillon', siteId),
    });
    await strapi.documents('api::official-document.official-document').create({
      data: fields('Délibération ailleurs', 'deliberation-ailleurs', otherSiteId),
      status: 'published',
    });
    expect(point(await report(), 'actes-deliberations').done).toBe(false);
    await strapi.documents('api::official-document.official-document').create({
      data: fields('Délibération publiée', 'deliberation-publiee', siteId),
      status: 'published',
    });
    expect(point(await report(), 'actes-deliberations').done).toBe(true);
  });

  it('demande RGPD sans réponse après un mois : prochaine action ; celles d’une autre commune ignorées', async () => {
    const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const other = await strapi.db.query('api::contact-submission.contact-submission').create({
      data: { first_name: 'A', last_name: 'B', email: 'a@b.fr', subject: 'x', message: 'x', category: 'rgpd', status: 'received', site: otherSiteId, createdAt: old },
    });
    expect(point(await report(), 'rgpd-delai').done).toBe(true);
    await strapi.db.query('api::contact-submission.contact-submission').create({
      data: { first_name: 'A', last_name: 'B', email: 'a@b.fr', subject: 'x', message: 'x', category: 'rgpd', status: 'received', site: siteId, createdAt: old },
    });
    const data = await report();
    expect(point(data, 'rgpd-delai')).toMatchObject({ done: false, label: '1 demande RGPD sans réponse après un mois' });
    expect(data.next.id).toBe('rgpd-delai');
    expect(other.id).toBeDefined();
  });
});

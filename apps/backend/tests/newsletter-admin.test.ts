/**
 * Newsletter côté admin (#140) : jamais de suppression ni de modification, désabonnement tracé,
 * export CSV de la seule commune, jeton de désinscription jamais renvoyé.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

const UID = 'api::newsletter-subscriber.newsletter-subscriber';
let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let jwt: string;
let siteA: string;
let siteB: string;

const auth = () => ({ Authorization: `Bearer ${jwt}` });

async function subscriber(email: string, site = siteA, extra: Record<string, unknown> = {}) {
  const created = await strapi.documents(UID).create({
    data: { email, subscribed_at: '2026-09-20T08:00:00.000Z', active: true, unsubscribe_token: `jeton-${email}`, site, ...extra } as any,
  });
  return created.documentId;
}

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  jwt = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth())).body.site.documentId;
  siteB = (await strapi.documents('api::site.site').create({ data: { name: 'Commune B', slug: 'commune-b-newsletter', contact_mail: 'b@example.test' } as any })).documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('abonnés', () => {
  it('liste sans jeton de désinscription ; ni suppression ni modification', async () => {
    const id = await subscriber('lecteur@example.test');
    const list = await http.get('/api/newsletter-subscribers').set(auth());
    expect(list.status).toBe(200);
    const row = list.body.data.find((item: any) => item.documentId === id);
    expect(row).toMatchObject({ email: 'lecteur@example.test', active: true });
    expect(row).not.toHaveProperty('unsubscribe_token');

    expect((await http.delete(`/api/newsletter-subscribers/${id}`).set(auth())).status).toBe(403);
    expect((await http.put(`/api/newsletter-subscribers/${id}`).set(auth()).send({ data: { email: 'autre@example.test' } })).status).toBe(403);
    expect((await strapi.documents(UID).findOne({ documentId: id }))!.email).toBe('lecteur@example.test');
  });

  it('désabonner : reste dans la liste, daté, une seule fois', async () => {
    const id = await subscriber('partant@example.test');
    const res = await http.post(`/api/newsletter-subscribers/${id}/unsubscribe`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ active: false });
    expect(res.body.data.unsubscribed_at).toBeTruthy();
    expect(res.body.data).not.toHaveProperty('unsubscribe_token');
    // L'ancien lien de désinscription ne sert plus
    const stored = (await strapi.documents(UID).findOne({ documentId: id })) as any;
    expect(stored.unsubscribe_token).not.toBe('jeton-partant@example.test');
    expect((await http.post(`/api/newsletter-subscribers/${id}/unsubscribe`).set(auth())).status).toBe(400);
  });
});

describe('export CSV', () => {
  it('les abonnés de la commune seulement, formules neutralisées', async () => {
    await subscriber('formule@example.test', siteA, { first_name: '=HYPERLINK("http://pirate")', last_name: '@SUM(A1) "Jo"' });
    await subscriber('voisin@example.test', siteB);
    const res = await http.get('/api/newsletter-subscribers/export').set(auth());
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="abonnes-newsletter-\d{4}-\d{2}-\d{2}\.csv"/);
    const csv = res.text;
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"E-mail";"Prénom";"Nom";"Inscrit le";"État";"Désabonné le"');
    expect(csv).toContain(`"formule@example.test";"'=HYPERLINK(""http://pirate"")";"'@SUM(A1) ""Jo""";"20/09/2026";"Actif";""`);
    expect(csv).toContain('"partant@example.test"');
    expect(csv).toContain('"Désabonné"');
    expect(csv).not.toContain('voisin@example.test');
    expect(csv).not.toContain('jeton-');
  });

  it('sans session : refusé', async () => {
    expect([401, 403]).toContain((await http.get('/api/newsletter-subscribers/export')).status);
  });
});

describe('isolation', () => {
  it("ni lire ni désabonner l'abonné d'une autre commune", async () => {
    const foreign = await subscriber('b-lecteur@example.test', siteB);
    expect([403, 404]).toContain((await http.get(`/api/newsletter-subscribers/${foreign}`).set(auth())).status);
    expect([403, 404]).toContain((await http.post(`/api/newsletter-subscribers/${foreign}/unsubscribe`).set(auth())).status);
    expect((await strapi.documents(UID).findOne({ documentId: foreign }))!.active).toBe(true);
    const list = await http.get('/api/newsletter-subscribers?pagination[pageSize]=100').set(auth());
    expect(list.body.data.map((item: any) => item.email)).not.toContain('b-lecteur@example.test');
  });
});

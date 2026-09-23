/**
 * Modération des propositions d'association (#187) : publication, refus motivé envoyé au demandeur,
 * limitée à la commune de l'utilisateur.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let jwt: string;
let siteA: string;

const auth = () => ({ Authorization: `Bearer ${jwt}` });

let viaForm = false;
/** Proposition d'un habitant : la première par le formulaire public (limité à 3 par heure), les autres directement */
async function propose(name: string, site = siteA) {
  const data = { name, category: 'environnement', submitted_by_name: 'Hélène Garnier', submitted_by_email: 'h.garnier@example.test', site };
  if (!viaForm) {
    viaForm = true;
    expect((await http.post('/api/associations/public').send({ data })).status).toBe(201);
    return (await strapi.documents('api::association.association').findFirst({ filters: { name } as any }))!.documentId;
  }
  const created = await strapi.documents('api::association.association').create({ data: { ...data, status: 'pending', submission_source: 'public_form' } as any });
  return created.documentId;
}

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  jwt = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth())).body.site.documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('refus motivé', () => {
  it('motif obligatoire, envoyé au demandeur (échappé), proposition refusée', async () => {
    const id = await propose('Les Jardins partagés de la Loire');
    expect((await http.post(`/api/associations/${id}/reject`).set(auth()).send({ reason: '  ' })).status).toBe(400);

    sentEmails.length = 0;
    const reason = 'Il manque le numéro RNA <script>alert(1)</script>.';
    const res = await http.post(`/api/associations/${id}/reject`).set(auth()).send({ reason });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ data: { status: 'rejected', rejection_reason: reason }, emailed: true });
    const mail = sentEmails.find((message) => message.to === 'h.garnier@example.test')!;
    expect(mail.subject).toContain('Les Jardins partagés de la Loire');
    expect(mail.text).toContain(reason);
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).not.toContain('<script>');

    // Déjà refusée : pas de second refus
    expect((await http.post(`/api/associations/${id}/reject`).set(auth()).send({ reason: 'Encore' })).status).toBe(400);
  });
});

describe('publication', () => {
  it('publie une proposition (y compris refusée puis réexaminée)', async () => {
    const id = await propose('Club de pétanque');
    const res = await http.post(`/api/associations/${id}/publish`).set(auth());
    expect(res.body.data).toMatchObject({ status: 'published', rejection_reason: null });
    expect(res.body.data.reviewed_at).toBeTruthy();
    expect((await http.post(`/api/associations/${id}/publish`).set(auth())).status).toBe(400);
  });
});

describe('isolation', () => {
  it("ni l'association d'une autre commune, ni une autre action, ni sans session", async () => {
    const other = await strapi.documents('api::site.site').create({ data: { name: 'Commune voisine', slug: 'voisine-assoc', contact_mail: 'v@example.test' } as any });
    const foreign = await propose('Association voisine', other.documentId);
    expect([403, 404]).toContain((await http.post(`/api/associations/${foreign}/publish`).set(auth())).status);
    expect([403, 404]).toContain((await http.post(`/api/associations/${foreign}/reject`).set(auth()).send({ reason: 'x' })).status);
    expect((await strapi.documents('api::association.association').findOne({ documentId: foreign }))!.status).toBe('pending');

    const own = await propose('Chorale');
    expect((await http.post(`/api/associations/${own}/archive`).set(auth())).status).toBe(403);
    expect((await http.post(`/api/associations/${own}/publish`)).status).toBe(403);
  });
});

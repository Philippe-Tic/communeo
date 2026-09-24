/**
 * Formulaires publics des sites (contact, newsletter, associations), envoi de fichiers
 * et gestion des communes par le super admin.
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

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// PNG 1×1 valide
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

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

describe('formulaire de contact (public)', () => {
  it('enregistre la demande avec un numéro de référence, visible par la commune', async () => {
    const res = await http.post('/api/contact-submissions/public').send({
      data: {
        first_name: 'Paul',
        last_name: 'Habitant',
        email: 'paul@example.test',
        subject: 'Salle des fêtes',
        message: 'Bonjour, la salle est-elle libre ?',
        category: 'general',
        site: siteA,
      },
    });
    expect(res.status).toBeLessThan(300);
    const list = await http.get('/api/contact-submissions').set(auth(admin));
    const submission = list.body.data.find((s: any) => s.email === 'paul@example.test');
    expect(submission?.reference_number).toMatch(/^SVE-\d{4}-\d+$/);
  });

  it('refuse une commune inconnue et une catégorie invalide', async () => {
    const base = { first_name: 'A', last_name: 'B', email: 'a@example.test', subject: 's', message: 'm' };
    expect((await http.post('/api/contact-submissions/public').send({ data: { ...base, category: 'general', site: 'inconnu' } })).status).toBe(400);
    expect((await http.post('/api/contact-submissions/public').send({ data: { ...base, category: 'pirate', site: siteA } })).status).toBe(400);
  });
});

describe('newsletter (public)', () => {
  it('inscrit, refuse le doublon, désinscrit par jeton et compte les abonnés', async () => {
    const subscribe = () => http.post('/api/newsletter-subscribers/public').send({ data: { email: 'Lecteur@Example.test', site: siteA } });
    expect((await subscribe()).status).toBe(201);
    expect((await subscribe()).status).toBe(409);

    let stats = (await http.get('/api/newsletter-subscribers/stats').set(auth(admin))).body.data;
    expect(stats).toMatchObject({ total: 1, active: 1, thisMonth: 1 });

    const subscriber = await strapi.db
      .query('api::newsletter-subscriber.newsletter-subscriber')
      .findOne({ where: { email: 'lecteur@example.test' } });
    const unsubscribe = await http.get(`/api/newsletter-subscribers/unsubscribe?token=${subscriber.unsubscribe_token}`);
    expect(unsubscribe.status).toBe(200);

    stats = (await http.get('/api/newsletter-subscribers/stats').set(auth(admin))).body.data;
    expect(stats).toMatchObject({ total: 1, active: 0 });

    // Réinscription : le même abonné est réactivé
    expect((await subscribe()).status).toBe(201);
    stats = (await http.get('/api/newsletter-subscribers/stats').set(auth(admin))).body.data;
    expect(stats).toMatchObject({ total: 1, active: 1 });
  });
});

describe('proposition d’association (public)', () => {
  it('crée une proposition en attente, visible par la commune', async () => {
    const res = await http.post('/api/associations/public').send({
      data: {
        name: 'Club de pétanque',
        category: 'sport',
        description: 'Boulodrome du bourg',
        submitted_by_name: 'Hélène Garnier',
        submitted_by_email: 'helene@example.test',
        site: siteA,
      },
    });
    expect(res.status).toBeLessThan(300);
    const list = await http.get('/api/associations?status=draft').set(auth(admin));
    const created = list.body.data.find((a: any) => a.name === 'Club de pétanque');
    expect(created).toBeTruthy();
    expect(created.status).toBe('pending');
  });
});

describe('médiathèque', () => {
  it('envoie un fichier rattaché à la commune', async () => {
    const res = await http.post('/api/media-items/upload').set(auth(admin)).attach('files', PNG, 'carre.png');
    expect(res.status).toBeLessThan(300);
    const items = await strapi.db.query('api::media-item.media-item').findMany({ populate: ['site', 'file'] });
    expect(items.some((item: any) => item.site?.documentId === siteA && item.file?.name === 'carre.png')).toBe(true);
  });
});

describe('gestion des communes (super admin)', () => {
  it('crée, consulte, modifie et supprime une commune', async () => {
    const created = await http
      .post('/api/site-management')
      .set(auth(superAdmin))
      .send({ data: { name: 'Commune Nouvelle', slug: 'commune-nouvelle', admin_email: 'Maire@Commune-Nouvelle.test', admin_first_name: 'Claire', admin_last_name: 'Martin' } });
    expect(created.status).toBe(200);
    const documentId = created.body.data.documentId;
    expect(created.body.data.theme).toBe('institutionnel');

    const found = await http.get(`/api/site-management/${documentId}`).set(auth(superAdmin));
    expect(found.status).toBe(200);
    expect(found.body.data.users).toEqual([expect.objectContaining({ email: 'maire@commune-nouvelle.test', first_name: 'Claire', municipality_role: 'admin', blocked: true })]);
    expect(found.body.data).toMatchObject({ users: expect.any(Array), counts: { pages: 0, articles: 0, documents: 0 }, publication: { state: 'new' } });
    // L'adresse est prise, un e-mail existant aussi
    expect((await http.get('/api/site-management/slug-available?slug=commune-nouvelle').set(auth(superAdmin))).body).toEqual({ available: false, reason: 'Adresse déjà utilisée' });
    expect((await http.get('/api/site-management/slug-available?slug=Mauvais Slug').set(auth(superAdmin))).body.available).toBe(false);
    expect((await http.get('/api/site-management/slug-available?slug=nouvelle-commune').set(auth(superAdmin))).body).toEqual({ available: true });

    const updated = await http.put(`/api/site-management/${documentId}`).set(auth(superAdmin)).send({ data: { name: 'Commune Renommée' } });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Commune Renommée');

    expect((await http.delete(`/api/site-management/${documentId}`).set(auth(superAdmin))).status).toBeLessThan(300);
    expect((await http.get(`/api/site-management/${documentId}`).set(auth(superAdmin))).status).toBe(404);
  });

  it('suspendre : utilisateurs refusés et coupés, mise en ligne refusée ; réactiver rend l’accès', async () => {
    // L'admin de la commune A est connecté ; l'équipe suspend sa commune
    expect((await http.get('/api/users/me').set(auth(admin))).status).toBe(200);
    const pendingBefore = await strapi.query('api::pending-change.pending-change').count({ where: { site: { documentId: siteA } } });
    expect((await http.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ data: { suspended: true } })).body.data.suspended).toBe(true);
    // Suspendre ne change rien au site public : aucune modification en attente
    expect(await strapi.query('api::pending-change.pending-change').count({ where: { site: { documentId: siteA } } })).toBe(pendingBefore);
    expect((await http.get('/api/users/me').set(auth(admin))).status).toBe(401);
    const login = await http.post('/api/session/login').send({ identifier: 'test@example.com', password: 'test123' });
    expect(login.status).toBe(403);
    expect(login.body.error.message).toBe("Cette commune est suspendue : contactez l'équipe Communeo.");
    // Une commune ne peut pas se lever elle-même la suspension
    await http.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ data: { suspended: false } });
    expect((await http.get('/api/users/me').set(auth(admin))).status).toBe(200);
    await http.put(`/api/sites/${siteA}`).set(auth(admin)).send({ data: { suspended: true } });
    expect((await http.get('/api/users/me').set(auth(admin))).status).toBe(200);
  });

  it('statistiques : communes, utilisateurs actifs, mises en ligne des 30 jours, thèmes', async () => {
    const now = Date.now();
    const created = await Promise.all(
      [
        ['ready', 20, 1],
        ['ready', 40, 2],
        ['ready', 30, 3],
        ['error', 5, 4],
        ['ready', 999, 45], // hors des 30 derniers jours
      ].map(([status, build_time, daysAgo]) =>
        strapi.documents('api::deployment.deployment').create({
          data: { site: siteA, status, build_time, triggered_at: new Date(now - (daysAgo as number) * 86_400_000).toISOString() } as any,
        }),
      ),
    );
    const { data } = (await http.get('/api/site-management/stats').set(auth(superAdmin))).body;
    const sites = await strapi.query('api::site.site').count();
    expect(data.communes.total).toBe(sites);
    expect(data.deployments).toEqual({ total: 4, succeeded: 3, medianSeconds: 30 });
    expect(data.themes.reduce((sum, { count }) => sum + count, 0)).toBe(sites);
    // Le super admin n'est pas compté
    expect(data.activeUsers).toBe(
      await strapi.query('plugin::users-permissions.user').count({ where: { blocked: false, municipality_role: { $ne: 'super_admin' } } }),
    );
    await Promise.all(created.map(({ documentId }) => strapi.documents('api::deployment.deployment').delete({ documentId })));
  });

  it("est interdite à un admin de commune", async () => {
    expect((await http.get('/api/site-management').set(auth(admin))).status).toBe(403);
    expect((await http.get('/api/site-management/stats').set(auth(admin))).status).toBe(403);
  });
});

describe('publication sans hébergeur configuré', () => {
  it('répond 503 au lieu de faire planter Strapi', async () => {
    expect((await http.post('/api/deployment/trigger').set(auth(admin))).status).toBe(503);
    const domain = await http.post('/api/domain/configure').set(auth(admin)).send({ customDomain: 'mairie-exemple.fr' });
    expect(domain.status).toBe(503);
    expect(domain.body.error.message).toMatch(/NETLIFY_TOKEN/);
  });
});

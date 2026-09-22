/**
 * Isolation multi-tenant et règles d'accès, contre une vraie instance Strapi.
 * Si un de ces tests échoue, un utilisateur peut probablement lire ou modifier les données d'une autre commune.
 *
 * Nouveau content-type rattaché à un site : l'ajouter à SITE_SCOPED_TYPES ci-dessous.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;

// Jetons et identifiants partagés par les tests
let adminA: string; // admin de la commune A (test-site)
let superAdmin: string;
let siteA: string;
let siteB: string;
let articleB: string;
let submissionB: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

async function login(identifier: string, password: string) {
  const res = await http.post('/api/auth/local').send({ identifier, password });
  expect(res.status, `connexion de ${identifier}`).toBe(200);
  return res.body.jwt as string;
}

// Content-types rattachés à un site, avec des données minimales valides pour la commune B
const SITE_SCOPED_TYPES: Record<string, { uid: string; data: Record<string, unknown> }> = {
  pages: { uid: 'api::page.page', data: { title: 'Page B', slug: 'page-b' } },
  articles: { uid: 'api::article.article', data: { title: 'Article secret B', slug: 'article-b' } },
  evenements: {
    uid: 'api::evenement.evenement',
    data: { title: 'Événement B', slug: 'evenement-b', start_date: '2026-10-01T10:00:00.000Z' },
  },
  'team-members': { uid: 'api::team-member.team-member', data: { first_name: 'Jean', last_name: 'B', role: 'conseiller' } },
  alertes: { uid: 'api::alerte.alerte', data: { title: 'Alerte B', message: 'secret B', severity: 'info', active: true } },
  'newsletter-subscribers': {
    uid: 'api::newsletter-subscriber.newsletter-subscriber',
    data: { email: 'abonne-b@example.test', subscribed_at: '2026-09-01T00:00:00.000Z', active: true, unsubscribe_token: 'jeton-b' },
  },
};

beforeAll(async () => {
  try {
    await prepare();
  } catch (error) {
    // Sinon l'arrêt de Strapi masque l'erreur de préparation
    console.error('Préparation des tests impossible :', error);
    throw error;
  }
});

async function prepare() {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);

  adminA = await login('test@example.com', 'test123');
  superAdmin = await login('super@example.com', 'super123');
  siteA = (await http.get('/api/users/me').set(auth(adminA))).body.site.documentId;

  const siteBDoc = await strapi.documents('api::site.site').create({
    data: { name: 'Commune B', slug: 'commune-b', contact_mail: 'b@example.test', theme: 'moderne' },
  });
  siteB = siteBDoc.documentId;

  for (const { uid, data } of Object.values(SITE_SCOPED_TYPES)) {
    const created = await strapi.documents(uid as any).create({ data: { ...data, site: siteB } as any });
    if (uid === 'api::article.article') articleB = created.documentId;
  }
  submissionB = (
    await strapi.documents('api::contact-submission.contact-submission').create({
      data: {
        first_name: 'Jeanne',
        last_name: 'Citoyenne',
        email: 'jeanne@example.test',
        subject: 'Demande',
        message: 'donnée personnelle B',
        category: 'rgpd',
        status: 'received',
        reference_number: 'SVE-TEST-0001',
        site: siteB,
      } as any,
    })
  ).documentId;
}

afterAll(async () => {
  await teardownStrapi();
});

describe('inscription et comptes', () => {
  it("l'inscription publique est fermée", async () => {
    const res = await http
      .post('/api/auth/local/register')
      .send({ username: 'intrus', email: 'intrus@example.test', password: 'motdepasse123' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/disabled/i);
  });

  it('un admin de commune ne peut pas créer de super_admin', async () => {
    const res = await http
      .post('/api/user-management')
      .set(auth(adminA))
      .send({ data: { username: 'x1', email: 'x1@example.test', first_name: 'X', last_name: 'Y', municipality_role: 'super_admin' } });
    expect(res.status).toBe(403);
  });

  it('un admin de commune ne peut pas se promouvoir super_admin', async () => {
    const me = (await http.get('/api/users/me').set(auth(adminA))).body;
    const custom = await http.put(`/api/user-management/${me.id}`).set(auth(adminA)).send({ data: { municipality_role: 'super_admin' } });
    expect(custom.status).toBe(403);
    const native = await http.put(`/api/users/${me.id}`).set(auth(adminA)).send({ municipality_role: 'super_admin' });
    expect(native.status).toBe(403);
  });

  it('les routes natives /api/users sont fermées', async () => {
    expect((await http.get('/api/users').set(auth(adminA))).status).toBe(403);
  });

  it("/api/users/me n'expose pas les champs privés du site", async () => {
    const res = await http.get('/api/users/me').set(auth(adminA));
    expect(res.status).toBe(200);
    expect(res.body.site).not.toHaveProperty('netlify_site_id');
    expect(res.body.site).not.toHaveProperty('domain_verification_token');
  });

  it("refuse un jeton d'invitation invalide", async () => {
    const res = await http
      .post('/api/user-management/accept-invitation')
      .send({ token: 'abc', password: 'longpassword1', passwordConfirmation: 'longpassword1' });
    expect(res.status).toBe(400);
  });
});

describe('/api/sites', () => {
  it('ne liste que son propre site', async () => {
    const res = await http.get('/api/sites').set(auth(adminA));
    expect(res.status).toBe(200);
    expect(res.body.data.map((s: any) => s.documentId)).toEqual([siteA]);
  });

  it("ne donne pas accès au site d'une autre commune", async () => {
    expect((await http.get(`/api/sites/${siteB}`).set(auth(adminA))).status).toBe(404);
    expect((await http.put(`/api/sites/${siteB}`).set(auth(adminA)).send({ data: { name: 'pirate' } })).status).toBe(404);
  });

  it('interdit de créer ou supprimer un site', async () => {
    const created = await http.post('/api/sites').set(auth(adminA)).send({ data: { name: 'x', slug: 'x', contact_mail: 'x@x.test' } });
    expect(created.status).toBe(403);
    expect((await http.delete(`/api/sites/${siteA}`).set(auth(adminA))).status).toBe(403);
  });

  it('ne laisse pas fuiter les données personnelles via populate', async () => {
    const res = await http.get('/api/sites?populate[contact_submissions]=*&populate[newsletter_subscribers]=*').set(auth(adminA));
    expect(JSON.stringify(res.body)).not.toContain('donnée personnelle B');
    expect(JSON.stringify(res.body)).not.toContain('abonne-b@example.test');
  });

  it('protège le slug et les champs techniques en mise à jour', async () => {
    const res = await http.put(`/api/sites/${siteA}`).set(auth(adminA)).send({ data: { slug: 'detourne', netlify_site_id: 'x', contact_phone: '0102030405' } });
    expect(res.status).toBe(200);
    const site = (await http.get(`/api/sites/${siteA}`).set(auth(adminA))).body.data;
    expect(site.slug).toBe('test-site');
    expect(site.contact_phone).toBe('0102030405');
  });

  it('refuse un thème inconnu', async () => {
    expect((await http.put(`/api/sites/${siteA}`).set(auth(adminA)).send({ data: { theme: 'rose' } })).status).toBe(400);
  });
});

describe('contenus des autres communes', () => {
  for (const [pluralApiId] of Object.entries(SITE_SCOPED_TYPES)) {
    it(`${pluralApiId} : la liste ne contient que la commune`, async () => {
      for (const status of ['published', 'draft']) {
        const res = await http.get(`/api/${pluralApiId}?status=${status}`).set(auth(adminA));
        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).not.toMatch(/secret B|Page B|Événement B|abonne-b|"last_name":"B"/);
      }
    });
  }

  it("refuse la lecture, la modification et la suppression d'un contenu de B", async () => {
    expect((await http.get(`/api/articles/${articleB}?status=draft`).set(auth(adminA))).status).toBe(403);
    expect((await http.put(`/api/articles/${articleB}`).set(auth(adminA)).send({ data: { title: 'pirate' } })).status).toBe(403);
    expect((await http.delete(`/api/articles/${articleB}`).set(auth(adminA))).status).toBe(403);
    expect((await http.get(`/api/contact-submissions/${submissionB}`).set(auth(adminA))).status).toBe(403);
  });

  it('ignore les filtres qui tentent de viser une autre commune', async () => {
    const res = await http.get(`/api/contact-submissions?filters[$or][0][site][documentId]=${siteB}`).set(auth(adminA));
    expect(JSON.stringify(res.body)).not.toContain('donnée personnelle B');
  });

  it('ne contourne pas le filtre avec un slash final', async () => {
    const res = await http.get('/api/articles/?status=draft').set(auth(adminA));
    expect(JSON.stringify(res.body)).not.toContain('secret B');
  });

  it('force la commune de l’utilisateur à la création', async () => {
    const res = await http.post('/api/articles').set(auth(adminA)).send({ data: { title: 'Article forcé', site: siteB } });
    expect(res.status).toBe(201);
    const created = await http.get(`/api/articles/${res.body.data.documentId}?status=draft&populate[site]=true`).set(auth(adminA));
    expect(created.body.data.site.documentId).toBe(siteA);
  });

  it('refuse les routes inconnues (fail-closed)', async () => {
    expect((await http.get('/api/users-permissions/roles').set(auth(adminA))).status).toBe(403);
  });
});

describe('fichiers et endpoints réservés', () => {
  it('interdit de lister, supprimer ou remplacer des fichiers', async () => {
    expect((await http.get('/api/upload/files').set(auth(adminA))).status).toBe(403);
    expect((await http.delete('/api/upload/files/1').set(auth(adminA))).status).toBe(403);
    const replace = await http.post('/api/upload?id=1').set(auth(adminA)).attach('files', Buffer.from('x'), 'x.txt');
    expect(replace.status).toBe(403);
  });

  it('réserve le debug de déploiement et le cache comarquage au super admin', async () => {
    expect((await http.get('/api/deployment/debug').set(auth(adminA))).status).toBe(403);
    expect((await http.post('/api/comarquage/cache/invalidate').set(auth(adminA))).status).toBe(403);
  });

  it('les statistiques newsletter ne comptent que la commune', async () => {
    const res = await http.get('/api/newsletter-subscribers/stats').set(auth(adminA));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });
});

describe('super admin', () => {
  it('voit toutes les communes sans impersonation', async () => {
    expect((await http.get(`/api/sites/${siteB}`).set(auth(superAdmin))).status).toBe(200);
  });

  it("en impersonation, est limité à la commune choisie", async () => {
    const asB = { ...auth(superAdmin), 'X-Site-Document-Id': siteB };
    expect((await http.get(`/api/articles/${articleB}?status=draft`).set(asB)).status).toBe(200);
    const mine = await http.post('/api/articles').set(auth(adminA)).send({ data: { title: 'Article de A' } });
    expect((await http.get(`/api/articles/${mine.body.data.documentId}?status=draft`).set(asB)).status).toBe(403);
  });
});

describe('brouillons, blocs et adresses', () => {
  it('enregistre un brouillon par défaut, publie seulement sur demande', async () => {
    const draft = await http.post('/api/articles').set(auth(adminA)).send({ data: { title: 'Brouillon' } });
    const published = await http.post('/api/articles?status=published').set(auth(adminA)).send({ data: { title: 'Publié' } });
    const list = JSON.stringify((await http.get('/api/articles').set(auth(adminA))).body);
    expect(list).not.toContain(draft.body.data.documentId);
    expect(list).toContain(published.body.data.documentId);
  });

  it('refuse un titre de niveau 1 et un lien javascript: dans les blocs', async () => {
    const h1 = { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'x' }] }] };
    const res = await http.post('/api/pages').set(auth(adminA)).send({ data: { title: 'H1', blocks: [{ __component: 'blocks.text', body: h1 }] } });
    expect(res.status).toBe(400);
    const js = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }],
    };
    const res2 = await http.post('/api/pages').set(auth(adminA)).send({ data: { title: 'JS', blocks: [{ __component: 'blocks.text', body: js }] } });
    expect(res2.status).toBe(400);
  });

  it('refuse de publier un bloc incomplet mais accepte le brouillon', async () => {
    const blocks = [{ __component: 'blocks.text', body: doc('Bonjour') }, { __component: 'blocks.gallery', images: [] }];
    expect((await http.post('/api/pages').set(auth(adminA)).send({ data: { title: 'Galerie', blocks } })).status).toBe(201);
    expect((await http.post('/api/pages?status=published').set(auth(adminA)).send({ data: { title: 'Galerie 2', blocks } })).status).toBe(400);
  });

  it('les adresses sont uniques par commune, pas globalement', async () => {
    const mine = await http.post('/api/articles').set(auth(adminA)).send({ data: { title: 'Article B' } });
    expect(mine.status).toBe(201);
    expect(mine.body.data.slug).toBe('article-b'); // le même slug existe dans la commune B
    const again = await http.post('/api/articles').set(auth(adminA)).send({ data: { title: 'Autre', slug: 'article-b' } });
    expect(again.status).toBe(400);
  });
});

describe('limitation des envois', () => {
  it('bloque le mot de passe oublié après 10 demandes', async () => {
    let last = 0;
    for (let i = 0; i < 12; i += 1) {
      last = (await http.post('/api/user-management/forgot-password').send({ email: `personne${i}@example.test` })).status;
    }
    expect(last).toBe(429);
  });
});

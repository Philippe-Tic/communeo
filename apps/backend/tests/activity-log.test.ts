/**
 * Journal d'activité (#190) : connexions, publications, suppressions, utilisateurs, thème ;
 * actions de l'équipe Communeo en impersonation au nom réel du super admin ; lecture réservée
 * (équipe : tout, administrateur : sa commune, éditeur : refusé) ; conservation de 6 mois.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { purgeActivityLog } from '../src/services/activity-log';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let superAdmin: string;
let editor: string;
let siteA: string;
let siteB: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const journal = async (token: string, query = '') => (await http.get(`/api/activity-log${query}`).set(auth(token))).body;

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  superAdmin = (await http.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth(admin))).body.site.documentId;
  const b = await strapi.documents('api::site.site').create({
    data: { name: 'Commune B', slug: 'commune-b-journal', contact_mail: 'mairie@b.test' } as any,
  });
  siteB = b.documentId;
  // Un éditeur de la commune A
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const site = await strapi.db.query('api::site.site').findOne({ where: { documentId: siteA } });
  const password = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: 'jardin-loire-2026' })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: 'redac@a.test', email: 'redac@a.test', password, first_name: 'Rémi', last_name: 'Dac', municipality_role: 'editor', blocked: false, active: true, confirmed: true, provider: 'local', role: role.id, site: site.id },
  });
  editor = (await http.post('/api/auth/local').send({ identifier: 'redac@a.test', password: 'jardin-loire-2026' })).body.jwt;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('enregistrement', () => {
  it('connexion : notée avec l’adresse IP, date de dernière connexion du compte', async () => {
    const res = await http.post('/api/session/login').set('X-Forwarded-For', '203.0.113.7').send({ identifier: 'test@example.com', password: 'test123' });
    expect(res.status).toBe(200);
    const { data } = await journal(superAdmin, `?action=login&site=${siteA}`);
    expect(data[0]).toMatchObject({ action: 'login', ip: '203.0.113.7', site: { documentId: siteA } });
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: 'test@example.com' } });
    expect(Date.now() - new Date(user.last_login_at).getTime()).toBeLessThan(60_000);
  });

  it('publication, dépublication, suppression d’un contenu, avec son titre et son auteur', async () => {
    const created = await http.post('/api/articles?status=published').set(auth(admin)).send({ data: { title: 'Brocante de printemps' } });
    const id = created.body.data.documentId;
    await http.post(`/api/publication/articles/${id}/unpublish`).set(auth(admin));
    await http.delete(`/api/articles/${id}`).set(auth(admin));
    const { data } = await journal(admin);
    const mine = data.filter((entry: any) => entry.target?.id === id).map((entry: any) => entry.action);
    expect(mine).toEqual(['delete', 'unpublish', 'publish']);
    expect(data.find((entry: any) => entry.action === 'publish' && entry.target?.id === id)).toMatchObject({
      target: { type: 'article', label: 'Brocante de printemps' },
      onBehalf: false,
      actorName: expect.any(String),
    });
    // Un brouillon n'est pas une publication
    await http.post('/api/articles').set(auth(admin)).send({ data: { title: 'Brouillon discret' } });
    expect((await journal(admin)).data.some((entry: any) => entry.target?.label === 'Brouillon discret')).toBe(false);
  });

  it('en impersonation : au nom réel du super admin, marqué pour la commune', async () => {
    const created = await http.post('/api/articles?status=published').set({ ...auth(superAdmin), 'X-Site-Document-Id': siteA }).send({ data: { title: 'Fête du village' } });
    expect(created.status).toBe(201);
    const entry = (await journal(admin)).data.find((row: any) => row.target?.label === 'Fête du village');
    const me = (await http.get('/api/users/me').set(auth(superAdmin))).body;
    expect(entry).toMatchObject({ action: 'publish', onBehalf: true, site: { documentId: siteA } });
    expect(entry.actorName).toBe([me.first_name, me.last_name].filter(Boolean).join(' ') || me.email);
  });

  it('utilisateurs : invitation, rôle, désactivation, suppression', async () => {
    const invited = await http.post('/api/user-management').set(auth(admin)).send({ data: { username: 'nouvelle@a.test', email: 'nouvelle@a.test', first_name: 'Nina', last_name: 'Velle', municipality_role: 'editor' } });
    const userId = invited.body.data.id;
    await http.put(`/api/user-management/${userId}`).set(auth(admin)).send({ data: { municipality_role: 'admin' } });
    await http.put(`/api/user-management/${userId}`).set(auth(admin)).send({ data: { active: false } });
    await http.delete(`/api/user-management/${userId}`).set(auth(admin));
    const actions = (await journal(admin)).data.filter((entry: any) => entry.target?.label === 'nouvelle@a.test').map((entry: any) => [entry.action, entry.details]);
    expect(actions).toEqual([
      ['user_delete', null],
      ['user_deactivate', null],
      ['role_change', { from: 'editor', to: 'admin' }],
      ['user_invite', { role: 'editor' }],
    ]);
  });

  it('changement de thème : ancien et nouveau thème', async () => {
    await strapi.db.query('api::site.site').update({ where: { documentId: siteB }, data: { theme: 'moderne' } });
    await strapi.documents('api::site.site').update({ documentId: siteB, data: { theme: 'institutionnel' } as any });
    const { data } = await journal(superAdmin, `?action=theme_change&site=${siteB}`);
    expect(data[0]).toMatchObject({ details: { from: 'moderne', to: 'institutionnel' }, site: { documentId: siteB } });
  });

  it('commune suspendue puis réactivée par l’équipe', async () => {
    await http.put(`/api/site-management/${siteB}`).set(auth(superAdmin)).send({ data: { suspended: true } });
    await http.put(`/api/site-management/${siteB}`).set(auth(superAdmin)).send({ data: { suspended: false } });
    const entries = (await journal(superAdmin, `?site=${siteB}`)).data;
    expect(entries.slice(0, 2).map((entry: any) => entry.action)).toEqual(['commune_unsuspend', 'commune_suspend']);
    // Depuis l'espace équipe aussi : signalé comme une action de l'équipe Communeo
    expect(entries[0].onBehalf).toBe(true);
  });
});

describe('consultation', () => {
  it('administrateur : sa commune seulement, sans adresse IP ; éditeur : refusé', async () => {
    await strapi.documents('api::article.article').create({ data: { title: 'Article de B', slug: 'article-de-b', site: (await strapi.db.query('api::site.site').findOne({ where: { documentId: siteB } })).id } as any, status: 'published' });
    const { data, meta } = await journal(admin);
    expect(meta.pagination.total).toBeGreaterThan(0);
    expect(data.every((entry: any) => entry.site?.documentId === siteA)).toBe(true);
    expect(data.every((entry: any) => entry.ip === undefined)).toBe(true);
    expect((await http.get('/api/activity-log').set(auth(editor))).status).toBe(403);
    expect((await http.get('/api/activity-log')).status).toBeGreaterThanOrEqual(401);
  });

  it('équipe en impersonation : le journal de la commune ouverte', async () => {
    const res = await http.get('/api/activity-log').set({ ...auth(superAdmin), 'X-Site-Document-Id': siteB });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((entry: any) => entry.site?.documentId === siteB)).toBe(true);
  });

  it('équipe : toutes les communes, filtre par commune et par action', async () => {
    const all = await journal(superAdmin);
    const sites = new Set(all.data.map((entry: any) => entry.site?.documentId));
    expect(sites.has(siteA)).toBe(true);
    expect(sites.has(siteB)).toBe(true);
    const onlyB = await journal(superAdmin, `?site=${siteB}`);
    expect(onlyB.data.every((entry: any) => entry.site?.documentId === siteB)).toBe(true);
    const logins = await journal(superAdmin, '?action=login');
    expect(logins.data.every((entry: any) => entry.action === 'login')).toBe(true);
  });
});

describe('conservation', () => {
  it('les entrées de plus de 6 mois sont supprimées, les autres gardées', async () => {
    const old = await strapi.db.query('api::activity-log.activity-log').create({ data: { action: 'login', actor_name: 'Ancien' } });
    await strapi.db.connection('activity_logs').where({ id: old.id }).update({ created_at: new Date(Date.now() - 200 * 86_400_000) });
    const recent = await strapi.db.query('api::activity-log.activity-log').create({ data: { action: 'login', actor_name: 'Récent' } });
    await purgeActivityLog();
    expect(await strapi.db.query('api::activity-log.activity-log').findOne({ where: { id: old.id } })).toBeNull();
    expect(await strapi.db.query('api::activity-log.activity-log').findOne({ where: { id: recent.id } })).not.toBeNull();
  });
});

/**
 * Utilisateurs de la commune (#146) : désactivation (connexion refusée, session en cours coupée,
 * réactivation), garde-fous (pas soi-même, toujours un administrateur actif), rôles attribuables.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let adminJwt: string;
let adminId: number;
let siteId: number;

const auth = (jwt = adminJwt) => ({ Authorization: `Bearer ${jwt}` });

async function member(email: string, role: 'admin' | 'editor', password = 'jardin-loire-2026') {
  const authenticated = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const hashed = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password })).password;
  const user = await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: email, email, password: hashed, first_name: 'Paul', last_name: 'Durand', municipality_role: role, blocked: false, active: true, confirmed: true, provider: 'local', role: authenticated.id, site: siteId },
  });
  return { id: user.id as number, email, password };
}

const login = (identifier: string, password: string) => http.post('/api/session/login').send({ identifier, password });

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  adminJwt = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  const me = (await http.get('/api/users/me').set(auth())).body;
  adminId = me.id;
  siteId = (await strapi.db.query('api::site.site').findOne({ where: { documentId: me.site.documentId } })).id;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('désactivation', () => {
  it('coupe la session en cours, refuse la connexion, puis la réactivation rend l’accès', async () => {
    const paul = await member('paul@example.test', 'editor');
    const jwt = (await http.post('/api/auth/local').send({ identifier: paul.email, password: paul.password })).body.jwt;
    expect((await http.get('/api/users/me').set(auth(jwt))).status).toBe(200);

    expect((await http.put(`/api/user-management/${paul.id}`).set(auth()).send({ data: { active: false } })).status).toBe(200);
    expect((await http.get('/api/users/me').set(auth(jwt))).status).toBe(401);
    expect((await http.get('/api/pages').set(auth(jwt))).status).toBe(401);
    expect((await login(paul.email, paul.password)).status).toBe(400);
    expect((await http.post('/api/auth/local').send({ identifier: paul.email, password: paul.password })).status).toBe(400);

    await http.put(`/api/user-management/${paul.id}`).set(auth()).send({ data: { active: true } });
    expect((await login(paul.email, paul.password)).status).toBe(200);
  });

  it('on ne se désactive pas soi-même', async () => {
    const res = await http.put(`/api/user-management/${adminId}`).set(auth()).send({ data: { active: false } });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Vous ne pouvez pas désactiver votre propre compte');
  });

  it('la commune garde toujours un administrateur actif', async () => {
    const other = await member('adjoint@example.test', 'admin');
    const otherJwt = (await http.post('/api/auth/local').send({ identifier: other.email, password: other.password })).body.jwt;
    // Deux administrateurs : l'un peut rétrograder l'autre…
    expect((await http.put(`/api/user-management/${adminId}`).set(auth(otherJwt)).send({ data: { municipality_role: 'editor' } })).status).toBe(200);
    // … mais le dernier ne peut être ni rétrogradé ni désactivé
    const demote = await http.put(`/api/user-management/${other.id}`).set(auth(otherJwt)).send({ data: { municipality_role: 'editor' } });
    expect(demote.status).toBe(400);
    expect(demote.body.error.message).toBe('La commune doit garder au moins un administrateur actif');
    // Remise en état pour les autres tests
    await strapi.db.query('plugin::users-permissions.user').update({ where: { id: adminId }, data: { municipality_role: 'admin' } });
  });

  it('un administrateur de commune ne peut pas attribuer le rôle super_admin', async () => {
    const paul = await member('paul2@example.test', 'editor');
    expect((await http.put(`/api/user-management/${paul.id}`).set(auth()).send({ data: { municipality_role: 'super_admin' } })).status).toBe(403);
  });
});

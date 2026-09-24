/**
 * Session de l'administration dans un cookie HttpOnly (#132).
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
const credentials = { identifier: 'test@example.com', password: 'test123' };
const csrf = { 'X-Communeo-Csrf': '1' };

beforeAll(async () => {
  strapi = await setupStrapi();
});

afterAll(async () => {
  await teardownStrapi();
});

const agent = () => request.agent(strapi.server.httpServer);

describe('POST /api/session/login', () => {
  it('pose un cookie HttpOnly, SameSite=Strict, limité à /api, sans renvoyer le jeton', async () => {
    const res = await agent().post('/api/session/login').send(credentials);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/);
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((value) => value.startsWith('communeo_session='))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/path=\/api/i);
    const hours = (new Date(/expires=([^;]+)/i.exec(cookie)![1]!).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(7.9);
    expect(hours).toBeLessThanOrEqual(8);
  });

  it('même réponse pour un mauvais mot de passe et un compte inconnu', async () => {
    const wrong = await agent().post('/api/session/login').send({ identifier: 'test@example.com', password: 'faux' });
    const unknown = await agent().post('/api/session/login').send({ identifier: 'personne@example.com', password: 'faux' });
    expect(wrong.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
    expect(wrong.headers['set-cookie']).toBeUndefined();
  });

  it('refuse un compte bloqué (invitation non acceptée)', async () => {
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: 'test@example.com' } });
    await strapi.db.query('plugin::users-permissions.user').update({ where: { id: user.id }, data: { blocked: true } });
    try {
      expect((await agent().post('/api/session/login').send(credentials)).status).toBe(400);
    } finally {
      await strapi.db.query('plugin::users-permissions.user').update({ where: { id: user.id }, data: { blocked: false } });
    }
  });
});

describe('authentification par le cookie', () => {
  it('lecture avec le cookie, sans en-tête Authorization', async () => {
    const session = agent();
    await session.post('/api/session/login').send(credentials);
    const me = await session.get('/api/users/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('test@example.com');
    expect(me.body.site?.slug).toBe('test-site');
  });

  it('écriture refusée sans l’en-tête de sécurité, acceptée avec', async () => {
    const session = agent();
    await session.post('/api/session/login').send(credentials);
    const forged = await session.post('/api/pages').send({ data: { title: 'Forgée' } });
    expect(forged.status).toBe(403);
    const legit = await session.post('/api/pages').set(csrf).send({ data: { title: 'Page légitime' } });
    expect(legit.status).toBe(201);
  });

  it('les jetons en en-tête (intégrations, build, preview) ne sont pas concernés', async () => {
    const { jwt } = (await request(strapi.server.httpServer).post('/api/auth/local').send(credentials)).body;
    const res = await request(strapi.server.httpServer).post('/api/pages').set('Authorization', `Bearer ${jwt}`).send({ data: { title: 'Par en-tête' } });
    expect(res.status).toBe(201);
  });

  it('déconnexion : cookie effacé, plus d’accès', async () => {
    const session = agent();
    await session.post('/api/session/login').send(credentials);
    expect((await session.post('/api/session/logout')).status).toBe(403);
    const out = await session.post('/api/session/logout').set(csrf);
    expect(out.status).toBe(204);
    expect(String(out.headers['set-cookie'])).toMatch(/communeo_session=;/);
    // Sans session, le rôle public n'a pas accès à /users/me (403) : l'admin le traite comme « non connecté »
    expect((await session.get('/api/users/me')).status).toBe(403);
  });

  it('cookie invalide : non authentifié', async () => {
    const res = await request(strapi.server.httpServer).get('/api/users/me').set('Cookie', 'communeo_session=faux.jeton.ici');
    expect(res.status).toBe(401);
  });
});

/** Jeton de session émis `ageSeconds` plus tôt (comme après une période d'utilisation) */
async function sessionCookie(ageSeconds: number, payload: Record<string, unknown> = {}, expiresIn = '8h') {
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: 'test@example.com' } });
  const iat = Math.floor(Date.now() / 1000) - ageSeconds;
  const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id, iat, ...payload }, { expiresIn });
  return `communeo_session=${jwt}`;
}
const renewed = (res: request.Response) =>
  ((res.headers['set-cookie'] as unknown as string[] | undefined) ?? []).find((value) => value.startsWith('communeo_session='));

describe('fin après 8 h d’inactivité', () => {
  it('une session utilisée est renouvelée pour 8 h (au plus toutes les 5 minutes)', async () => {
    const http = request(strapi.server.httpServer);
    const old = await http.get('/api/users/me').set('Cookie', await sessionCookie(10 * 60));
    expect(old.status).toBe(200);
    const cookie = renewed(old);
    expect(cookie).toMatch(/HttpOnly/i);
    const hours = (new Date(/expires=([^;]+)/i.exec(cookie!)![1]!).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(7.9);
    // Émise il y a moins de 5 minutes : pas de renouvellement à chaque requête
    expect(renewed(await http.get('/api/users/me').set('Cookie', await sessionCookie(60)))).toBeUndefined();
  });

  it('une session sans activité depuis 8 h est refusée', async () => {
    const res = await request(strapi.server.httpServer).get('/api/users/me').set('Cookie', await sessionCookie(8 * 3600 + 60));
    expect(res.status).toBe(401);
    expect(renewed(res)).toBeUndefined();
  });

  it('« Rester connecté » : 30 jours, sans renouvellement', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('Cookie', await sessionCookie(10 * 60, { remember: true }, '30d'));
    expect(res.status).toBe(200);
    expect(renewed(res)).toBeUndefined();
  });

  it('une requête refusée ne renouvelle pas la session', async () => {
    const res = await request(strapi.server.httpServer).get('/api/site-management').set('Cookie', await sessionCookie(10 * 60));
    expect(res.status).toBe(403);
    expect(renewed(res)).toBeUndefined();
  });
});

async function member(email: string, password: string) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const site = await strapi.db.query('api::site.site').findOne({ where: { slug: 'test-site' } });
  const hashed = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: email, email, password: hashed, municipality_role: 'editor', blocked: false, active: true, confirmed: true, provider: 'local', role: role.id, site: site.id },
  });
}

describe('limitation des tentatives', () => {
  // Une adresse par test : les échecs se comptent aussi par adresse IP
  const login = (ip: string, identifier: string, password: string) =>
    agent().post('/api/session/login').set('X-Forwarded-For', ip).send({ identifier, password });
  const local = (ip: string, identifier: string, password: string) =>
    request(strapi.server.httpServer).post('/api/auth/local').set('X-Forwarded-For', ip).send({ identifier, password });

  it('6e essai en moins de 15 minutes : refusé même avec le bon mot de passe', async () => {
    await member('bloque@example.test', 'jardin-loire-2026');
    for (let i = 0; i < 5; i += 1) expect((await login('10.0.0.1', 'bloque@example.test', 'faux')).status).toBe(400);
    const sixth = await login('10.0.0.1', 'bloque@example.test', 'jardin-loire-2026');
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.message).toMatch(/bloqué 15 minutes/);
    expect(sixth.headers['set-cookie']).toBeUndefined();
    // Le compte est bloqué, d'où qu'on vienne
    expect((await login('10.0.0.99', 'bloque@example.test', 'jardin-loire-2026')).status).toBe(429);
  });

  it('/api/auth/local compte avec la session : pas de contournement du blocage', async () => {
    await member('contourne@example.test', 'jardin-loire-2026');
    for (let i = 0; i < 3; i += 1) expect((await local('10.0.0.2', 'contourne@example.test', 'faux')).status).toBe(400);
    for (let i = 0; i < 2; i += 1) expect((await login('10.0.0.2', 'contourne@example.test', 'faux')).status).toBe(400);
    const direct = await local('10.0.0.2', 'contourne@example.test', 'jardin-loire-2026');
    expect(direct.status).toBe(429);
    expect(direct.body.jwt).toBeUndefined();
    expect((await login('10.0.0.2', 'Contourne@Example.test', 'jardin-loire-2026')).status).toBe(429);
  });

  it('une connexion réussie remet le compteur du compte à zéro', async () => {
    await member('reprise@example.test', 'jardin-loire-2026');
    for (let i = 0; i < 4; i += 1) await local('10.0.0.3', 'reprise@example.test', 'faux');
    expect((await local('10.0.0.3', 'reprise@example.test', 'jardin-loire-2026')).status).toBe(200);
    for (let i = 0; i < 4; i += 1) await login('10.0.0.3', 'reprise@example.test', 'faux');
    expect((await login('10.0.0.3', 'reprise@example.test', 'jardin-loire-2026')).status).toBe(200);
  });

  it('par adresse IP : 20 échecs sur des comptes différents bloquent l’adresse, pas les autres', async () => {
    for (let i = 0; i < 20; i += 1) expect((await login('10.0.0.4', `inconnu${i}@example.test`, 'faux')).status).toBe(400);
    expect((await login('10.0.0.4', 'test@example.com', 'test123')).status).toBe(429);
    expect((await local('10.0.0.4', 'test@example.com', 'test123')).status).toBe(429);
    expect((await login('10.0.0.5', 'test@example.com', 'test123')).status).toBe(200);
  });

  it('les connexions réussies ne comptent pas (plusieurs agents derrière une même adresse)', async () => {
    for (let i = 0; i < 25; i += 1) expect((await login('10.0.0.6', 'test@example.com', 'test123')).status).toBe(200);
  });
});

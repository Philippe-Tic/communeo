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
    expect(hours).toBeGreaterThan(11);
    expect(hours).toBeLessThanOrEqual(12);
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

describe('limitation des tentatives', () => {
  it('bloque après 5 tentatives pour un même compte', async () => {
    const identifier = 'cible@example.com';
    let last = 0;
    for (let i = 0; i < 6; i += 1) last = (await agent().post('/api/session/login').send({ identifier, password: 'x' })).status;
    expect(last).toBe(429);
  });

  it('les connexions réussies ne comptent pas (plusieurs agents derrière une même adresse)', async () => {
    for (let i = 0; i < 8; i += 1) expect((await agent().post('/api/session/login').send(credentials)).status).toBe(200);
  });
});

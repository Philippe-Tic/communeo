/**
 * Liens d'invitation et de réinitialisation (#132) : description du lien, acceptation, nouvelle invitation.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { createInvitationToken, RESET_TTL_MS } from '../src/utils/security';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let siteId: number;

async function invitedUser(email: string, ttlMs?: number, blocked = true) {
  const { token, stored } = createInvitationToken(ttlMs);
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: email, email, password: 'provisoire-123', first_name: 'Anne', last_name: 'Martin', municipality_role: 'editor', blocked, confirmed: true, provider: 'local', role: role.id, site: siteId, resetPasswordToken: stored },
  });
  return token;
}

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  siteId = (await strapi.db.query('api::site.site').findOne({ where: { slug: 'test-site' } })).id;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('GET /api/user-management/invitation', () => {
  it('décrit une invitation valable, avec de quoi accueillir la personne', async () => {
    const token = await invitedUser('anne@example.test');
    const res = await http.get('/api/user-management/invitation').query({ jeton: token });
    expect(res.body).toEqual({ status: 'valid', purpose: 'invitation', firstName: 'Anne', siteName: expect.any(String), role: 'editor', email: 'anne@example.test' });
  });

  it('distingue un lien expiré (sans révéler l’adresse) d’un lien invalide', async () => {
    const token = await invitedUser('expire@example.test', -1000);
    const expired = await http.get('/api/user-management/invitation').query({ jeton: token });
    expect(expired.body).toMatchObject({ status: 'expired', purpose: 'invitation', firstName: 'Anne' });
    expect(expired.body.email).toBeUndefined();
    expect((await http.get('/api/user-management/invitation').query({ jeton: 'n-importe-quoi' })).body).toEqual({ status: 'invalid' });
    expect((await http.get('/api/user-management/invitation').query({ jeton: `${'a'.repeat(64)}.${Date.now() + 1000}` })).body).toEqual({ status: 'invalid' });
  });

  it('reconnaît un lien de réinitialisation (compte déjà actif), valable 1 heure', async () => {
    const token = await invitedUser('reset@example.test', RESET_TTL_MS, false);
    expect(Number(token.split('.')[1]) - Date.now()).toBeLessThanOrEqual(RESET_TTL_MS);
    expect((await http.get('/api/user-management/invitation').query({ jeton: token })).body).toMatchObject({ status: 'valid', purpose: 'reset' });
  });
});

describe('lien de mot de passe oublié de plus d’une heure', () => {
  it('annoncé expiré, et refusé à la validation du nouveau mot de passe', async () => {
    const token = await invitedUser('reset-expire@example.test', -1000, false);
    expect((await http.get('/api/user-management/invitation').query({ jeton: token })).body).toMatchObject({ status: 'expired', purpose: 'reset' });
    const accept = await http.post('/api/user-management/accept-invitation').send({ token, password: 'nouveau-mot-2026', passwordConfirmation: 'nouveau-mot-2026' });
    expect(accept.status).toBe(400);
    expect((await http.post('/api/session/login').send({ identifier: 'reset-expire@example.test', password: 'nouveau-mot-2026' })).status).toBe(400);
  });
});

describe('acceptation et nouvelle invitation', () => {
  it('le mot de passe choisi active le compte, qui peut ensuite se connecter', async () => {
    const token = await invitedUser('active@example.test');
    const accept = await http.post('/api/user-management/accept-invitation').send({ token, password: 'loire-jardin-2026', passwordConfirmation: 'loire-jardin-2026' });
    expect(accept.status).toBe(200);
    const login = await http.post('/api/session/login').send({ identifier: 'active@example.test', password: 'loire-jardin-2026' });
    expect(login.status).toBe(200);
    // Le lien ne sert qu'une fois
    expect((await http.get('/api/user-management/invitation').query({ jeton: token })).body).toEqual({ status: 'invalid' });
  });

  it('refuse un mot de passe de moins de 10 caractères', async () => {
    const token = await invitedUser('court@example.test');
    const res = await http.post('/api/user-management/accept-invitation').send({ token, password: 'court', passwordConfirmation: 'court' });
    expect(res.status).toBe(400);
  });

  it('une demande de nouvelle invitation répond toujours pareil', async () => {
    const token = await invitedUser('redemande@example.test', -1000);
    sentEmails.length = 0;
    expect((await http.post('/api/user-management/request-invitation').send({ jeton: token })).body).toEqual({ ok: true });
    // Les administrateurs de la commune sont prévenus
    expect(sentEmails.map((message) => message.to)).toContain('test@example.com');
    expect((await http.post('/api/user-management/request-invitation').send({ jeton: 'faux' })).body).toEqual({ ok: true });
  });
});

describe('rester connecté', () => {
  it('session de 30 jours sur demande, 8 h (renouvelées à l’usage) sinon', async () => {
    const hours = (cookie: unknown) => {
      const expires = /expires=([^;]+)/i.exec(String(cookie))?.[1];
      return expires ? (new Date(expires).getTime() - Date.now()) / 3_600_000 : 0;
    };
    const remembered = await http.post('/api/session/login').send({ identifier: 'test@example.com', password: 'test123', remember: true });
    expect(hours(remembered.headers['set-cookie'])).toBeGreaterThan(24 * 29);
    const normal = await http.post('/api/session/login').send({ identifier: 'test@example.com', password: 'test123' });
    expect(hours(normal.headers['set-cookie'])).toBeGreaterThan(7.9);
    expect(hours(normal.headers['set-cookie'])).toBeLessThanOrEqual(8);
  });
});

describe('administrateurs à contacter', () => {
  it('un éditeur voit le nom des administrateurs de sa commune, sans leur adresse', async () => {
    const token = await invitedUser('editrice@example.test');
    await http.post('/api/user-management/accept-invitation').send({ token, password: 'loire-jardin-2026', passwordConfirmation: 'loire-jardin-2026' });
    const login = await http.post('/api/session/login').send({ identifier: 'editrice@example.test', password: 'loire-jardin-2026' });
    const cookie = login.headers['set-cookie'];
    const res = await http.get('/api/user-management/admins').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const admin of res.body.data) expect(Object.keys(admin)).toEqual(['name']);
    // La liste complète des utilisateurs reste réservée aux administrateurs
    expect((await http.get('/api/user-management').set('Cookie', cookie)).status).toBe(403);
  });
});

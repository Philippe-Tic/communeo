/**
 * Mon compte (#367) : la personne connectée modifie son prénom, son nom et son mot de passe, et
 * rien d'autre (ni son rôle, ni sa commune, ni son adresse, ni un autre compte). Le changement de
 * mot de passe exige le mot de passe actuel et ferme les autres sessions.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let siteId: number;
const csrf = { 'X-Communeo-Csrf': '1' };
const PASSWORD = 'jardin-loire-2026';

async function member(email: string, role: 'admin' | 'editor' = 'editor') {
  const authenticated = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const hashed = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: PASSWORD })).password;
  const user = await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: email, email, password: hashed, first_name: 'Paul', last_name: 'Durand', municipality_role: role, blocked: false, active: true, confirmed: true, provider: 'local', role: authenticated.id, site: siteId },
  });
  return { id: user.id as number, email };
}

/** Session de l'admin (cookie), comme dans le navigateur */
async function session(email: string, password = PASSWORD) {
  const agent = request.agent(strapi.server.httpServer);
  expect((await agent.post('/api/session/login').send({ identifier: email, password })).status).toBe(200);
  return agent;
}

/** Cookie de session émis il y a une minute (une autre session ouverte plus tôt) */
async function olderSession(userId: number) {
  const iat = Math.floor(Date.now() / 1000) - 60;
  return `communeo_session=${strapi.plugin('users-permissions').service('jwt').issue({ id: userId, iat }, { expiresIn: '8h' })}`;
}

const stored = (id: number) => strapi.db.query('plugin::users-permissions.user').findOne({ where: { id }, populate: ['site'] });

beforeAll(async () => {
  strapi = await setupStrapi();
  siteId = (await strapi.db.query('api::site.site').findOne({ where: { slug: 'test-site' } })).id;
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe('PUT /api/user-management/me', () => {
  it('modifie le prénom et le nom (sans espaces autour), et ne renvoie rien de technique', async () => {
    const paul = await member('profil@example.test');
    const agent = await session(paul.email);
    const res = await agent.put('/api/user-management/me').set(csrf).send({ data: { first_name: '  Paulette ', last_name: 'Durand-Martin' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: paul.id, email: paul.email, first_name: 'Paulette', last_name: 'Durand-Martin', phone: null, municipality_role: 'editor' });
    const me = (await agent.get('/api/users/me')).body;
    expect([me.first_name, me.last_name]).toEqual(['Paulette', 'Durand-Martin']);
  });

  it('refuse un prénom ou un nom vide', async () => {
    const paul = await member('vide@example.test');
    const agent = await session(paul.email);
    const res = await agent.put('/api/user-management/me').set(csrf).send({ data: { first_name: '   ' } });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Le prénom est obligatoire');
    expect((await stored(paul.id)).first_name).toBe('Paul');
  });

  it('refuse le rôle, la commune, l’adresse et tout champ non prévu', async () => {
    const paul = await member('role@example.test');
    const agent = await session(paul.email);
    const other = await strapi.db.query('api::site.site').create({ data: { name: 'Autre commune', slug: 'autre-commune-compte' } });
    for (const data of [
      { municipality_role: 'admin' },
      { municipality_role: 'super_admin', first_name: 'Paul' },
      { site: other.id },
      { email: 'pirate@example.test' },
      { blocked: false, active: true },
      { password: 'nouveau-mot-de-passe' },
    ]) {
      const res = await agent.put('/api/user-management/me').set(csrf).send({ data });
      expect(res.status, JSON.stringify(data)).toBe(400);
      expect(res.body.error.message).toMatch(/^Champ non modifiable/);
    }
    const user = await stored(paul.id);
    expect(user.municipality_role).toBe('editor');
    expect(user.site.id).toBe(siteId);
    expect(user.email).toBe(paul.email);
  });

  it('exige l’en-tête de sécurité avec le cookie de session', async () => {
    const paul = await member('csrf@example.test');
    const agent = await session(paul.email);
    expect((await agent.put('/api/user-management/me').send({ data: { first_name: 'Forgé' } })).status).toBe(403);
    expect((await stored(paul.id)).first_name).toBe('Paul');
  });

  it('ne modifie jamais un autre compte : /me ne vise que soi, /:id reste réservé aux administrateurs', async () => {
    const paul = await member('editeur-a@example.test');
    const anne = await member('editeur-b@example.test');
    const agent = await session(paul.email);
    // Un identifiant dans le corps est un champ non prévu : refusé
    expect((await agent.put('/api/user-management/me').set(csrf).send({ data: { id: anne.id, first_name: 'Anne' } })).status).toBe(400);
    // Route d'administration : un éditeur n'y a pas accès
    expect((await agent.put(`/api/user-management/${anne.id}`).set(csrf).send({ data: { first_name: 'Piraté' } })).status).toBe(403);
    // Route native de Strapi : jamais ouverte
    expect([403, 404]).toContain((await agent.put(`/api/users/${anne.id}`).set(csrf).send({ first_name: 'Piraté' })).status);
    expect([403, 404]).toContain((await agent.put(`/api/users/${paul.id}`).set(csrf).send({ municipality_role: 'admin' })).status);
    expect((await stored(anne.id)).first_name).toBe('Paul');
    expect((await stored(paul.id)).municipality_role).toBe('editor');
  });
});

describe('PUT /api/user-management/me/password', () => {
  const change = (agent: ReturnType<typeof request.agent>, body: Record<string, unknown>) =>
    agent.put('/api/user-management/me/password').set(csrf).send(body);

  it('change le mot de passe : l’ancien ne marche plus, la session continue, un e-mail prévient', async () => {
    const paul = await member('mdp@example.test');
    const agent = await session(paul.email);
    const res = await change(agent, { currentPassword: PASSWORD, password: 'riviere-et-peupliers', passwordConfirmation: 'riviere-et-peupliers' });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/);
    // Nouveau cookie : la session en cours continue
    expect(String(res.headers['set-cookie'])).toMatch(/communeo_session=ey/);
    expect((await agent.get('/api/users/me')).status).toBe(200);

    const http = request(strapi.server.httpServer);
    expect((await http.post('/api/session/login').send({ identifier: paul.email, password: PASSWORD })).status).toBe(400);
    expect((await http.post('/api/session/login').send({ identifier: paul.email, password: 'riviere-et-peupliers' })).status).toBe(200);
    expect(sentEmails.map((message) => [message.to, message.subject])).toEqual([[paul.email, 'Votre mot de passe a été modifié — Test Site']]);
  });

  it('ferme les autres sessions du compte (cookie ou jeton plus ancien)', async () => {
    const paul = await member('sessions@example.test');
    const other = await olderSession(paul.id);
    const http = request(strapi.server.httpServer);
    expect((await http.get('/api/users/me').set('Cookie', other)).status).toBe(200);

    const agent = await session(paul.email);
    expect((await change(agent, { currentPassword: PASSWORD, password: 'riviere-et-peupliers', passwordConfirmation: 'riviere-et-peupliers' })).status).toBe(200);

    expect((await http.get('/api/users/me').set('Cookie', other)).status).toBe(401);
    expect((await http.get('/api/pages').set('Cookie', other)).status).toBe(401);
    const bearer = other.replace('communeo_session=', '');
    expect((await http.get('/api/pages').set('Authorization', `Bearer ${bearer}`)).status).toBe(401);
    // La déconnexion reste possible (le cookie est effacé)
    expect((await http.post('/api/session/logout').set('Cookie', other).set(csrf)).status).toBe(204);
    expect((await agent.get('/api/users/me')).status).toBe(200);
  });

  it('refuse un mot de passe actuel faux, et le compte comme un échec de connexion', async () => {
    const paul = await member('faux@example.test');
    const agent = await session(paul.email);
    const res = await change(agent, { currentPassword: 'pas-le-bon', password: 'riviere-et-peupliers', passwordConfirmation: 'riviere-et-peupliers' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Le mot de passe actuel est incorrect');
    expect(sentEmails).toEqual([]);
    // Le mot de passe n'a pas changé
    const http = request(strapi.server.httpServer);
    expect((await http.post('/api/session/login').send({ identifier: paul.email, password: PASSWORD })).status).toBe(200);
  });

  it('bloque après 5 essais faux, comme la connexion', async () => {
    const paul = await member('essais@example.test');
    const agent = await session(paul.email);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await change(agent, { currentPassword: `faux-${attempt}`, password: 'riviere-et-peupliers', passwordConfirmation: 'riviere-et-peupliers' })).status).toBe(400);
    }
    const locked = await change(agent, { currentPassword: PASSWORD, password: 'riviere-et-peupliers', passwordConfirmation: 'riviere-et-peupliers' });
    expect(locked.status).toBe(429);
  });

  it('10 caractères minimum, confirmation identique, différent de l’actuel', async () => {
    const paul = await member('regles@example.test');
    const agent = await session(paul.email);
    const short = await change(agent, { currentPassword: PASSWORD, password: 'court', passwordConfirmation: 'court' });
    expect(short.status).toBe(400);
    expect(short.body.error.message).toBe('Le mot de passe doit contenir au moins 10 caractères');
    const mismatch = await change(agent, { currentPassword: PASSWORD, password: 'riviere-et-peupliers', passwordConfirmation: 'riviere-et-peuplier' });
    expect(mismatch.status).toBe(400);
    const same = await change(agent, { currentPassword: PASSWORD, password: PASSWORD, passwordConfirmation: PASSWORD });
    expect(same.status).toBe(400);
    expect(same.body.error.message).toBe("Choisissez un mot de passe différent de l'actuel");
  });

  it('sans session : refusé ; la route native /api/auth/change-password est fermée', async () => {
    const http = request(strapi.server.httpServer);
    expect((await http.put('/api/user-management/me/password').send({ currentPassword: PASSWORD, password: 'riviere-et-peupliers', passwordConfirmation: 'riviere-et-peupliers' })).status).toBe(403);
    const paul = await member('natif@example.test');
    const agent = await session(paul.email);
    const native = await agent.post('/api/auth/change-password').set(csrf).send({ currentPassword: PASSWORD, password: 'court-mais', passwordConfirmation: 'court-mais' });
    expect(native.status).toBe(403);
  });
});

describe('mot de passe oublié', () => {
  it('le nouveau mot de passe choisi par lien ferme les sessions ouvertes avant', async () => {
    const paul = await member('oubli@example.test');
    const other = await olderSession(paul.id);
    const http = request(strapi.server.httpServer);
    expect((await http.post('/api/user-management/forgot-password').send({ email: paul.email })).status).toBe(200);
    const token = /jeton=([^"\s&]+)/.exec(sentEmails.at(-1)!.text!)![1]!;
    expect((await http.post('/api/user-management/accept-invitation').send({ token, password: 'riviere-et-peupliers', passwordConfirmation: 'riviere-et-peupliers' })).status).toBe(200);
    expect((await http.get('/api/users/me').set('Cookie', other)).status).toBe(401);
  });
});

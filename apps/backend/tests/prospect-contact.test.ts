/**
 * Formulaire de contact du site de Communeo (#315) : le message part à l'équipe avec l'adresse de
 * l'expéditeur en réponse ; rien n'est enregistré ; robots et envois répétés sont écartés.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let client = 0;

const MESSAGE = {
  nom: 'Julie Martin',
  fonction: 'Secrétaire de mairie',
  commune: 'Saint-Aubin-sur-Loire',
  email: 'mairie@saint-aubin.test',
  message: 'Bonjour,\nPeut-on reprendre les pages de notre ancien site ?',
  consent: true,
};

const send = (body: Record<string, unknown>, ip = `198.51.100.${(client += 1)}`) =>
  api.post('/api/prospect-contact').set('X-Forwarded-For', ip).send(body);

beforeAll(async () => {
  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  process.env.SIGNUP_NOTIFY_EMAIL = 'equipe@communeo.test';
});

afterAll(async () => {
  delete process.env.SIGNUP_NOTIFY_EMAIL;
  await teardownStrapi();
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe('Formulaire de contact du site de Communeo', () => {
  it('transmet le message à l’équipe, avec l’expéditeur en réponse et le texte échappé', async () => {
    const res = await send({ ...MESSAGE, message: 'Bonjour <script>alert(1)</script>' });
    expect(res.status).toBe(202);
    expect(sentEmails).toHaveLength(1);
    const [mail] = sentEmails;
    expect(mail!.to).toBe('equipe@communeo.test');
    expect(mail!.replyTo).toBe('mairie@saint-aubin.test');
    expect(mail!.subject).toContain('Saint-Aubin-sur-Loire');
    expect(mail!.html).not.toContain('<script>');
    expect(mail!.text).toContain('Secrétaire de mairie');
  });

  it('refuse un message incomplet, une adresse invalide ou sans consentement', async () => {
    expect((await send({ ...MESSAGE, nom: ' ' })).status).toBe(400);
    expect((await send({ ...MESSAGE, email: 'mairie' })).status).toBe(400);
    expect((await send({ ...MESSAGE, consent: false })).status).toBe(400);
    expect((await send({ ...MESSAGE, message: 'x'.repeat(5001) })).status).toBe(400);
    expect(sentEmails).toHaveLength(0);
  });

  it('écarte un robot (champ piège rempli) sans le lui dire', async () => {
    const res = await send({ ...MESSAGE, site_web: 'https://spam.test' });
    expect(res.status).toBe(202);
    expect(sentEmails).toHaveLength(0);
  });

  it('limite les envois répétés depuis la même adresse', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await send(MESSAGE, '198.51.100.250')).status);
    expect(statuses.slice(0, 5)).toEqual([202, 202, 202, 202, 202]);
    expect(statuses[5]).toBe(429);
  });

  it('répond 503 sans adresse d’équipe configurée', async () => {
    delete process.env.SIGNUP_NOTIFY_EMAIL;
    try {
      expect((await send(MESSAGE)).status).toBe(503);
    } finally {
      process.env.SIGNUP_NOTIFY_EMAIL = 'equipe@communeo.test';
    }
  });
});

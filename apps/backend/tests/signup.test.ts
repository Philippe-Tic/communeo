/**
 * Inscription d'une mairie en libre-service (#309) : la confirmation part à l'adresse officielle de la
 * mairie (Annuaire de l'administration, simulé par un serveur local), jamais à l'adresse saisie ; sans
 * adresse officielle, la demande attend l'équipe. La confirmation crée la commune et son
 * administrateur, invité à choisir son mot de passe.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let publicData: http.Server;

const COMMUNES: Record<string, { nom: string; codesPostaux: string[]; hall: Record<string, unknown> | null }> = {
  '58264': {
    nom: 'Saint-Pierre-le-Moûtier',
    codesPostaux: ['58240'],
    hall: { nom: 'Mairie - Saint-Pierre-le-Moûtier', adresse_courriel: 'mairie@saintpierrelemoutier.fr' },
  },
  '2A004': { nom: 'Ajaccio', codesPostaux: ['20000'], hall: { nom: 'Mairie - Ajaccio', adresse_courriel: 'contact@ville-ajaccio.fr' } },
  '58100': { nom: 'Sans-Annuaire', codesPostaux: ['58100'], hall: null },
};

const geo = (code: string) => ({
  nom: COMMUNES[code]!.nom,
  code,
  codesPostaux: COMMUNES[code]!.codesPostaux,
  population: 1000,
  centre: { type: 'Point', coordinates: [3, 46] },
  departement: { code: code.slice(0, 2), nom: 'Test' },
});

const signup = (body: Record<string, unknown>) =>
  api.post('/api/signup').send({ first_name: 'Julie', last_name: 'Secrétaire', terms: true, ...body });

/** Jeton du lien envoyé dans le dernier e-mail */
const lastLink = () => /jeton=([a-f0-9]{64}\.\d{13})/.exec(String(sentEmails.at(-1)?.text))?.[1];

beforeAll(async () => {
  publicData = http.createServer((req, res) => {
    const url = new URL(req.url!, 'http://localhost');
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/geo/communes') {
      const name = url.searchParams.get('nom') ?? '';
      return send(200, Object.keys(COMMUNES).filter((code) => COMMUNES[code]!.nom.startsWith(name)).map(geo));
    }
    const one = /^\/geo\/communes\/(.+)$/.exec(url.pathname);
    if (one) return COMMUNES[one[1]!] ? send(200, geo(one[1]!)) : send(404, { code: 404 });
    if (url.pathname === '/annuaire') {
      const code = /code_insee_commune="([^"]+)"/.exec(url.searchParams.get('where') ?? '')?.[1];
      const hall = code ? COMMUNES[code]?.hall : null;
      return send(200, { total_count: hall ? 1 : 0, results: hall ? [hall] : [] });
    }
    send(404, {});
  });
  await new Promise<void>((resolve) => publicData.listen(0, resolve));
  const port = (publicData.address() as AddressInfo).port;
  process.env.GEO_API_URL = `http://127.0.0.1:${port}/geo`;
  process.env.ANNUAIRE_API_URL = `http://127.0.0.1:${port}/annuaire`;
  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
});

afterAll(async () => {
  await teardownStrapi();
  publicData.close();
  delete process.env.GEO_API_URL;
  delete process.env.ANNUAIRE_API_URL;
});

describe('recherche publique', () => {
  it('trouve la commune sans être connecté', async () => {
    const { body } = await api.get('/api/signup/communes?q=Saint-Pierre');
    expect(body.data).toEqual([expect.objectContaining({ insee: '58264', name: 'Saint-Pierre-le-Moûtier', taken: false })]);
  });
});

describe('demande', () => {
  it('confirmation envoyée à l’adresse officielle de la mairie, pas à l’adresse saisie', async () => {
    sentEmails.length = 0;
    const res = await signup({ insee: '58264', email: 'julie@gmail.test' });
    expect(res.status).toBe(202);
    expect(res.body.data).toEqual({ status: 'sent', to: 'm***@saintpierrelemoutier.fr' });
    expect(sentEmails.map((message) => message.to)).toEqual(['mairie@saintpierrelemoutier.fr']);
    expect(String(sentEmails[0]!.text)).toContain('Julie Secrétaire (julie@gmail.test)');
    // Rien n'est créé avant la confirmation
    expect(await strapi.query('api::site.site').count({ where: { code_insee: '58264' } })).toBe(0);
  });

  it('commune corse (code INSEE 2A…) acceptée', async () => {
    sentEmails.length = 0;
    const res = await signup({ insee: '2A004', email: 'accueil@ajaccio.test' });
    expect(res.body.data.status).toBe('sent');
    expect(sentEmails[0]!.to).toBe('contact@ville-ajaccio.fr');
  });

  it('sans adresse officielle connue : vérification par l’équipe, aucun e-mail au demandeur', async () => {
    sentEmails.length = 0;
    process.env.SIGNUP_NOTIFY_EMAIL = 'equipe@communeo.test';
    const res = await signup({ insee: '58100', email: 'mairie@sans-annuaire.test' });
    delete process.env.SIGNUP_NOTIFY_EMAIL;
    expect(res.body.data).toEqual({ status: 'review' });
    expect(sentEmails.map((message) => message.to)).toEqual(['equipe@communeo.test']);
    const pending = await strapi.db.query('api::signup-request.signup-request').findOne({ where: { code_insee: '58100' } });
    expect(pending.status).toBe('awaiting_review');
  });

  it('champs obligatoires, conditions acceptées, piège à robots silencieux', async () => {
    expect((await signup({ insee: '58264', email: 'pas-un-email' })).status).toBe(400);
    expect((await signup({ insee: '58264', email: 'julie@gmail.test', terms: false })).status).toBe(400);
    sentEmails.length = 0;
    const trap = await signup({ insee: '58264', email: 'robot@spam.test', website: 'http://spam' });
    expect(trap.status).toBe(202);
    expect(sentEmails).toHaveLength(0);
    expect(await strapi.db.query('api::signup-request.signup-request').count({ where: { email: 'robot@spam.test' } })).toBe(0);
  });
});

describe('confirmation', () => {
  it('crée la commune et son administrateur, invité à choisir son mot de passe ; lien à usage unique', async () => {
    sentEmails.length = 0;
    await signup({ insee: '58264', email: 'julie@gmail.test' });
    const jeton = lastLink()!;

    const info = await api.get(`/api/signup/confirm?jeton=${jeton}`);
    expect(info.body.data).toEqual({ commune: 'Saint-Pierre-le-Moûtier', firstName: 'Julie', lastName: 'Secrétaire', email: 'julie@gmail.test' });

    const confirmed = await api.post('/api/signup/confirm').send({ jeton });
    expect(confirmed.status).toBe(200);
    const site: any = await strapi.query('api::site.site').findOne({ where: { code_insee: '58264' } });
    expect(site).toMatchObject({ name: 'Saint-Pierre-le-Moûtier', slug: 'saint-pierre-le-moutier', contact_mail: 'mairie@saintpierrelemoutier.fr', onboarding: { step: 1 }, plan: 'trial' });
    // 30 jours d'essai à partir de la confirmation
    expect(new Date(site.trial_ends_at).getTime() - Date.now()).toBeGreaterThan(29.9 * 86_400_000);
    expect(new Date(site.trial_ends_at).getTime() - Date.now()).toBeLessThanOrEqual(30 * 86_400_000);
    const user: any = await strapi.query('plugin::users-permissions.user').findOne({ where: { email: 'julie@gmail.test' }, populate: ['site'] });
    expect(user).toMatchObject({ municipality_role: 'admin', blocked: true, first_name: 'Julie' });
    expect(user.site.id).toBe(site.id);

    // L'invitation renvoyée active le compte : même parcours qu'une invitation classique
    const invitation = confirmed.body.data.invitation;
    const accepted = await api.post('/api/user-management/accept-invitation').send({ token: invitation, password: 'Loire-et-Nievre-2026', passwordConfirmation: 'Loire-et-Nievre-2026' });
    expect(accepted.status).toBe(200);
    const login = await api.post('/api/session/login').send({ identifier: 'julie@gmail.test', password: 'Loire-et-Nievre-2026' });
    expect(login.status).toBe(200);

    // Le lien ne sert qu'une fois
    expect((await api.post('/api/signup/confirm').send({ jeton })).status).toBe(400);
  });

  it('commune déjà sur Communeo : nouvelle demande refusée, recherche marquée', async () => {
    expect((await signup({ insee: '58264', email: 'autre@gmail.test' })).status).toBe(409);
    const { body } = await api.get('/api/signup/communes?q=Saint-Pierre');
    expect(body.data[0].taken).toBe(true);
  });

  it('lien inconnu ou mal formé refusé', async () => {
    expect((await api.get('/api/signup/confirm?jeton=abc')).status).toBe(400);
    expect((await api.post('/api/signup/confirm').send({ jeton: `${'a'.repeat(64)}.${Date.now() + 1000}` })).status).toBe(400);
  });
});

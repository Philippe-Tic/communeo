/**
 * Inscription d'une mairie en libre-service (#309, #337) : le lien part à l'adresse saisie ; au clic,
 * la commune est créée en essai et le demandeur choisit son mot de passe. La mairie approuve ensuite
 * depuis son adresse officielle (Annuaire de l'administration, simulé par un serveur local), sauf si
 * le demandeur utilise cette adresse ou son domaine ; sans adresse officielle, l'équipe vérifie. En
 * attendant, le site d'essai est publié (#369) ; refusée, la commune est supprimée et son site retiré.
 */
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let publicData: http.Server;
let superAdmin: string;

const REQUEST = 'api::signup-request.signup-request';
const SITE = 'api::site.site';
const USER = 'plugin::users-permissions.user';
const PASSWORD = 'Loire-et-Nievre-2026';

const COMMUNES: Record<string, { nom: string; codesPostaux: string[]; hall: Record<string, unknown> | null }> = {
  '58264': {
    nom: 'Saint-Pierre-le-Moûtier',
    codesPostaux: ['58240'],
    hall: { nom: 'Mairie - Saint-Pierre-le-Moûtier', adresse_courriel: 'mairie@saintpierrelemoutier.fr' },
  },
  '2A004': { nom: 'Ajaccio', codesPostaux: ['20000'], hall: { nom: 'Mairie - Ajaccio', adresse_courriel: 'contact@ville-ajaccio.fr' } },
  '58095': { nom: 'Decize', codesPostaux: ['58300'], hall: { nom: 'Mairie - Decize', adresse_courriel: 'mairie@decize.test' } },
  '58086': { nom: 'Cosne', codesPostaux: ['58200'], hall: { nom: 'Mairie - Cosne', adresse_courriel: 'accueil@mairie-cosne.test' } },
  '58100': { nom: 'Sans-Annuaire', codesPostaux: ['58100'], hall: null },
  '58101': { nom: 'Sans-Annuaire-Bis', codesPostaux: ['58101'], hall: null },
  '58102': { nom: 'Essai-sur-Loire', codesPostaux: ['58102'], hall: { nom: 'Mairie - Essai-sur-Loire', adresse_courriel: 'mairie@essai-sur-loire.test' } },
};

const geo = (code: string) => ({
  nom: COMMUNES[code]!.nom,
  code,
  codesPostaux: COMMUNES[code]!.codesPostaux,
  population: 1000,
  centre: { type: 'Point', coordinates: [3, 46] },
  departement: { code: code.slice(0, 2), nom: 'Test' },
});

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// Une adresse IP par demande : la limite de 10 demandes par heure et par IP n'est pas l'objet de ces tests
let client = 0;
const signup = (body: Record<string, unknown>) =>
  api
    .post('/api/signup')
    .set('X-Forwarded-For', `203.0.113.${(client += 1)}`)
    .send({ first_name: 'Julie', last_name: 'Secrétaire', terms: true, ...body });

/** Jeton du lien envoyé dans le dernier e-mail à `to` */
const linkTo = (to: string) => /jeton=([a-f0-9]{64}\.\d{13})/.exec(String(sentEmails.filter((mail) => mail.to === to).at(-1)?.text))?.[1];

/** Demande, confirmation de l'adresse et choix du mot de passe : la commune et le JWT de son administrateur */
async function signupAndConfirm(insee: string, email: string) {
  await signup({ insee, email });
  const confirmed = await api.post('/api/signup/confirm').send({ jeton: linkTo(email) });
  expect(confirmed.status).toBe(200);
  const accepted = await api
    .post('/api/user-management/accept-invitation')
    .send({ token: confirmed.body.data.invitation, password: PASSWORD, passwordConfirmation: PASSWORD });
  expect(accepted.status).toBe(200);
  const jwt: string = (await api.post('/api/auth/local').send({ identifier: email, password: PASSWORD })).body.jwt;
  const site: any = await strapi.db.query(SITE).findOne({ where: { code_insee: insee } });
  return { site, jwt, approval: confirmed.body.data.approval as string | null };
}

const withTeamAddress = async <T>(fn: () => Promise<T>) => {
  process.env.SIGNUP_NOTIFY_EMAIL = 'equipe@communeo.test';
  try {
    return await fn();
  } finally {
    delete process.env.SIGNUP_NOTIFY_EMAIL;
  }
};

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
  superAdmin = (await api.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
});

afterAll(async () => {
  await teardownStrapi();
  publicData.close();
  delete process.env.GEO_API_URL;
  delete process.env.ANNUAIRE_API_URL;
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe('recherche publique', () => {
  it('trouve la commune sans être connecté', async () => {
    const { body } = await api.get('/api/signup/communes?q=Saint-Pierre');
    expect(body.data).toEqual([expect.objectContaining({ insee: '58264', name: 'Saint-Pierre-le-Moûtier', taken: false })]);
  });
});

describe('demande', () => {
  it('le lien part à l’adresse saisie ; rien n’est créé avant le clic', async () => {
    const res = await signup({ insee: '58264', email: 'julie@gmail.test' });
    expect(res.status).toBe(202);
    expect(res.body.data).toEqual({ status: 'sent', to: 'julie@gmail.test' });
    expect(sentEmails.map((message) => message.to)).toEqual(['julie@gmail.test']);
    expect(sentEmails[0]!.subject).toMatch(/Confirmez votre adresse/);
    expect(await strapi.query(SITE).count({ where: { code_insee: '58264' } })).toBe(0);
    expect(await strapi.db.query(REQUEST).findOne({ where: { code_insee: '58264' } })).toMatchObject({ status: 'pending_email', official_email: 'mairie@saintpierrelemoutier.fr' });
  });

  it('une nouvelle demande pour la même commune remplace celle qui n’est pas confirmée', async () => {
    await signup({ insee: '58264', email: 'julie@gmail.test' });
    expect(await strapi.db.query(REQUEST).count({ where: { code_insee: '58264' } })).toBe(1);
  });

  it('commune corse (code INSEE 2A…) acceptée', async () => {
    const res = await signup({ insee: '2A004', email: 'accueil@ajaccio.test' });
    expect(res.body.data.status).toBe('sent');
  });

  it('champs obligatoires, conditions acceptées, piège à robots silencieux', async () => {
    expect((await signup({ insee: '58264', email: 'pas-un-email' })).status).toBe(400);
    expect((await signup({ insee: '58264', email: 'julie@gmail.test', terms: false })).status).toBe(400);
    sentEmails.length = 0;
    const trap = await signup({ insee: '58264', email: 'robot@spam.test', website: 'http://spam' });
    expect(trap.status).toBe(202);
    expect(sentEmails).toHaveLength(0);
    expect(await strapi.db.query(REQUEST).count({ where: { email: 'robot@spam.test' } })).toBe(0);
  });

  it('lien inconnu ou mal formé refusé', async () => {
    expect((await api.get('/api/signup/confirm?jeton=abc')).status).toBe(400);
    expect((await api.post('/api/signup/confirm').send({ jeton: `${'a'.repeat(64)}.${Date.now() + 1000}` })).status).toBe(400);
    expect((await api.post('/api/signup/approve').send({ jeton: `${'a'.repeat(64)}.${Date.now() + 1000}` })).status).toBe(400);
  });
});

describe('adresse confirmée, la mairie doit approuver', () => {
  let site: any;
  let jwt: string;
  let approvalLink: string;

  it('la commune est créée en essai, le demandeur choisit son mot de passe ; la mairie reçoit la demande', async () => {
    await signup({ insee: '58264', email: 'julie@gmail.test' });
    const jeton = linkTo('julie@gmail.test')!;
    const info = await api.get(`/api/signup/confirm?jeton=${jeton}`);
    expect(info.body.data).toEqual({ commune: 'Saint-Pierre-le-Moûtier', firstName: 'Julie', lastName: 'Secrétaire', email: 'julie@gmail.test' });

    const confirmed = await withTeamAddress(() => api.post('/api/signup/confirm').send({ jeton }));
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.approval).toBe('townhall');
    // Le lien de l'adresse ne sert qu'une fois
    expect((await api.post('/api/signup/confirm').send({ jeton })).status).toBe(400);

    site = await strapi.db.query(SITE).findOne({ where: { code_insee: '58264' } });
    expect(site).toMatchObject({ name: 'Saint-Pierre-le-Moûtier', contact_mail: 'mairie@saintpierrelemoutier.fr', plan: 'trial', signup_approval: 'townhall', onboarding: { step: 1 } });
    expect(new Date(site.trial_ends_at).getTime() - Date.now()).toBeGreaterThan(29.9 * 86_400_000);

    const approval = sentEmails.find((mail) => mail.to === 'mairie@saintpierrelemoutier.fr');
    expect(approval?.subject).toMatch(/Approuver la création du site/);
    expect(approval?.text).toContain('Julie Secrétaire (julie@gmail.test)');
    expect(approval?.text).toMatch(/inscription\/approuver\?jeton=/);
    expect(sentEmails.find((mail) => mail.to === 'equipe@communeo.test')?.subject).toBe('Nouvelle commune en essai : Saint-Pierre-le-Moûtier');

    // Le lien d'approbation ne donne pas le compte : c'est le demandeur qui choisit son mot de passe
    const accepted = await api.post('/api/user-management/accept-invitation').send({ token: confirmed.body.data.invitation, password: PASSWORD, passwordConfirmation: PASSWORD });
    expect(accepted.status).toBe(200);
    jwt = (await api.post('/api/auth/local').send({ identifier: 'julie@gmail.test', password: PASSWORD })).body.jwt;
    expect(jwt).toBeTruthy();
  });

  it('en attendant : le site d’essai est mis en ligne, sans indexation, ni domaine, ni passage en live', async () => {
    const state = await api.get('/api/signup/approval').set(auth(jwt));
    expect(state.body.data).toEqual({ status: 'townhall', to: 'm***@saintpierrelemoutier.fr', sentAt: expect.any(String) });

    expect((await api.put(`/api/sites/${site.documentId}`).set(auth(jwt)).send({ data: { name: 'Saint-Pierre-le-Moûtier' } })).status).toBe(200);
    // « Mettre en ligne » n'attend plus l'approbation (ici, seule la file des builds manque : 503)
    const trigger = await api.post('/api/deployment/trigger').set(auth(jwt));
    expect(trigger.status).toBe(503);
    expect(trigger.body.error.details?.code).toBeUndefined();

    // Le worker construit le site d'essai : bandeau « Site en préparation » et jamais indexé
    const worker = await api
      .post('/api/build-worker/jobs/job-attente/start')
      .set(auth('test-worker-secret'))
      .send({ siteDocumentId: site.documentId, triggeredBy: null, attempt: 0 });
    expect(worker.status).toBe(200);
    expect(worker.body.site).toMatchObject({ documentId: site.documentId, noindex: true });

    // Garde-fous de l'essai : pas de domaine personnalisé ; le site reste en essai
    const domain = await api.post('/api/domain/configure').set(auth(jwt)).send({ customDomain: 'saintpierrelemoutier.fr' });
    expect(domain.status).toBe(403);
    expect(domain.body.error.details).toEqual({ code: 'live_only' });
    expect((await strapi.db.query(SITE).findOne({ where: { id: site.id } })).plan).toBe('trial');

    // La commune ne lève pas elle-même l'attente
    await api.put(`/api/sites/${site.documentId}`).set(auth(jwt)).send({ data: { signup_approval: null } });
    expect((await strapi.db.query(SITE).findOne({ where: { id: site.id } })).signup_approval).toBe('townhall');
  });

  it('renvoyer la demande : nouveau lien, l’ancien ne vaut plus', async () => {
    const old = linkTo('mairie@saintpierrelemoutier.fr');
    sentEmails.length = 0;
    const resent = await api.post('/api/signup/approval/resend').set(auth(jwt));
    expect(resent.status).toBe(200);
    expect(resent.body.data.to).toBe('m***@saintpierrelemoutier.fr');
    const fresh = linkTo('mairie@saintpierrelemoutier.fr');
    expect(fresh).toBeTruthy();
    expect(fresh).not.toBe(old);
    expect((await api.get(`/api/signup/approve?jeton=${old}`)).status).toBe(400);
    approvalLink = fresh!;
  });

  it('la mairie approuve : l’essai continue, le demandeur est prévenu ; lien à usage unique', async () => {
    const jeton = approvalLink;
    const info = await api.get(`/api/signup/approve?jeton=${jeton}`);
    expect(info.body.data).toEqual({ commune: 'Saint-Pierre-le-Moûtier', firstName: 'Julie', lastName: 'Secrétaire', email: 'julie@gmail.test' });
    // Ouvrir le lien (antivirus de messagerie) n'approuve rien
    expect((await strapi.db.query(SITE).findOne({ where: { id: site.id } })).signup_approval).toBe('townhall');

    expect((await api.post('/api/signup/approve').send({ jeton })).status).toBe(200);
    expect((await strapi.db.query(SITE).findOne({ where: { id: site.id } })).signup_approval).toBeNull();
    expect(await strapi.db.query(REQUEST).findOne({ where: { code_insee: '58264', status: 'confirmed' } })).toMatchObject({ approval: 'townhall', approval_token: null });
    expect(sentEmails.find((mail) => mail.to === 'julie@gmail.test')?.subject).toMatch(/Création du site .* approuvée/);
    expect(await strapi.db.query('api::activity-log.activity-log').count({ where: { action: 'signup_approve' } })).toBe(1);

    expect((await api.get('/api/signup/approval').set(auth(jwt))).body.data.status).toBeNull();
    expect((await api.post('/api/signup/approve').send({ jeton })).status).toBe(400);
    expect((await api.post('/api/signup/approval/resend').set(auth(jwt))).status).toBe(400);
  });

  it('commune déjà sur Communeo : nouvelle demande refusée, recherche marquée', async () => {
    expect((await signup({ insee: '58264', email: 'autre@gmail.test' })).status).toBe(409);
    const { body } = await api.get('/api/signup/communes?q=Saint-Pierre');
    expect(body.data[0].taken).toBe(true);
  });
});

describe('la mairie refuse', () => {
  // Hébergeur local (PUBLISH_DIR) : le site d'essai y est créé dès l'inscription (#369)
  let publishDir: string;
  beforeAll(() => {
    publishDir = fs.mkdtempSync(path.join(os.tmpdir(), 'communeo-signup-'));
    process.env.PUBLISH_DIR = publishDir;
  });
  afterAll(() => {
    delete process.env.PUBLISH_DIR;
    fs.rmSync(publishDir, { recursive: true, force: true });
  });

  it('la commune créée, ses comptes, ses contenus et son site d’essai sont supprimés ; le demandeur est prévenu', async () => {
    const { site } = await signupAndConfirm('2A004', 'usurpateur@gmail.test');
    // Le site d'essai existe chez l'hébergeur avant toute réponse de la mairie
    expect(site.signup_approval).toBe('townhall');
    expect(site.netlify_site_id).toBe(site.slug);
    expect(fs.existsSync(path.join(publishDir, site.slug))).toBe(true);

    const jeton = linkTo('contact@ville-ajaccio.fr')!;
    const declined = await withTeamAddress(() => api.post('/api/signup/decline').send({ jeton }));
    expect(declined.status).toBe(200);

    expect(fs.existsSync(path.join(publishDir, site.slug))).toBe(false);
    expect(await strapi.db.query(SITE).count({ where: { id: site.id } })).toBe(0);
    expect(await strapi.db.query(USER).count({ where: { email: 'usurpateur@gmail.test' } })).toBe(0);
    expect(await strapi.db.query(REQUEST).findOne({ where: { code_insee: '2A004' } })).toMatchObject({ status: 'rejected', reviewed_by: 'mairie', approval_token: null });
    const mail = sentEmails.find((email) => email.to === 'usurpateur@gmail.test' && /Votre demande/.test(email.subject));
    expect(mail?.text).toMatch(/n'a pas approuvé/);
    expect(mail?.text).toContain("le site d'essai a été retiré");
    expect(sentEmails.find((email) => email.to === 'equipe@communeo.test')?.subject).toBe('Inscription refusée : Ajaccio');
    // La commune est de nouveau libre, et le lien ne sert plus
    expect((await signup({ insee: '2A004', email: 'mairie.ajaccio@gmail.test' })).status).toBe(202);
    expect((await api.post('/api/signup/approve').send({ jeton })).status).toBe(400);
  });

  it('refus pendant une mise en ligne : le site publié ensuite par le worker est retiré', async () => {
    // La commune et son enregistrement Deployment ont disparu ; le worker annonce la fin de son build
    fs.mkdirSync(path.join(publishDir, 'ajaccio'), { recursive: true });
    const finish = await api
      .post('/api/build-worker/jobs/job-commune-supprimee/finish')
      .set(auth('test-worker-secret'))
      .send({ status: 'ready', buildSeconds: 12, deployId: 'local-1', hostId: 'ajaccio', defaultUrl: 'http://localhost:8080/ajaccio' });
    expect(finish.status).toBe(404);
    expect(fs.existsSync(path.join(publishDir, 'ajaccio'))).toBe(false);

    // Un site chez l'hébergeur encore rattaché à une commune n'est jamais retiré ainsi
    const other: any = await strapi.db.query(SITE).findOne({ where: { code_insee: '58264' } });
    fs.mkdirSync(path.join(publishDir, other.netlify_site_id ?? other.slug), { recursive: true });
    if (!other.netlify_site_id) await strapi.db.query(SITE).update({ where: { id: other.id }, data: { netlify_site_id: other.slug } });
    await api
      .post('/api/build-worker/jobs/job-inconnu/finish')
      .set(auth('test-worker-secret'))
      .send({ status: 'ready', buildSeconds: 1, hostId: other.netlify_site_id ?? other.slug });
    expect(fs.existsSync(path.join(publishDir, other.netlify_site_id ?? other.slug))).toBe(true);
  });
});

describe('rien à approuver', () => {
  it('inscrit avec l’adresse officielle de la mairie : aucune demande à la mairie', async () => {
    const { site, approval } = await signupAndConfirm('58095', 'mairie@decize.test');
    expect(approval).toBeNull();
    expect(site.signup_approval).toBeNull();
    expect(await strapi.db.query(REQUEST).findOne({ where: { code_insee: '58095' } })).toMatchObject({ status: 'confirmed', approval: 'same_email' });
    expect(sentEmails.filter((mail) => /Approuver/.test(mail.subject))).toHaveLength(0);
  });

  it('inscrit avec une adresse du domaine de la mairie : aucune demande à la mairie', async () => {
    const { site } = await signupAndConfirm('58086', 'secretariat@mairie-cosne.test');
    expect(site.signup_approval).toBeNull();
    expect(await strapi.db.query(REQUEST).findOne({ where: { code_insee: '58086' } })).toMatchObject({ status: 'confirmed', approval: 'same_domain' });
  });
});

describe('sans adresse officielle : l’équipe vérifie', () => {
  it('la commune est créée en attente ; l’équipe est prévenue, puis approuve', async () => {
    const { site, jwt, approval } = await withTeamAddress(() => signupAndConfirm('58100', 'mairie@sans-annuaire.test'));
    expect(approval).toBe('team');
    expect(site.signup_approval).toBe('team');
    expect(sentEmails.find((mail) => mail.to === 'equipe@communeo.test')?.subject).toBe('Inscription à vérifier : Sans-Annuaire');
    expect((await api.get('/api/signup/approval').set(auth(jwt))).body.data).toEqual({ status: 'team', to: null, sentAt: null });
    // Le site d'essai peut être mis en ligne pendant la vérification (ici, sans file des builds : 503)
    expect((await api.post('/api/deployment/trigger').set(auth(jwt))).status).toBe(503);

    const [pending] = (await api.get('/api/validations').set(auth(superAdmin))).body.data.signups;
    expect(pending).toMatchObject({ communeName: 'Sans-Annuaire', waitingFor: 'team', siteDocumentId: site.documentId });
    expect((await api.post(`/api/validations/signups/${pending.id}/approve`).set(auth(superAdmin))).status).toBe(200);
    expect((await strapi.db.query(SITE).findOne({ where: { id: site.id } })).signup_approval).toBeNull();
    expect(sentEmails.find((mail) => mail.to === 'mairie@sans-annuaire.test' && /Création du site .* approuvée/.test(mail.subject))).toBeTruthy();
    expect((await api.get('/api/validations').set(auth(superAdmin))).body.data.signups).toEqual([]);
  });

  it('l’équipe refuse : la commune est supprimée, le motif envoyé au demandeur', async () => {
    const { site } = await signupAndConfirm('58101', 'paul@sans-annuaire-bis.test');
    const [pending] = (await api.get('/api/validations').set(auth(superAdmin))).body.data.signups;
    const res = await api.post(`/api/validations/signups/${pending.id}/reject`).set(auth(superAdmin)).send({ reason: 'Nous n’avons pas pu joindre la mairie.' });
    expect(res.body.data).toEqual({ emailed: true });
    expect(await strapi.db.query(SITE).count({ where: { id: site.id } })).toBe(0);
    const mail = sentEmails.find((email) => email.to === 'paul@sans-annuaire-bis.test' && /Votre demande/.test(email.subject));
    expect(mail?.text).toContain('Nous n’avons pas pu joindre la mairie.');
    expect(mail?.text).toContain('retiré et ses contenus supprimés');
  });
});

describe('inscription de test de l’équipe (SIGNUP_TEST_EMAILS)', () => {
  it('rien ne part vers la vraie mairie : l’équipe approuve, le site a l’adresse du testeur', async () => {
    process.env.SIGNUP_TEST_EMAILS = 'autre@exemple.test, @essai-communeo.test';
    try {
      const { site, jwt, approval } = await withTeamAddress(() => signupAndConfirm('58102', 'philippe@essai-communeo.test'));
      expect(await strapi.db.query(REQUEST).findOne({ where: { code_insee: '58102' } })).toMatchObject({ official_email: null, status: 'awaiting_review' });
      expect(approval).toBe('team');
      expect(site).toMatchObject({ signup_approval: 'team', contact_mail: 'philippe@essai-communeo.test', plan: 'trial' });
      expect(sentEmails.filter((mail) => mail.to === 'mairie@essai-sur-loire.test')).toHaveLength(0);
      expect(sentEmails.find((mail) => mail.to === 'equipe@communeo.test' && /Essai-sur-Loire/.test(mail.subject))?.subject).toBe('Inscription de test : Essai-sur-Loire');
      // L'assistant ne propose pas l'e-mail de la mairie comme contact du site de test
      const details = await api.get('/api/onboarding/communes/58102').set(auth(jwt));
      expect(details.status).toBe(200);
      expect(details.body.data.townHall.email).toBeNull();
      expect(details.body.data.name).toBe('Essai-sur-Loire');
    } finally {
      delete process.env.SIGNUP_TEST_EMAILS;
    }
  });
});

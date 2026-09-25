/**
 * Période d'essai (#310) : rappels à J-7 et J-1, fin de l'essai (site retiré, administration en
 * lecture seule, plus aucune mise en ligne), demande de passage en live, prolongation et passage en
 * live par l'équipe, suppression des données 6 mois après la fin de l'essai.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { addDays } from '@communeo/core';
import { processTrials } from '../src/services/trial';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let superAdmin: string;
let siteA: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const SITE = 'api::site.site';

const site = () => strapi.db.query(SITE).findOne({ where: { documentId: siteA } }) as Promise<any>;
const setSite = (data: Record<string, unknown>) => strapi.db.query(SITE).update({ where: { documentId: siteA }, data });
const emailsTo = (to: string) => sentEmails.filter((email) => email.to === to);

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  superAdmin = (await http.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth(admin))).body.site.documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe('essai en cours', () => {
  const now = new Date('2026-10-01T08:00:00Z');

  it('une commune créée par l’équipe est en live', async () => {
    expect((await site()).plan).toBe('live');
  });

  it('rappels à J-7 puis J-1, une seule fois chacun', async () => {
    await setSite({ plan: 'trial', trial_ends_at: addDays(now, 6.5), trial_notice: null });
    await processTrials(now);
    expect(emailsTo('test@example.com')).toHaveLength(1);
    expect(emailsTo('test@example.com')[0]!.subject).toMatch(/se termine dans 7 jours/);
    expect((await site()).trial_notice).toBe('reminder_7');
    await processTrials(now);
    expect(emailsTo('test@example.com')).toHaveLength(1);

    await processTrials(addDays(now, 6));
    expect(emailsTo('test@example.com')).toHaveLength(2);
    expect(emailsTo('test@example.com')[1]!.subject).toMatch(/se termine demain/);
    expect(emailsTo('test@example.com')[1]!.text).toContain('/passer-en-live');
    await processTrials(addDays(now, 6.2));
    expect(emailsTo('test@example.com')).toHaveLength(2);
  });

  it('l’essai et sa date ne se modifient pas depuis l’administration de la commune', async () => {
    const res = await http.put(`/api/sites/${siteA}`).set(auth(admin)).send({ data: { plan: 'live', trial_ends_at: '2030-01-01T00:00:00.000Z' } });
    expect(res.status).toBe(200);
    expect(await site()).toMatchObject({ plan: 'trial' });
    expect(new Date((await site()).trial_ends_at).getTime()).toBe(addDays(now, 6.5).getTime());
  });

  it('pendant l’essai, la commune modifie son site normalement', async () => {
    const res = await http.post('/api/pages').set(auth(admin)).send({ data: { title: 'Pendant l’essai' } });
    expect(res.status).toBe(201);
  });
});

describe('site d’essai (#311)', () => {
  it('le build d’une commune en essai n’est pas indexé ; en live, si', async () => {
    const start = (jobId: string) =>
      http.post(`/api/build-worker/jobs/${jobId}/start`).set(auth('test-worker-secret')).send({ siteDocumentId: siteA, triggeredBy: null, reason: 'manual', attempt: 0 });
    expect((await start('job-essai')).body.site).toMatchObject({ noindex: true });
    await setSite({ plan: 'live' });
    expect((await start('job-live')).body.site).toMatchObject({ noindex: false });
    await setSite({ plan: 'trial' });
  });

  it('domaine personnalisé réservé aux communes en live, y compris pour l’équipe', async () => {
    const res = await http.post('/api/domain/configure').set(auth(admin)).send({ customDomain: 'mairie-essai.fr' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/une fois le site passé en live/);
    expect(res.body.error.details).toEqual({ code: 'live_only' });
    const team = await http.post('/api/domain/configure').set({ ...auth(superAdmin), 'X-Site-Document-Id': siteA }).send({ customDomain: 'mairie-essai.fr' });
    expect(team.status).toBe(403);
  });

  it('adresses réservées à Communeo refusées pour une nouvelle commune', async () => {
    expect((await http.get('/api/site-management/slug-available?slug=doc').set(auth(superAdmin))).body).toEqual({ available: false, reason: 'Adresse réservée à Communeo' });
    const created = await http.post('/api/site-management').set(auth(superAdmin)).send({
      data: { name: 'Démo', slug: 'demo', admin_email: 'maire@demo.test', admin_first_name: 'A', admin_last_name: 'B' },
    });
    expect(created.status).toBe(400);
  });
});

describe('fin de l’essai', () => {
  const now = new Date('2026-10-01T08:00:00Z');

  beforeAll(async () => {
    await setSite({ plan: 'trial', trial_ends_at: addDays(now, -0.01), trial_notice: 'reminder_1', live_url: 'https://essai.netlify.app' });
  });

  it('site retiré, e-mail aux administrateurs, trace dans le journal', async () => {
    await processTrials(now);
    const expired = await site();
    expect(expired).toMatchObject({ plan: 'expired', trial_notice: 'expired', live_url: null });
    expect(new Date(expired.trial_expired_at).getTime()).toBe(now.getTime());
    const [mail] = emailsTo('test@example.com');
    expect(mail!.subject).toMatch(/essai de Communeo est terminé/);
    expect(mail!.text).toContain("Vos contenus sont conservés jusqu'au");
    expect(await strapi.db.query('api::activity-log.activity-log').count({ where: { action: 'trial_expire' } })).toBe(1);
  });

  it('administration en lecture seule : lecture permise, écritures refusées avec une explication', async () => {
    expect((await http.get('/api/pages').set(auth(admin))).status).toBe(200);
    expect((await http.get(`/api/sites/${siteA}`).set(auth(admin))).status).toBe(200);
    const write = await http.post('/api/pages').set(auth(admin)).send({ data: { title: 'Après l’essai' } });
    expect(write.status).toBe(403);
    expect(write.body.error.message).toMatch(/période d'essai est terminée/);
    expect(write.body.error.details).toEqual({ code: 'trial_expired' });
    expect((await http.put(`/api/sites/${siteA}`).set(auth(admin)).send({ data: { name: 'Autre nom' } })).status).toBe(403);
    expect((await http.post('/api/user-management').set(auth(admin)).send({ email: 'nouveau@example.test' })).status).toBe(403);
  });

  it('plus aucune mise en ligne, même par l’équipe ; un build déjà dans la file est annulé', async () => {
    expect((await http.post('/api/deployment/trigger').set(auth(admin))).status).toBe(403);
    const team = await http.post('/api/deployment/trigger').set({ ...auth(superAdmin), 'X-Site-Document-Id': siteA });
    expect(team.status).toBe(403);
    expect(team.body.error.details).toEqual({ code: 'trial_expired' });

    const start = await http
      .post('/api/build-worker/jobs/job-apres-essai/start')
      .set(auth('test-worker-secret'))
      .send({ siteDocumentId: siteA, triggeredBy: null, reason: 'content', attempt: 0 });
    expect(start.status).toBe(200);
    expect(start.body).toEqual({ cancelled: 'essai terminé' });
    expect(await strapi.db.query('api::deployment.deployment').count({ where: { job_id: 'job-apres-essai' } })).toBe(0);
  });

  it('son compte et la demande de passage en live restent possibles ; l’équipe est prévenue', async () => {
    expect((await http.put('/api/user-management/me').set(auth(admin)).send({ first_name: 'Test' })).status).toBe(200);

    process.env.SIGNUP_NOTIFY_EMAIL = 'equipe@communeo.test';
    try {
      const res = await http.post('/api/trial/live-request').set(auth(admin));
      expect(res.status).toBe(200);
      expect(res.body.data.liveRequestedAt).toBeTruthy();
    } finally {
      delete process.env.SIGNUP_NOTIFY_EMAIL;
    }
    const [mail] = emailsTo('equipe@communeo.test');
    expect(mail!.subject).toBe(`Passage en live demandé : ${(await site()).name}`);
    expect(mail!.text).toContain('/plateforme/a-valider');
    expect((await site()).live_requested_at).toBeTruthy();
  });

  it('l’équipe garde la main sur l’administration de la commune', async () => {
    const res = await http.post('/api/pages').set({ ...auth(superAdmin), 'X-Site-Document-Id': siteA }).send({ data: { title: 'Corrigée par l’équipe' } });
    expect(res.status).toBe(201);
  });

  it('rappel un mois avant la suppression des données', async () => {
    await processTrials(addDays(now, 150));
    expect(emailsTo('test@example.com')).toHaveLength(0);
    await processTrials(addDays(now, 154));
    const [mail] = emailsTo('test@example.com');
    expect(mail!.subject).toMatch(/seront supprimées le/);
    expect((await site()).trial_notice).toBe('deletion');
    await processTrials(addDays(now, 155));
    expect(emailsTo('test@example.com')).toHaveLength(1);
  });
});

describe('espace équipe', () => {
  it('prolonger un essai terminé : essai rouvert à partir d’aujourd’hui, lecture seule levée', async () => {
    const before = Date.now();
    const res = await http.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ data: { extendTrialDays: 15 } });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ plan: 'trial', trialExpiredAt: null });
    const endsAt = new Date(res.body.data.trialEndsAt).getTime();
    expect(endsAt).toBeGreaterThanOrEqual(before + 15 * 86_400_000);
    expect(endsAt).toBeLessThan(Date.now() + 15 * 86_400_000 + 1000);
    expect((await http.post('/api/pages').set(auth(admin)).send({ data: { title: 'Essai rouvert' } })).status).toBe(201);
  });

  it('prolonger un essai en cours : à partir de sa fin prévue ; durée bornée', async () => {
    const endsAt = new Date((await site()).trial_ends_at).getTime();
    const res = await http.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ data: { extendTrialDays: 7 } });
    expect(new Date(res.body.data.trialEndsAt).getTime()).toBe(endsAt + 7 * 86_400_000);
    for (const days of [0, 91, 2.5, '7'])
      expect((await http.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ data: { extendTrialDays: days } })).status).toBe(400);
    expect(await strapi.db.query('api::activity-log.activity-log').count({ where: { action: 'trial_extend' } })).toBe(2);
  });

  it('réservé à l’équipe', async () => {
    expect((await http.put(`/api/site-management/${siteA}`).set(auth(admin)).send({ data: { plan: 'live' } })).status).toBe(403);
  });

  it('passer en live : fin de l’essai ; plus de demande ni de prolongation possibles', async () => {
    const res = await http.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ data: { plan: 'live' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ plan: 'live', liveRequestedAt: null });
    expect(await strapi.db.query('api::activity-log.activity-log').count({ where: { action: 'commune_go_live' } })).toBe(1);
    expect((await http.post('/api/trial/live-request').set(auth(admin))).status).toBe(409);
    expect((await http.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ data: { extendTrialDays: 7 } })).status).toBe(400);
    expect((await http.put(`/api/site-management/${siteA}`).set(auth(superAdmin)).send({ data: { plan: 'trial' } })).status).toBe(400);
  });
});

describe('suppression 6 mois après la fin de l’essai', () => {
  it('la commune, ses comptes et ses contenus sont supprimés ; le journal garde la trace', async () => {
    const created = await http.post('/api/site-management').set(auth(superAdmin)).send({
      data: { name: 'Commune Oubliée', slug: 'commune-oubliee', admin_email: 'maire@oubliee.test', admin_first_name: 'Anne', admin_last_name: 'Maire' },
    });
    const documentId = created.body.data.documentId;
    const page = await strapi.documents('api::page.page').create({ data: { title: 'Mairie', site: documentId } as any, status: 'published' });
    await strapi.documents('api::article.article').create({ data: { title: 'Brouillon', site: documentId } as any });
    const expiredAt = new Date('2026-01-01T08:00:00Z');
    await strapi.db.query(SITE).update({ where: { documentId }, data: { plan: 'expired', trial_expired_at: expiredAt, trial_notice: 'deletion' } });

    await processTrials(addDays(expiredAt, 182));
    expect(await strapi.db.query(SITE).count({ where: { documentId } })).toBe(1);

    await processTrials(addDays(expiredAt, 184));
    expect(await strapi.db.query(SITE).count({ where: { documentId } })).toBe(0);
    expect(await strapi.db.query('api::page.page').count({ where: { documentId: page.documentId } })).toBe(0);
    expect(await strapi.db.query('api::article.article').count({ where: { title: 'Brouillon' } })).toBe(0);
    expect(await strapi.db.query('plugin::users-permissions.user').count({ where: { email: 'maire@oubliee.test' } })).toBe(0);
    const trace: any = await strapi.db.query('api::activity-log.activity-log').findOne({ where: { action: 'commune_delete' } });
    expect(trace).toMatchObject({ target_label: 'Commune Oubliée' });
    // Aucune « modification en attente » ni ligne de journal par contenu supprimé
    expect(await strapi.db.query('api::activity-log.activity-log').count({ where: { action: 'delete' } })).toBe(0);
    // La commune de test n'est pas touchée
    expect(await strapi.db.query(SITE).count({ where: { documentId: siteA } })).toBe(1);
  });
});

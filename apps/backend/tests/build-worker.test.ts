/**
 * Routes internes du worker de build et dépôt des demandes de mise en ligne dans la file.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { stopBuildQueue } from '../src/services/build-queue';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let adminUser: { documentId: string };
let siteId: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const worker = auth('test-worker-secret');
const deployments = () =>
  strapi.documents('api::deployment.deployment').findMany({ filters: { site: { documentId: siteId } } as any, populate: ['triggered_by'] });

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  const me = (await http.get('/api/users/me').set(auth(admin))).body;
  adminUser = me;
  siteId = me.site.documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('routes internes du worker', () => {
  it('exigent le secret du worker', async () => {
    const body = { siteDocumentId: siteId, triggeredBy: null, attempt: 0 };
    expect((await http.post('/api/build-worker/jobs/j0/start').send(body)).status).toBe(401);
    expect((await http.post('/api/build-worker/jobs/j0/start').set(auth('mauvais')).send(body)).status).toBe(401);
    // Un utilisateur de commune connecté n'y a pas accès non plus
    expect((await http.post('/api/build-worker/jobs/j0/start').set(auth(admin)).send(body)).status).toBeGreaterThanOrEqual(401);
    expect(await deployments()).toHaveLength(0);
  });

  it('ouvrent un seul enregistrement par job, réutilisé par les nouvelles tentatives', async () => {
    const start = (attempt: number) =>
      http.post('/api/build-worker/jobs/job-1/start').set(worker).send({ siteDocumentId: siteId, triggeredBy: adminUser.documentId, attempt });

    const first = await start(0);
    expect(first.status).toBe(200);
    expect(first.body.site).toEqual({
      documentId: siteId,
      slug: 'test-site',
      name: expect.any(String),
      theme: expect.any(String),
      hostId: null,
      customDomain: null,
    });

    const retry = await start(1);
    expect(retry.body.deploymentId).toBe(first.body.deploymentId);

    const list = await deployments();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ job_id: 'job-1', status: 'building', triggered_by: { documentId: adminUser.documentId } });
  });

  it('marquent comme interrompu un build resté en cours quand un nouveau commence', async () => {
    await http.post('/api/build-worker/jobs/job-2/start').set(worker).send({ siteDocumentId: siteId, triggeredBy: null, attempt: 0 });
    const byJob = Object.fromEntries((await deployments()).map((d: any) => [d.job_id, d]));
    expect(byJob['job-1']).toMatchObject({ status: 'error', error_message: 'Mise en ligne interrompue' });
    expect(byJob['job-2']).toMatchObject({ status: 'building' });
  });

  it("enregistrent le résultat et l'adresse du site", async () => {
    const res = await http.post('/api/build-worker/jobs/job-2/finish').set(worker).send({
      status: 'ready',
      buildSeconds: 12.4,
      deployId: 'netlify-deploy-1',
      hostId: 'netlify-site-1',
      defaultUrl: 'https://dev-test-site-mairie.netlify.app',
    });
    expect(res.status).toBe(200);

    const done = (await deployments()).find((d: any) => d.job_id === 'job-2');
    expect(done).toMatchObject({ status: 'ready', build_time: 12, deployment_id: 'netlify-deploy-1', error_message: null });
    expect(done?.completed_at).toBeTruthy();

    const site: any = await strapi.documents('api::site.site').findOne({ documentId: siteId });
    expect(site).toMatchObject({ netlify_site_id: 'netlify-site-1', live_url: 'https://dev-test-site-mairie.netlify.app' });
  });

  it("enregistrent l'erreur d'un build en échec", async () => {
    await http.post('/api/build-worker/jobs/job-3/start').set(worker).send({ siteDocumentId: siteId, triggeredBy: null, attempt: 0 });
    await http.post('/api/build-worker/jobs/job-3/finish').set(worker).send({ status: 'error', error: 'thème inconnu', buildSeconds: 3 });
    expect((await deployments()).find((d: any) => d.job_id === 'job-3')).toMatchObject({ status: 'error', error_message: 'thème inconnu' });
    expect((await http.post('/api/build-worker/jobs/inconnu/finish').set(worker).send({ status: 'ready', buildSeconds: 1 })).status).toBe(404);
  });
});

it.runIf(process.env.CI && !process.env.TEST_QUEUE_DATABASE_URL)('TEST_QUEUE_DATABASE_URL est défini en CI', () => {
  expect.fail('Les tests de la file doivent tourner en CI : définir TEST_QUEUE_DATABASE_URL (service Postgres)');
});

describe.skipIf(!process.env.TEST_QUEUE_DATABASE_URL)('demande de mise en ligne (file Postgres)', () => {
  it('dépose une seule demande en attente par site', async () => {
    process.env.QUEUE_DATABASE_URL = process.env.TEST_QUEUE_DATABASE_URL;
    try {
      const { createBuildQueue, BUILD_QUEUE } = await import('@communeo/pipeline');
      const queue = await createBuildQueue(process.env.QUEUE_DATABASE_URL!, { logger: { debug() {}, info() {}, warn() {}, error() {} } });
      await queue.boss.deleteAllJobs(BUILD_QUEUE);

      const first = await http.post('/api/deployment/trigger').set(auth(admin));
      expect(first.status).toBe(202);
      expect(first.body).toMatchObject({ queued: true, status: 'queued', jobId: expect.any(String) });

      const second = await http.post('/api/deployment/trigger').set(auth(admin));
      expect(second.status).toBe(202);
      expect(second.body).toMatchObject({ queued: false, status: 'already-queued', jobId: first.body.jobId });

      const job = await queue.boss.getJobById(BUILD_QUEUE, first.body.jobId);
      expect(job?.data).toEqual({ siteDocumentId: siteId, triggeredBy: adminUser.documentId, reason: 'manual' });
      await queue.boss.deleteAllJobs(BUILD_QUEUE);
      await queue.stop();
    } finally {
      process.env.QUEUE_DATABASE_URL = '';
      await stopBuildQueue();
    }
  });
});

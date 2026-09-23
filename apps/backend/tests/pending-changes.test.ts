/**
 * Modifications en attente de mise en ligne et état de la mise en ligne (en-tête et écran de l'admin).
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { BUILD_QUEUE, createBuildQueue, type BuildJobData } from '@communeo/pipeline';
import { deploymentReference } from '../src/api/build-worker/controllers/build-worker';
import { stopBuildQueue } from '../src/services/build-queue';
import { publishDueDocuments } from '../src/services/scheduled-publication';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let siteA: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const worker = auth('test-worker-secret');
const state = async () => (await http.get('/api/deployment/state').set(auth(admin))).body;
const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth(admin))).body.site.documentId;
  await strapi.db.query('api::pending-change.pending-change').deleteMany({ where: {} });
});

afterAll(async () => {
  await teardownStrapi();
});

describe('référence de mise en ligne', () => {
  it("suit le format de l'assistance, à l'heure de Paris", () => {
    expect(deploymentReference(new Date('2026-09-18T09:20:00Z'))).toBe('MEL-2026-0918-1120');
  });
});

describe('modifications en attente', () => {
  it("ne note pas les brouillons, note chaque contenu publié une seule fois, avec son auteur", async () => {
    expect((await state()).state).toBe('idle');

    await http.post('/api/articles').set(auth(admin)).send({ data: { title: 'Brouillon discret' } });
    expect((await state()).pendingCount).toBe(0);

    const article = await http.post('/api/articles?status=published').set(auth(admin)).send({ data: { title: 'Brocante de printemps' } });
    await http.put(`/api/articles/${article.body.data.documentId}?status=published`).set(auth(admin)).send({ data: { summary: 'Place de la mairie' } });
    await http.post('/api/team-members').set(auth(admin)).send({ data: { first_name: 'Marie', last_name: 'Curie', role: 'maire' } });
    await http.put(`/api/sites/${siteA}`).set(auth(admin)).send({ data: { contact_phone: '02 41 00 00 09' } });

    const current = await state();
    expect(current).toMatchObject({ state: 'pending', pendingCount: 3 });
    expect(current.pending.map((c: any) => [c.type, c.title, c.action, c.source])).toEqual([
      ['site', 'Informations du site', 'update', 'person'],
      ['team-member', 'Marie Curie', 'create', 'person'],
      ['article', 'Brocante de printemps', 'publish', 'person'],
    ]);
    expect(current.pending[2].author).toEqual({ firstName: expect.any(String), lastName: expect.any(String) });
  });

  it('une mise en ligne réussie vide la liste, sauf ce qui a changé pendant le build', async () => {
    await http.post('/api/build-worker/jobs/job-ok/start').set(worker).send({ siteDocumentId: siteA, triggeredBy: null, reason: 'manual', attempt: 0 });
    expect(await state()).toMatchObject({ state: 'running', step: 'checking' });

    await http.post('/api/build-worker/jobs/job-ok/progress').set(worker).send({ step: 'rendering' });
    expect((await state()).step).toBe('rendering');
    expect((await http.post('/api/build-worker/jobs/job-ok/progress').set(worker).send({ step: 'pause-café' })).status).toBe(400);

    await tick();
    await http.post('/api/articles?status=published').set(auth(admin)).send({ data: { title: 'Écrit pendant le build' } });

    await http.post('/api/build-worker/jobs/job-ok/finish').set(worker).send({ status: 'ready', buildSeconds: 8 });
    const after = await state();
    expect(after).toMatchObject({ state: 'pending', pendingCount: 1, step: null });
    expect(after.pending[0].title).toBe('Écrit pendant le build');
    expect(after.lastDeployment).toMatchObject({ status: 'ready', reason: 'manual', buildTime: 8, reference: expect.stringMatching(/^MEL-\d{4}-\d{4}-\d{4}$/) });
  });

  it('un échec laisse la liste intacte et donne une référence', async () => {
    await http.post('/api/build-worker/jobs/job-ko/start').set(worker).send({ siteDocumentId: siteA, triggeredBy: null, reason: 'content', attempt: 0 });
    await http.post('/api/build-worker/jobs/job-ko/finish').set(worker).send({ status: 'error', error: 'Service de publication injoignable', buildSeconds: 3 });
    const failed = await state();
    expect(failed).toMatchObject({ state: 'failed', pendingCount: 1, reference: expect.stringMatching(/^MEL-/) });
    expect(failed.lastDeployment.reason).toBe('content');

    await http.post('/api/build-worker/jobs/job-ok2/start').set(worker).send({ siteDocumentId: siteA, triggeredBy: null, reason: 'manual', attempt: 0 });
    await http.post('/api/build-worker/jobs/job-ok2/finish').set(worker).send({ status: 'ready', buildSeconds: 5 });
    expect(await state()).toMatchObject({ state: 'ok', pendingCount: 0 });
  });

  it('distingue une publication programmée', async () => {
    const draft = await strapi.documents('api::article.article').create({
      data: { title: 'Conseil municipal', site: siteA, scheduled_at: new Date(Date.now() - 60_000).toISOString() } as any,
    });
    expect(await publishDueDocuments(strapi)).toBe(1);
    const [change] = (await state()).pending;
    expect(change).toMatchObject({ documentId: draft.documentId, title: 'Conseil municipal', action: 'publish', source: 'scheduled', author: null });
  });

  it("reste propre à la commune et n'est pas exposé par l'API REST", async () => {
    const other = await strapi.documents('api::site.site').create({
      data: { name: 'Commune B', slug: 'commune-b', contact_mail: 'b@example.test' } as any,
    });
    await strapi.documents('api::team-member.team-member').create({ data: { first_name: 'Jean', last_name: 'Secret', role: 'agent', site: other.documentId } as any });
    expect(JSON.stringify(await state())).not.toContain('Secret');
    expect([403, 404]).toContain((await http.get('/api/pending-changes').set(auth(admin))).status);
  });
});

describe.skipIf(!process.env.TEST_QUEUE_DATABASE_URL)('publication programmée et file (Postgres)', () => {
  it("met le site en ligne même sans mise en ligne automatique, avec le motif « programmée »", async () => {
    process.env.QUEUE_DATABASE_URL = process.env.TEST_QUEUE_DATABASE_URL;
    const queue = await createBuildQueue(process.env.QUEUE_DATABASE_URL!, { logger: { debug() {}, info() {}, warn() {}, error() {} } });
    try {
      await queue.boss.deleteAllJobs(BUILD_QUEUE);
      await strapi.documents('api::site.site').update({ documentId: siteA, data: { auto_deploy_enabled: false } as any });
      await strapi.documents('api::article.article').create({
        data: { title: 'Vœux du maire', site: siteA, scheduled_at: new Date(Date.now() - 60_000).toISOString() } as any,
      });
      await publishDueDocuments(strapi);
      const [job] = await queue.boss.findJobs<BuildJobData>(BUILD_QUEUE, { key: siteA, queued: true });
      expect(job?.data.reason).toBe('scheduled');
      expect(job!.startAfter.getTime() - Date.now()).toBeLessThanOrEqual(60_000);
      await queue.boss.deleteAllJobs(BUILD_QUEUE);
    } finally {
      await queue.stop();
      process.env.QUEUE_DATABASE_URL = '';
      await stopBuildQueue();
    }
  });
});

/**
 * Mise en ligne automatique : quelles modifications déclenchent un build, et debounce dans la file.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { BUILD_QUEUE, createBuildQueue, type BuildJobData, type BuildQueue } from '@communeo/pipeline';
import { changesPublicSite, type ChangeContext } from '../src/services/auto-deploy';
import { stopBuildQueue } from '../src/services/build-queue';
import { setupStrapi, teardownStrapi } from './strapi';

const change = (overrides: Partial<ChangeContext>): ChangeContext => ({
  uid: 'api::team-member.team-member',
  action: 'update',
  draftAndPublish: false,
  siteScoped: true,
  ...overrides,
});

describe('changesPublicSite', () => {
  it('ignore les brouillons, compte la publication, la dépublication et la suppression', () => {
    const article = { uid: 'api::article.article', draftAndPublish: true };
    expect(changesPublicSite(change({ ...article, action: 'create' }))).toBe(false);
    expect(changesPublicSite(change({ ...article, action: 'update' }))).toBe(false);
    expect(changesPublicSite(change({ ...article, action: 'update', status: 'published' }))).toBe(true);
    expect(changesPublicSite(change({ ...article, action: 'publish' }))).toBe(true);
    expect(changesPublicSite(change({ ...article, action: 'unpublish' }))).toBe(true);
    expect(changesPublicSite(change({ ...article, action: 'delete' }))).toBe(true);
    expect(changesPublicSite(change({ ...article, action: 'discardDraft' }))).toBe(false);
  });

  it('ignore les champs techniques du Site, pas les autres', () => {
    const site = { uid: 'api::site.site' };
    expect(changesPublicSite(change({ ...site, data: { netlify_site_id: 'x', live_url: 'https://x' } }))).toBe(false);
    expect(changesPublicSite(change({ ...site, data: { domain_status: 'verified' } }))).toBe(false);
    expect(changesPublicSite(change({ ...site, data: { auto_deploy_enabled: true, auto_deploy_delay: 60 } }))).toBe(false);
    expect(changesPublicSite(change({ ...site, data: { contact_phone: '0102030405', live_url: 'https://x' } }))).toBe(true);
    expect(changesPublicSite(change({ ...site, action: 'create', data: { name: 'Nouvelle' } }))).toBe(false);
  });

  it('ignore les soumissions publiques et les associations qui ne sont pas publiées', () => {
    expect(changesPublicSite(change({ uid: 'api::contact-submission.contact-submission', action: 'create' }))).toBe(false);
    expect(changesPublicSite(change({ uid: 'api::newsletter-subscriber.newsletter-subscriber', action: 'create' }))).toBe(false);
    expect(changesPublicSite(change({ uid: 'api::deployment.deployment', action: 'update' }))).toBe(false);

    const association = { uid: 'api::association.association' };
    expect(changesPublicSite(change({ ...association, action: 'create', after: { status: 'pending' } }))).toBe(false);
    expect(changesPublicSite(change({ ...association, before: { status: 'pending' }, after: { status: 'rejected' } }))).toBe(false);
    expect(changesPublicSite(change({ ...association, before: { status: 'pending' }, after: { status: 'published' } }))).toBe(true);
    expect(changesPublicSite(change({ ...association, before: { status: 'published' }, after: { status: 'rejected' } }))).toBe(true);
    expect(changesPublicSite(change({ ...association, action: 'delete', before: { status: 'published' } }))).toBe(true);
  });

  it('compte toute modification des autres contenus du site', () => {
    expect(changesPublicSite(change({ action: 'create' }))).toBe(true);
    expect(changesPublicSite(change({ action: 'delete' }))).toBe(true);
    expect(changesPublicSite(change({ siteScoped: false }))).toBe(false);
  });
});

describe.skipIf(!process.env.TEST_QUEUE_DATABASE_URL)('debounce dans la file (Postgres)', () => {
  let strapi: Core.Strapi;
  let http: ReturnType<typeof request>;
  let queue: BuildQueue;
  let siteId: string;
  const DELAY = 120;

  const waiting = async () => {
    // L'auto-deploy ne bloque pas la réponse : laisser le temps au dépôt dans la file
    await new Promise((resolve) => setTimeout(resolve, 150));
    return queue.boss.findJobs<BuildJobData>(BUILD_QUEUE, { key: siteId, queued: true });
  };

  beforeAll(async () => {
    strapi = await setupStrapi();
    http = request(strapi.server.httpServer);
    process.env.QUEUE_DATABASE_URL = process.env.TEST_QUEUE_DATABASE_URL;
    queue = await createBuildQueue(process.env.QUEUE_DATABASE_URL!, { logger: { debug() {}, info() {}, warn() {}, error() {} } });
    const site = await strapi.documents('api::site.site').findFirst({ filters: { slug: 'test-site' } });
    siteId = site!.documentId;
    await strapi.documents('api::site.site').update({ documentId: siteId, data: { auto_deploy_enabled: true, auto_deploy_delay: DELAY } as any });
  });

  afterAll(async () => {
    await queue?.boss.deleteAllJobs(BUILD_QUEUE);
    await queue?.stop();
    process.env.QUEUE_DATABASE_URL = '';
    await stopBuildQueue();
    await teardownStrapi();
  });

  beforeEach(async () => {
    await queue.boss.deleteAllJobs(BUILD_QUEUE);
  });

  it('une publication donne exactement un build, après le délai, repoussé à chaque modification', async () => {
    const article = await strapi.documents('api::article.article').create({
      data: { title: 'Fête du village', site: siteId } as any,
    });
    expect(await waiting()).toHaveLength(0);

    await strapi.documents('api::article.article').publish({ documentId: article.documentId });
    const [job] = await waiting();
    expect(job?.data).toEqual({ siteDocumentId: siteId, triggeredBy: null, reason: 'content' });
    const delay = (job!.startAfter.getTime() - Date.now()) / 1000;
    expect(delay).toBeGreaterThan(DELAY - 10);
    expect(delay).toBeLessThanOrEqual(DELAY);

    // Nouvelle modification : même demande, départ repoussé
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await strapi.documents('api::site.site').update({ documentId: siteId, data: { contact_phone: '02 41 00 00 01' } as any });
    const after = await waiting();
    expect(after.map((j) => j.id)).toEqual([job!.id]);
    expect(after[0]!.startAfter.getTime()).toBeGreaterThan(job!.startAfter.getTime());
  });

  it("ne programme rien pour un brouillon, un champ technique ou une association proposée par le public", async () => {
    await strapi.documents('api::article.article').create({ data: { title: 'Brouillon', site: siteId } as any });
    await strapi.documents('api::site.site').update({ documentId: siteId, data: { netlify_site_id: 'host-1', live_url: 'https://x.netlify.app' } as any });
    const proposal = await http.post('/api/associations/public').send({
      data: { name: 'Club de pétanque', category: 'sport', contact_email: 'club@example.test', submitted_by_name: 'Jean', submitted_by_email: 'jean@example.test', site: siteId },
    });
    expect(proposal.status).toBe(201);
    expect(await waiting()).toHaveLength(0);

    // La commune publie l'association : là, le site change
    const association = await strapi.documents('api::association.association').findFirst({ filters: { name: 'Club de pétanque' } as any });
    await strapi.documents('api::association.association').update({ documentId: association!.documentId, data: { status: 'published' } as any });
    expect(await waiting()).toHaveLength(1);
  });

  it("« Mettre en ligne » fait partir tout de suite la demande différée", async () => {
    await strapi.documents('api::team-member.team-member').create({ data: { first_name: 'Marie', last_name: 'Curie', role: 'maire', site: siteId } as any });
    const [scheduled] = await waiting();
    expect(scheduled!.startAfter.getTime()).toBeGreaterThan(Date.now() + 60_000);

    const admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
    const res = await http.post('/api/deployment/trigger').set({ Authorization: `Bearer ${admin}` });
    expect(res.body).toMatchObject({ queued: true, status: 'advanced', jobId: scheduled!.id });
    const [now] = await waiting();
    expect(now!.startAfter.getTime()).toBeLessThanOrEqual(Date.now());
    expect(now!.data.reason).toBe('manual');
  });

  it("l'état dit « en cours » dès la demande, avant que le worker la prenne (pas de second clic)", async () => {
    const admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
    const auth = { Authorization: `Bearer ${admin}` };
    await strapi.documents('api::team-member.team-member').create({ data: { first_name: 'Louis', last_name: 'Pasteur', role: 'adjoint', site: siteId } as any });
    await waiting();
    // Mise en ligne automatique prévue : en attente, avec son heure
    const before = (await http.get('/api/deployment/state').set(auth)).body;
    expect(before).toMatchObject({ state: 'pending' });
    expect(new Date(before.scheduledAt).getTime()).toBeGreaterThan(Date.now() + 60_000);

    await http.post('/api/deployment/trigger').set(auth);
    expect((await http.get('/api/deployment/state').set(auth)).body).toMatchObject({ state: 'running', step: 'queued', scheduledAt: null });
  });
});

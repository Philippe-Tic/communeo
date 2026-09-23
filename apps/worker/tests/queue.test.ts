/**
 * File réelle (pg-boss sur Postgres) : lancé quand TEST_QUEUE_DATABASE_URL est défini (CI, ou
 * `docker run -p 55432:5432 -e POSTGRES_PASSWORD=test postgres:16-alpine` en local).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BUILD_QUEUE, createBuildQueue, type BuildQueue, type FinishBuildRequest, type SitePublisher } from '@communeo/pipeline';
import type { BuildDeps } from '../src/build';
import { startWorker } from '../src/worker';

const url = process.env.TEST_QUEUE_DATABASE_URL;
const silent = { debug() {}, info() {}, warn() {}, error() {} };

async function until(condition: () => boolean, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Délai dépassé');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

it.runIf(process.env.CI && !process.env.TEST_QUEUE_DATABASE_URL)('TEST_QUEUE_DATABASE_URL est défini en CI', () => {
  expect.fail('Les tests de la file doivent tourner en CI : définir TEST_QUEUE_DATABASE_URL (service Postgres)');
});

describe.skipIf(!url)('file des builds (Postgres)', () => {
  let queue: BuildQueue;
  let workerId: string | undefined;
  let workDir: string;
  let finished: Array<{ jobId: string; request: FinishBuildRequest }>;
  let starts: Array<{ jobId: string; site: string; attempt: number }>;
  let active: Map<string, number>;
  let maxActivePerSite: number;
  let gate: { release: () => void; promise: Promise<void> };
  let failNext: Set<string>;

  const openGate = () => {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => (release = resolve));
    return { release, promise };
  };

  const deps = (): BuildDeps => ({
    strapi: {
      start: async (jobId, request) => {
        starts.push({ jobId, site: request.siteDocumentId, attempt: request.attempt });
        const slug = request.siteDocumentId;
        return { deploymentId: `dep-${jobId}`, site: { documentId: slug, slug, name: slug, theme: 'starter', hostId: 'h', customDomain: null } };
      },
      progress: async () => {},
      finish: async (jobId, request) => {
        finished.push({ jobId, request });
      },
    },
    renderer: {
      build: async ({ site }) => {
        const count = (active.get(site.documentId) ?? 0) + 1;
        active.set(site.documentId, count);
        maxActivePerSite = Math.max(maxActivePerSite, count);
        try {
          await gate.promise;
          if (failNext.delete(site.documentId)) throw new Error('astro a échoué');
        } finally {
          active.set(site.documentId, (active.get(site.documentId) ?? 1) - 1);
        }
      },
    },
    publisher: {
      ensureSite: async () => ({ hostId: 'h', defaultUrl: 'https://x.netlify.app' }),
      publish: async () => ({ hostId: 'h', defaultUrl: 'https://x.netlify.app', deployId: 'd', state: 'ready' }),
    } as unknown as SitePublisher,
    workDir,
    timeoutSeconds: 60,
    logger: silent,
  });

  beforeAll(async () => {
    queue = await createBuildQueue(url!, { retryLimit: 1, retryDelaySeconds: 0, logger: silent, schema: 'pgboss_test_worker' });
  });
  afterAll(async () => {
    await queue?.stop();
  });

  beforeEach(async () => {
    await queue.boss.deleteAllJobs(BUILD_QUEUE);
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-queue-'));
    finished = [];
    starts = [];
    active = new Map();
    maxActivePerSite = 0;
    gate = openGate();
    failNext = new Set();
  });
  afterEach(async () => {
    gate.release();
    if (workerId) await queue.boss.offWork(BUILD_QUEUE, { id: workerId });
    workerId = undefined;
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it("n'accepte qu'une demande en attente par site", async () => {
    const first = await queue.enqueue({ siteDocumentId: 'lyon', triggeredBy: null, reason: 'manual' });
    const second = await queue.enqueue({ siteDocumentId: 'lyon', triggeredBy: null, reason: 'manual' });
    const other = await queue.enqueue({ siteDocumentId: 'nantes', triggeredBy: null, reason: 'manual' });
    expect(first).toEqual({ jobId: expect.any(String), status: 'queued' });
    expect(second).toEqual({ jobId: first.jobId, status: 'already-queued' });
    expect(other).toEqual({ jobId: expect.any(String), status: 'queued' });
  });

  it('ne lance jamais deux builds du même site en même temps', async () => {
    workerId = await startWorker(queue, deps());
    // Un second worker (autre conteneur) sur la même file
    const secondWorker = await startWorker(queue, deps());

    await queue.enqueue({ siteDocumentId: 'lyon', triggeredBy: null, reason: 'manual' });
    await until(() => starts.length === 1);
    // Pendant le build : une demande de plus attend, la suivante est ignorée
    expect((await queue.enqueue({ siteDocumentId: 'lyon', triggeredBy: 'u', reason: 'manual' })).status).toBe('queued');
    expect((await queue.enqueue({ siteDocumentId: 'lyon', triggeredBy: 'u', reason: 'content' })).status).toBe('already-queued');

    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(starts).toHaveLength(1);

    gate.release();
    await until(() => finished.length === 2);
    expect(maxActivePerSite).toBe(1);
    expect(starts.map((s) => s.site)).toEqual(['lyon', 'lyon']);
    await queue.boss.offWork(BUILD_QUEUE, { id: secondWorker });
  });

  it('relance un build en échec et ne signale que le résultat final', async () => {
    failNext.add('lyon');
    gate.release();
    workerId = await startWorker(queue, deps());
    const { jobId } = await queue.enqueue({ siteDocumentId: 'lyon', triggeredBy: null, reason: 'manual' });

    await until(() => finished.length === 1);
    expect(starts).toEqual([
      { jobId, site: 'lyon', attempt: 0 },
      { jobId, site: 'lyon', attempt: 1 },
    ]);
    expect(finished).toEqual([{ jobId, request: expect.objectContaining({ status: 'ready' }) }]);
  });

  it("signale une seule erreur quand toutes les tentatives échouent", async () => {
    gate.release();
    workerId = await startWorker(queue, {
      ...deps(),
      renderer: { build: async () => { throw new Error('thème inconnu'); } },
    });
    const { jobId } = await queue.enqueue({ siteDocumentId: 'lyon', triggeredBy: null, reason: 'manual' });

    await until(() => starts.length === 2);
    await until(() => finished.length === 1);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(finished).toEqual([{ jobId, request: expect.objectContaining({ status: 'error', error: 'thème inconnu' }) }]);
    expect(fs.readdirSync(workDir)).toEqual([]);
  });
});

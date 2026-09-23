/**
 * File réelle (pg-boss sur Postgres), lancée quand TEST_QUEUE_DATABASE_URL est défini.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BUILD_QUEUE, createBuildQueue, type BuildJobData, type BuildQueue } from '../src';

const url = process.env.TEST_QUEUE_DATABASE_URL;
const silent = { debug() {}, info() {}, warn() {}, error() {} };
const content: BuildJobData = { siteDocumentId: 'lyon', triggeredBy: null, reason: 'content' };
const manual: BuildJobData = { siteDocumentId: 'lyon', triggeredBy: 'maire', reason: 'manual' };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

it.runIf(process.env.CI && !url)('TEST_QUEUE_DATABASE_URL est défini en CI', () => {
  expect.fail('Les tests de la file doivent tourner en CI : définir TEST_QUEUE_DATABASE_URL (service Postgres)');
});

describe.skipIf(!url)('mises en ligne différées (debounce)', () => {
  let queue: BuildQueue;
  const job = async (id: string | null) => (id ? queue.boss.getJobById<BuildJobData>(BUILD_QUEUE, id) : null);

  beforeAll(async () => {
    queue = await createBuildQueue(url!, { logger: silent, schema: 'pgboss_test_pipeline' });
  });
  afterAll(async () => {
    await queue?.stop();
  });
  beforeEach(async () => {
    await queue.boss.deleteAllJobs(BUILD_QUEUE);
  });

  it('repousse la demande en attente à chaque modification, sans en créer une autre', async () => {
    const first = await queue.schedule(content, 60);
    expect(first.status).toBe('queued');
    const before = (await job(first.jobId))!.startAfter.getTime();

    await sleep(50);
    const second = await queue.schedule(content, 60);
    expect(second).toEqual({ jobId: first.jobId, status: 'postponed' });
    expect((await job(first.jobId))!.startAfter.getTime()).toBeGreaterThan(before);
    expect(await queue.boss.findJobs(BUILD_QUEUE, { key: 'lyon', queued: true })).toHaveLength(1);
  });

  it('fait partir tout de suite une demande différée quand quelqu\'un clique « Mettre en ligne »', async () => {
    const scheduled = await queue.schedule(content, 300);
    const now = await queue.enqueue(manual);
    expect(now).toEqual({ jobId: scheduled.jobId, status: 'advanced' });
    const updated = (await job(now.jobId))!;
    expect(updated.startAfter.getTime()).toBeLessThanOrEqual(Date.now());
    expect(updated.data).toEqual(manual);
  });

  it('ne retarde jamais une demande immédiate déjà en attente', async () => {
    const manualJob = await queue.enqueue(manual);
    expect(await queue.schedule(content, 300)).toEqual({ jobId: manualJob.jobId, status: 'already-queued' });
    expect((await job(manualJob.jobId))!.startAfter.getTime()).toBeLessThanOrEqual(Date.now());
    expect(await queue.enqueue(manual)).toEqual({ jobId: manualJob.jobId, status: 'already-queued' });
  });

  it('une rafale de modifications donne exactement un build, après le délai', async () => {
    await queue.schedule(content, 1);
    await sleep(500);
    await queue.schedule(content, 1);
    await queue.schedule({ ...content, siteDocumentId: 'lyon' }, 1);

    // Avant la fin du délai (compté depuis la dernière modification) : rien à construire
    await sleep(600);
    expect(await queue.boss.fetch(BUILD_QUEUE)).toHaveLength(0);

    await sleep(900);
    const ready = await queue.boss.fetch(BUILD_QUEUE, { batchSize: 10 });
    expect(ready).toHaveLength(1);
    await queue.boss.complete(BUILD_QUEUE, ready[0]!.id);
    expect(await queue.boss.fetch(BUILD_QUEUE, { batchSize: 10 })).toHaveLength(0);
  });
});

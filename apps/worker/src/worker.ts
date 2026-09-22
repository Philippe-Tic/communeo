/**
 * Abonnement du worker à la file des builds : un build à la fois par processus.
 * Un worker arrêté en plein build cesse d'envoyer ses battements de cœur ; pg-boss relance alors le job.
 */
import { BUILD_QUEUE, type BuildJob, type BuildQueue } from '@communeo/pipeline';
import { cleanWorkDir, processBuild, type BuildDeps } from './build';

export async function startWorker(queue: BuildQueue, deps: BuildDeps): Promise<string> {
  await cleanWorkDir(deps.workDir);
  return queue.boss.work(
    BUILD_QUEUE,
    { batchSize: 1, localConcurrency: 1, includeMetadata: true, pollingIntervalSeconds: 1 },
    async ([job]: BuildJob[]) => {
      if (job) await processBuild(job, deps);
    },
  );
}

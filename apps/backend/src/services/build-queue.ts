/**
 * Côté Strapi, la file des builds ne sert qu'à déposer des demandes : le worker (apps/worker) les traite.
 * Connexion ouverte au premier dépôt, fermée à l'arrêt de Strapi.
 */
import { createBuildQueue, PublisherUnavailableError, type BuildJobData, type BuildQueue } from '@communeo/pipeline';
import { log } from '../utils/logger';

let queue: Promise<BuildQueue> | null = null;

export function isBuildQueueConfigured(): boolean {
  return !!process.env.QUEUE_DATABASE_URL;
}

/** Dépose une demande de mise en ligne ; `null` si une demande attend déjà pour ce site. */
export async function enqueueBuild(data: BuildJobData): Promise<string | null> {
  const url = process.env.QUEUE_DATABASE_URL;
  if (!url) throw new PublisherUnavailableError("QUEUE_DATABASE_URL n'est pas défini");
  queue ??= createBuildQueue(url, { logger: log }).catch((error) => {
    queue = null;
    throw error;
  });
  return (await queue).enqueue(data);
}

export async function stopBuildQueue(): Promise<void> {
  if (!queue) return;
  const current = queue;
  queue = null;
  await (await current.catch(() => null))?.stop();
}

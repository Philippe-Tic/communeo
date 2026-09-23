/**
 * Côté Strapi, la file des builds ne sert qu'à déposer des demandes : le worker (apps/worker) les traite.
 * Connexion ouverte au premier dépôt, fermée à l'arrêt de Strapi.
 */
import { createBuildQueue, PublisherUnavailableError, type BuildJobData, type BuildQueue, type EnqueueResult } from '@communeo/pipeline';
import { log } from '../utils/logger';

let queue: Promise<BuildQueue> | null = null;

export function isBuildQueueConfigured(): boolean {
  return !!process.env.QUEUE_DATABASE_URL;
}

async function buildQueue(): Promise<BuildQueue> {
  const url = process.env.QUEUE_DATABASE_URL;
  if (!url) throw new PublisherUnavailableError("QUEUE_DATABASE_URL n'est pas défini");
  queue ??= createBuildQueue(url, { logger: log }).catch((error) => {
    queue = null;
    throw error;
  });
  return queue;
}

/** Mise en ligne immédiate (une demande différée qui attend part tout de suite). */
export async function enqueueBuild(data: BuildJobData): Promise<EnqueueResult> {
  return (await buildQueue()).enqueue(data);
}

/** Mise en ligne après `delaySeconds`, repoussée à chaque nouvelle modification (debounce). */
export async function scheduleBuild(data: BuildJobData, delaySeconds: number): Promise<EnqueueResult> {
  return (await buildQueue()).schedule(data, delaySeconds);
}

/** Demande de mise en ligne qui attend le worker pour ce site ; `null` si aucune (ou file injoignable) */
export async function waitingBuild(siteDocumentId: string): Promise<{ startAfter: Date; reason: string } | null> {
  if (!isBuildQueueConfigured()) return null;
  try {
    return await (await buildQueue()).waitingFor(siteDocumentId);
  } catch (error) {
    // L'état de la mise en ligne reste lisible sans la file (elle n'en est qu'un complément)
    log.warn('[build-queue] État de la file indisponible', error);
    return null;
  }
}

export async function stopBuildQueue(): Promise<void> {
  if (!queue) return;
  const current = queue;
  queue = null;
  await (await current.catch(() => null))?.stop();
}

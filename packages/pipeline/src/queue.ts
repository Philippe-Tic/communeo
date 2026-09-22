/**
 * File des builds (pg-boss, base Postgres dédiée : QUEUE_DATABASE_URL). Strapi y dépose une demande
 * de mise en ligne, le worker la construit et la publie.
 *
 * Politique `stately` par commune (`singletonKey` = documentId du site) : au plus un build en cours
 * et un en attente. Une demande arrivée pendant un build attend la fin de celui-ci (elle prendra
 * les dernières modifications) ; une demande de plus alors qu'une attend déjà est ignorée.
 */
import { PgBoss, type Job, type JobWithMetadata } from 'pg-boss';
import { consoleLogger, type Logger } from './logger';

export const BUILD_QUEUE = 'site-build';

export type BuildReason = 'manual' | 'content' | 'scheduled';

export interface BuildJobData {
  siteDocumentId: string;
  /** documentId de l'utilisateur qui a demandé la mise en ligne, `null` pour une demande automatique */
  triggeredBy: string | null;
  reason: BuildReason;
}

export interface BuildQueueOptions {
  /** Durée maximale d'un build, en secondes (défaut 600) */
  timeoutSeconds?: number;
  /** Nouvelles tentatives après un échec ou un worker arrêté en plein build (défaut 1) */
  retryLimit?: number;
  /** Délai avant une nouvelle tentative, en secondes (défaut 15) */
  retryDelaySeconds?: number;
  logger?: Logger;
}

/** Sans battement de cœur pendant cette durée (worker arrêté), le build est relancé. */
export const BUILD_HEARTBEAT_SECONDS = 30;

export interface BuildQueue {
  readonly boss: PgBoss;
  /** Dépose une demande ; `null` si une demande attend déjà pour ce site. */
  enqueue(data: BuildJobData): Promise<string | null>;
  stop(): Promise<void>;
}

export async function createBuildQueue(connectionString: string, options: BuildQueueOptions = {}): Promise<BuildQueue> {
  const log = options.logger ?? consoleLogger;
  const boss = new PgBoss({ connectionString, schema: 'pgboss' });
  boss.on('error', (error) => log.error('[QUEUE]', error));
  await boss.start();

  const settings = {
    policy: 'stately' as const,
    expireInSeconds: options.timeoutSeconds ?? 600,
    heartbeatSeconds: BUILD_HEARTBEAT_SECONDS,
    retryLimit: options.retryLimit ?? 1,
    retryDelay: options.retryDelaySeconds ?? 15,
  };
  if (await boss.getQueue(BUILD_QUEUE)) {
    const { policy: _policy, ...updatable } = settings;
    await boss.updateQueue(BUILD_QUEUE, updatable);
  } else {
    await boss.createQueue(BUILD_QUEUE, settings);
  }

  return {
    boss,
    enqueue: (data) => boss.send(BUILD_QUEUE, data, { singletonKey: data.siteDocumentId }),
    stop: () => boss.stop({ graceful: true, timeout: 30_000 }),
  };
}

export type BuildJob = JobWithMetadata<BuildJobData>;
export type { Job };

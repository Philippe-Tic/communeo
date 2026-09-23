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

export type BuildReason = 'manual' | 'content' | 'scheduled' | 'domain';

/** Demandes différées (repoussées à chaque modification) ; les autres partent dès que possible */
const DEFERRED_REASONS = new Set<BuildReason>(['content', 'scheduled']);

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
  /** Schéma Postgres de pg-boss (défaut `pgboss`) ; les tests en utilisent un chacun */
  schema?: string;
}

/** Sans battement de cœur pendant cette durée (worker arrêté), le build est relancé. */
export const BUILD_HEARTBEAT_SECONDS = 30;

/**
 * - `queued` : nouvelle demande déposée
 * - `already-queued` : une demande attend déjà et partira aussi tôt (elle prendra ces modifications)
 * - `advanced` : une demande différée attendait, elle part maintenant
 * - `postponed` : une demande différée attendait, son départ est repoussé (debounce)
 */
export type EnqueueStatus = 'queued' | 'already-queued' | 'advanced' | 'postponed';

export interface EnqueueResult {
  jobId: string | null;
  status: EnqueueStatus;
}

export interface BuildQueue {
  readonly boss: PgBoss;
  /** Demande une mise en ligne immédiate (une demande différée qui attend part tout de suite). */
  enqueue(data: BuildJobData): Promise<EnqueueResult>;
  /**
   * Demande une mise en ligne dans `delaySeconds` secondes. Chaque nouvel appel pour le même site
   * repousse le départ de la demande en attente : un seul build part, après la dernière modification.
   * Une demande immédiate déjà en attente n'est jamais retardée.
   */
  schedule(data: BuildJobData, delaySeconds: number): Promise<EnqueueResult>;
  /**
   * Demande qui attend le worker pour ce site (immédiate ou différée), avec son heure de départ :
   * entre le clic sur « Mettre en ligne » et le début du build, l'admin l'affiche comme en cours.
   */
  waitingFor(siteDocumentId: string): Promise<{ jobId: string; startAfter: Date; reason: BuildReason } | null>;
  stop(): Promise<void>;
}

export async function createBuildQueue(connectionString: string, options: BuildQueueOptions = {}): Promise<BuildQueue> {
  const log = options.logger ?? consoleLogger;
  const boss = new PgBoss({ connectionString, schema: options.schema ?? 'pgboss' });
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

  /** Demande qui attend (état `created`) pour ce site, s'il y en a une */
  const waiting = async (siteDocumentId: string) => {
    const jobs = await boss.findJobs<BuildJobData>(BUILD_QUEUE, { key: siteDocumentId, queued: true });
    return jobs.find((job) => job.state === 'created') ?? null;
  };

  /** Change le départ (et éventuellement la demande) d'un job en attente ; faux s'il est déjà parti. */
  const reschedule = async (id: string, startAfter: Date, data?: BuildJobData) =>
    (await boss.update(BUILD_QUEUE, data, { id, startAfter })).updated > 0;

  const send = async (data: BuildJobData, delaySeconds: number): Promise<EnqueueResult> => {
    const jobId = await boss.send(BUILD_QUEUE, data, {
      singletonKey: data.siteDocumentId,
      ...(delaySeconds > 0 ? { startAfter: delaySeconds } : {}),
    });
    return jobId ? { jobId, status: 'queued' } : { jobId: (await waiting(data.siteDocumentId))?.id ?? null, status: 'already-queued' };
  };

  return {
    boss,

    async enqueue(data) {
      const job = await waiting(data.siteDocumentId);
      if (!job) return send(data, 0);
      if (job.startAfter.getTime() <= Date.now()) return { jobId: job.id, status: 'already-queued' };
      // Une demande différée attendait : elle part maintenant, au nom de la personne qui publie
      return (await reschedule(job.id, new Date(), data)) ? { jobId: job.id, status: 'advanced' } : send(data, 0);
    },

    async schedule(data, delaySeconds) {
      const job = await waiting(data.siteDocumentId);
      if (!job) return send(data, delaySeconds);
      const startAfter = new Date(Date.now() + delaySeconds * 1000);
      // Demande immédiate (ou partant plus tard que prévu) : on n'y touche pas
      if (!DEFERRED_REASONS.has(job.data.reason) || job.startAfter >= startAfter) return { jobId: job.id, status: 'already-queued' };
      return (await reschedule(job.id, startAfter)) ? { jobId: job.id, status: 'postponed' } : send(data, delaySeconds);
    },

    async waitingFor(siteDocumentId) {
      const job = await waiting(siteDocumentId);
      return job ? { jobId: job.id, startAfter: job.startAfter, reason: job.data.reason } : null;
    },

    stop: () => boss.stop({ graceful: true, timeout: 30_000 }),
  };
}

export type BuildJob = JobWithMetadata<BuildJobData>;
export type { Job };

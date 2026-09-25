/**
 * Échanges entre le worker de build et Strapi (routes internes, protégées par WORKER_SECRET).
 * Strapi reste seul maître de sa base : le worker lui annonce le début et la fin de chaque build.
 */
import type { BuildReason } from './queue';

/** Ce dont le worker a besoin pour construire et publier une commune. */
export interface BuildSite {
  documentId: string;
  slug: string;
  name: string;
  theme: string;
  /** Identifiant du site chez l'hébergeur, absent avant la première publication */
  hostId: string | null;
  /** Domaine personnalisé vérifié : adresse canonique du site */
  customDomain: string | null;
}

export interface StartBuildRequest {
  siteDocumentId: string;
  triggeredBy: string | null;
  reason: BuildReason;
  /** 0 pour le premier essai */
  attempt: number;
}

export type StartBuildResponse =
  | {
      /** documentId de l'enregistrement Deployment (réutilisé par les nouvelles tentatives du même job) */
      deploymentId: string;
      site: BuildSite;
    }
  | {
      /** La commune ne peut plus être mise en ligne (suspendue, essai terminé) : le job s'arrête là */
      cancelled: string;
    };

/**
 * Étapes d'une mise en ligne, dans l'ordre : vérification des contenus, préparation des pages,
 * publication sur le site, vidage du cache (l'hébergeur termine le traitement)
 */
export const BUILD_STEPS = ['checking', 'rendering', 'publishing', 'cache'] as const;
export type BuildStep = (typeof BUILD_STEPS)[number];

export interface ProgressBuildRequest {
  step: BuildStep;
}

export interface FinishBuildRequest {
  /** `building` : publié, mais l'hébergeur n'a pas fini de le traiter */
  status: 'ready' | 'building' | 'error';
  error?: string;
  buildSeconds: number;
  /** Identifiant du dépôt chez l'hébergeur */
  deployId?: string;
  hostId?: string;
  /** Adresse par défaut chez l'hébergeur */
  defaultUrl?: string;
}

export const workerRoutes = {
  start: (jobId: string) => `/api/build-worker/jobs/${encodeURIComponent(jobId)}/start`,
  progress: (jobId: string) => `/api/build-worker/jobs/${encodeURIComponent(jobId)}/progress`,
  finish: (jobId: string) => `/api/build-worker/jobs/${encodeURIComponent(jobId)}/finish`,
};

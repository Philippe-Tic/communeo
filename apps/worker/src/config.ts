/**
 * Configuration du worker, lue dans l'environnement.
 */
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface WorkerConfig {
  /** Base Postgres de la file des builds (pg-boss) */
  queueUrl: string;
  /** Adresse de Strapi vue du worker (routes internes et données du build) */
  strapiUrl: string;
  /** Adresse publique de Strapi (médias dans les pages générées) */
  strapiPublicUrl: string;
  /** Token Strapi en lecture seule, transmis au renderer */
  strapiBuildToken: string;
  /** Secret partagé avec Strapi pour les routes internes */
  workerSecret: string;
  /** Projet Astro du renderer */
  rendererDir: string;
  /** Dossier des builds temporaires */
  workDir: string;
  timeoutSeconds: number;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const strapiUrl = required(env, 'STRAPI_URL').replace(/\/$/, '');
  return {
    queueUrl: required(env, 'QUEUE_DATABASE_URL'),
    strapiUrl,
    strapiPublicUrl: (env.STRAPI_PUBLIC_URL || strapiUrl).replace(/\/$/, ''),
    strapiBuildToken: required(env, 'STRAPI_API_TOKEN'),
    workerSecret: required(env, 'WORKER_SECRET'),
    rendererDir: path.resolve(env.RENDERER_DIR || fileURLToPath(new URL('../../renderer', import.meta.url))),
    workDir: path.resolve(env.WORK_DIR || path.join(os.tmpdir(), 'communeo-builds')),
    timeoutSeconds: Number(env.BUILD_TIMEOUT_SECONDS) || 600,
  };
}

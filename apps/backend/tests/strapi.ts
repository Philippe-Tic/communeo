/**
 * Démarre une instance Strapi réelle pour les tests d'intégration, sur une base SQLite jetable.
 * Le bootstrap (hors production) crée le site « test-site » et les comptes
 * test@example.com (admin) et super@example.com (super_admin).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Core } from '@strapi/strapi';

// Version CommonJS de Strapi : son build ESM n'est pas chargeable directement par Node
const { compileStrapi, createStrapi } = createRequire(import.meta.url)('@strapi/strapi') as typeof import('@strapi/strapi');

const DB_FILE = `.tmp/test-${process.pid}.db`;

let instance: Core.Strapi | undefined;

/** E-mails que Strapi aurait envoyés pendant les tests */
export const sentEmails: Array<{ to: string; subject: string; text?: string; html?: string }> = [];
// Écouteurs du processus avant le démarrage de Strapi (ceux de Vitest)
let baselineListeners: Array<readonly [string | symbol, Function[]]> = [];

export async function setupStrapi(): Promise<Core.Strapi> {
  if (instance) return instance;

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_CLIENT: 'sqlite',
    DATABASE_FILENAME: DB_FILE,
    APP_KEYS: 'test-key-1,test-key-2',
    API_TOKEN_SALT: 'test-api-token-salt',
    ADMIN_JWT_SECRET: 'test-admin-jwt-secret',
    TRANSFER_TOKEN_SALT: 'test-transfer-token-salt',
    JWT_SECRET: 'test-jwt-secret',
    ENCRYPTION_KEY: 'test-encryption-key',
    // Aucun hébergeur : Strapi doit démarrer, seules les actions de publication répondent 503
    NETLIFY_TOKEN: '',
    // Aucun envoi d'e-mail réel : les messages sont gardés dans `sentEmails`
    RESEND_API_KEY: '',
    QUEUE_DATABASE_URL: '',
    WORKER_SECRET: 'test-worker-secret',
    STRAPI_API_TOKEN: 'test-build-token',
    PREVIEW_API_TOKEN: 'test-preview-token',
    PREVIEW_SECRET: 'test-preview-secret',
    PREVIEW_URL: 'https://preview.test',
    CRON_ENABLED: 'false',
    STRAPI_TELEMETRY_DISABLED: 'true',
    STRAPI_DISABLE_UPDATE_NOTIFICATION: 'true',
  });

  removeDatabase();
  baselineListeners = process.eventNames().map((event) => [event, process.rawListeners(event as any)] as const);
  const appContext = await compileStrapi();
  instance = await createStrapi(appContext).load();
  const email = instance.plugin('email').service('email');
  email.send = async (message: (typeof sentEmails)[number]) => {
    sentEmails.push(message);
  };
  instance.server.mount();
  return instance;
}

export async function teardownStrapi() {
  if (!instance) return;
  await instance.destroy();
  // strapi.destroy() appelle process.removeAllListeners(), ce qui coupe aussi le canal entre Vitest
  // et son worker : on remet les écouteurs d'avant le démarrage (sans ceux de Strapi).
  for (const [event, listeners] of baselineListeners) {
    for (const listener of listeners) process.on(event as any, listener as any);
  }
  instance = undefined;
  removeDatabase();
}

function removeDatabase() {
  const file = path.join(process.cwd(), DB_FILE);
  for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true });
}

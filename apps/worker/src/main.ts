/**
 * Worker de build Communeo : `node dist/main.js` (conteneur dédié, voir Dockerfile).
 */
import { consoleLogger, createBuildQueue, getPublisher } from '@communeo/pipeline';
import { readConfig } from './config';
import { createAstroRenderer } from './renderer';
import { createStrapiReporter } from './strapi';
import { startWorker } from './worker';

const log = consoleLogger;
const config = readConfig();
const publisher = getPublisher(process.env, log);
if (!publisher.configured) log.warn("[WORKER] Aucun hébergeur configuré (NETLIFY_TOKEN) : chaque build échouera à la publication");

const queue = await createBuildQueue(config.queueUrl, { timeoutSeconds: config.timeoutSeconds, logger: log });
await startWorker(queue, {
  strapi: createStrapiReporter(config.strapiUrl, config.workerSecret),
  renderer: createAstroRenderer(config),
  publisher,
  workDir: config.workDir,
  timeoutSeconds: config.timeoutSeconds,
  logger: log,
});
log.info(`[WORKER] En attente de builds (renderer : ${config.rendererDir})`);

const shutdown = async (signal: string) => {
  log.info(`[WORKER] ${signal} : arrêt après le build en cours`);
  await queue.stop();
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

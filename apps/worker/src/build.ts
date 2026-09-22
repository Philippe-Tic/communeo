/**
 * Traitement d'une demande de mise en ligne : Strapi ouvre l'enregistrement Deployment, le renderer
 * construit le site dans un dossier temporaire, l'hébergeur le publie, Strapi reçoit le résultat.
 *
 * Tant qu'il reste une tentative, un échec relance le job (pg-boss) sans être signalé : l'historique
 * ne montre qu'une erreur, à la dernière tentative. Le dossier temporaire est supprimé dans tous les cas.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { BuildJob, BuildSite, Logger, PublisherSite, SitePublisher } from '@communeo/pipeline';
import type { Renderer } from './renderer';
import type { StrapiReporter } from './strapi';

export interface BuildDeps {
  strapi: StrapiReporter;
  renderer: Renderer;
  publisher: SitePublisher;
  workDir: string;
  timeoutSeconds: number;
  logger: Logger;
  now?: () => number;
}

const MAX_ERROR_LENGTH = 4000;

export async function processBuild(job: BuildJob, deps: BuildDeps): Promise<void> {
  const now = deps.now ?? Date.now;
  const started = now();
  const lastAttempt = job.retryCount >= job.retryLimit;
  const log = deps.logger;
  const { siteDocumentId, triggeredBy } = job.data;

  const { site } = await deps.strapi.start(job.id, { siteDocumentId, triggeredBy, attempt: job.retryCount });
  log.info(`[BUILD] ${site.slug} : début (job ${job.id}, essai ${job.retryCount + 1}/${job.retryLimit + 1})`);

  await fs.mkdir(deps.workDir, { recursive: true });
  const outDir = await fs.mkdtemp(path.join(deps.workDir, `build-${site.slug}-`));
  const signal = AbortSignal.any([job.signal, AbortSignal.timeout(deps.timeoutSeconds * 1000)]);
  let hostId = site.hostId;

  try {
    const host = await deps.publisher.ensureSite(toPublisherSite(site));
    hostId = host.hostId;
    const siteUrl = site.customDomain ? `https://${site.customDomain}` : host.defaultUrl;

    await deps.renderer.build({ site, outDir, siteUrl, signal });
    signal.throwIfAborted();
    const result = await deps.publisher.publish(toPublisherSite({ ...site, hostId }), outDir);

    const buildSeconds = (now() - started) / 1000;
    await deps.strapi.finish(job.id, {
      status: result.state,
      buildSeconds,
      deployId: result.deployId,
      hostId: result.hostId,
      defaultUrl: result.defaultUrl,
    });
    log.info(`[BUILD] ${site.slug} : publié en ${buildSeconds.toFixed(1)} s (${result.state})`);
  } catch (error) {
    const message = errorMessage(error, signal);
    // Erreur rejetée avec un message nettoyé : pg-boss l'enregistre en JSON dans Postgres
    const failure = new Error(message, { cause: error });
    if (!lastAttempt) {
      log.warn(`[BUILD] ${site.slug} : échec, nouvelle tentative prévue — ${message}`);
      throw failure;
    }
    log.error(`[BUILD] ${site.slug} : échec — ${message}`);
    await deps.strapi.finish(job.id, {
      status: 'error',
      error: message,
      buildSeconds: (now() - started) / 1000,
      ...(hostId ? { hostId } : {}),
    });
    throw failure;
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
}

/** Supprime les dossiers laissés par un worker arrêté en plein build. */
export async function cleanWorkDir(workDir: string): Promise<void> {
  const entries = await fs.readdir(workDir).catch(() => [] as string[]);
  await Promise.all(
    entries.filter((name) => name.startsWith('build-')).map((name) => fs.rm(path.join(workDir, name), { recursive: true, force: true })),
  );
}

function toPublisherSite(site: BuildSite): PublisherSite {
  return { documentId: site.documentId, slug: site.slug, name: site.name, hostId: site.hostId, customDomain: site.customDomain };
}

function errorMessage(error: unknown, signal: AbortSignal): string {
  const reason = signal.aborted && signal.reason instanceof Error && signal.reason.name === 'TimeoutError'
    ? 'durée maximale du build dépassée'
    : null;
  const message = cleanText(reason ?? (error instanceof Error ? error.message : String(error)));
  return message.length > MAX_ERROR_LENGTH ? `${message.slice(0, MAX_ERROR_LENGTH)}…` : message;
}

/** Sans codes de couleur ANSI ni caractères de contrôle (Postgres refuse \u0000 dans du JSON). */
export function cleanText(text: string): string {
  // eslint-disable-next-line no-control-regex -- justement les caractères à retirer
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

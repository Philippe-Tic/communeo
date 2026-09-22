/**
 * Le worker de build annonce le début et la fin de chaque build ; Strapi tient l'historique
 * (Deployment) et les champs techniques du Site.
 *
 * Un job pg-boss = un enregistrement Deployment (`job_id`) : une nouvelle tentative du même job
 * réutilise l'enregistrement, un échec n'en crée donc jamais plusieurs.
 */
import crypto from 'crypto';
import { DEFAULT_THEME } from '@communeo/core';
import type { BuildSite, FinishBuildRequest, StartBuildRequest } from '@communeo/pipeline';
import { log } from '../../../utils/logger';

const DEPLOYMENT = 'api::deployment.deployment';

/** Secret partagé, comparé en temps constant. Sans WORKER_SECRET, les routes sont fermées. */
function authorized(ctx): boolean {
  const secret = process.env.WORKER_SECRET;
  const header: string = ctx.request.headers?.authorization ?? '';
  if (!secret || !header.startsWith('Bearer ')) return false;
  const given = crypto.createHash('sha256').update(header.slice(7)).digest();
  const expected = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(given, expected);
}

async function findDeployment(jobId: string) {
  return strapi.documents(DEPLOYMENT).findFirst({ filters: { job_id: jobId } as any, populate: ['site'] });
}

export default {
  /**
   * POST /api/build-worker/jobs/:jobId/start
   */
  async start(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized('Secret du worker invalide');
    const { jobId } = ctx.params;
    const body = (ctx.request.body ?? {}) as StartBuildRequest;

    const site: any = await strapi.documents('api::site.site').findFirst({
      filters: { documentId: body.siteDocumentId } as any,
    });
    if (!site) return ctx.notFound('Site non trouvé');

    const now = new Date();
    let deployment: any = await findDeployment(jobId);
    if (deployment) {
      // Nouvelle tentative du même job
      deployment = await strapi.documents(DEPLOYMENT).update({
        documentId: deployment.documentId,
        data: { status: 'building', error_message: null, completed_at: null } as any,
      });
    } else {
      deployment = await strapi.documents(DEPLOYMENT).create({
        data: {
          site: site.documentId,
          job_id: jobId,
          status: 'building',
          triggered_at: now,
          ...(body.triggeredBy ? { triggered_by: body.triggeredBy } : {}),
        } as any,
      });
    }

    // Un seul build à la fois par site : tout autre build « en cours » a été interrompu (worker arrêté)
    const stale = await strapi.documents(DEPLOYMENT).findMany({
      filters: { site: { documentId: site.documentId }, status: 'building', documentId: { $ne: deployment.documentId } } as any,
    });
    for (const old of stale) {
      await strapi.documents(DEPLOYMENT).update({
        documentId: old.documentId,
        data: { status: 'error', error_message: 'Mise en ligne interrompue', completed_at: now } as any,
      });
    }

    log.info(`🏗️ [BUILD] Job ${jobId} started for ${site.slug} (attempt ${(body.attempt ?? 0) + 1})`);

    const buildSite: BuildSite = {
      documentId: site.documentId,
      slug: site.slug,
      name: site.name,
      theme: site.theme || DEFAULT_THEME,
      hostId: site.netlify_site_id || null,
      customDomain: site.domain_status === 'verified' ? site.custom_domain || null : null,
    };
    ctx.body = { deploymentId: deployment.documentId, site: buildSite };
  },

  /**
   * POST /api/build-worker/jobs/:jobId/finish
   */
  async finish(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized('Secret du worker invalide');
    const { jobId } = ctx.params;
    const body = (ctx.request.body ?? {}) as FinishBuildRequest;
    if (!['ready', 'building', 'error'].includes(body.status)) return ctx.badRequest('Statut invalide');

    const deployment: any = await findDeployment(jobId);
    if (!deployment) return ctx.notFound('Déploiement non trouvé');

    await strapi.documents(DEPLOYMENT).update({
      documentId: deployment.documentId,
      data: {
        status: body.status,
        build_time: Math.round(body.buildSeconds ?? 0),
        error_message: body.status === 'error' ? body.error || 'Échec de la mise en ligne' : null,
        ...(body.deployId ? { deployment_id: body.deployId } : {}),
        ...(body.defaultUrl ? { deployment_url: body.defaultUrl } : {}),
        completed_at: body.status === 'building' ? null : new Date(),
      } as any,
    });

    // Champs techniques du Site : requête bas niveau, sans passer par les middlewares de documents
    // (qui programmeraient un nouveau build pour cette simple mise à jour)
    const site = deployment.site;
    if (site && body.hostId) {
      const hasVerifiedDomain = site.domain_status === 'verified' && site.custom_domain;
      await strapi.db.query('api::site.site').update({
        where: { id: site.id },
        data: {
          netlify_site_id: body.hostId,
          ...(!hasVerifiedDomain && body.defaultUrl ? { live_url: body.defaultUrl } : {}),
        },
      });
    }

    log.info(`${body.status === 'error' ? '❌' : '✅'} [BUILD] Job ${jobId} finished: ${body.status}${body.error ? ` (${body.error})` : ''}`);
    ctx.body = { ok: true };
  },
};

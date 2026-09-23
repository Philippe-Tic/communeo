/**
 * deployment controller
 */

import { factories } from '@strapi/strapi';
import deploymentService from '../../../services/deployment';
import { isBuildQueueConfigured, waitingBuild } from '../../../services/build-queue';
import { listPendingChanges } from '../../../services/pending-changes';
import { publisher } from '../../../utils/publisher';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';
import { log } from '../../../utils/logger';

export default factories.createCoreController('api::deployment.deployment', ({ strapi }) => ({
  /**
   * Déclenche un nouveau déploiement
   * POST /api/deployment/trigger
   */
  async trigger(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentification requise');
      }

      const site = await getEffectiveSite(ctx);
      if (!site) {
        return ctx.badRequest('Utilisateur sans site assigné');
      }

      const siteId = site.documentId || site.id;
      const userId = user.documentId || user.id;

      log.debug('🔍 Trigger deployment - siteId:', siteId, 'userId:', userId);
      log.debug('🔍 User site object:', site);

      log.debug('🔍 Attempting to fetch site with siteId:', siteId);

      // Récupérer les infos du site - utiliser findMany avec filtre pour Strapi v5
      const sites = await strapi.documents('api::site.site').findMany({
        filters: { documentId: siteId } as any
      });

      const siteData = sites && sites.length > 0 ? sites[0] : null;

      log.debug('🔍 Site found:', siteData ? 'YES' : 'NO');
      if (siteData) {
        log.debug('🔍 Site details:', { id: (siteData as any).id, documentId: (siteData as any).documentId, name: (siteData as any).name, slug: (siteData as any).slug });
      }

      if (!siteData) {
        log.info('❌ Site not found with siteId:', siteId);
        return ctx.notFound('Site non trouvé');
      }

      if (!isBuildQueueConfigured()) {
        ctx.status = 503;
        ctx.body = { error: { status: 503, message: "Publication indisponible : QUEUE_DATABASE_URL n'est pas défini" } };
        return;
      }

      // Dépôt dans la file : le worker construit et publie le site
      const { jobId, status } = await deploymentService.requestBuild(siteId, { triggeredBy: userId, reason: 'manual' });

      ctx.status = 202;
      ctx.body = {
        success: true,
        queued: status === 'queued' || status === 'advanced',
        status,
        jobId,
        message: status === 'already-queued'
          ? 'Une mise en ligne est déjà en attente : elle prendra en compte vos dernières modifications'
          : 'Mise en ligne demandée',
        site: {
          id: siteId,
          name: (siteData as any).name,
          slug: (siteData as any).slug
        }
      };

    } catch (error) {
      log.error('💥 Trigger deployment error:', error);
      log.error('Trigger deployment error:', error);
      ctx.internalServerError('Erreur lors du lancement du déploiement');
    }
  },

  /**
   * État de la mise en ligne pour l'en-tête et l'écran « Mise en ligne » de l'admin :
   * `idle | pending(n) | running(step) | failed(ref) | ok`, et la liste des modifications en attente.
   * GET /api/deployment/state
   */
  async state(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Authentification requise');
    const site = await getEffectiveSite(ctx);
    if (!site) return ctx.badRequest('Utilisateur sans site assigné');

    const [latest] = await strapi.documents('api::deployment.deployment').findMany({
      filters: { site: { documentId: site.documentId } } as any,
      sort: { triggered_at: 'desc' } as any,
      limit: 1,
      populate: { triggered_by: { fields: ['first_name', 'last_name'] } } as any,
    });
    const [pending, waiting] = await Promise.all([listPendingChanges(site.documentId), waitingBuild(site.documentId)]);
    // Demande déposée que le worker n'a pas encore prise : déjà « en cours » pour la personne qui a cliqué
    // (sinon « Mettre en ligne » réapparaît et invite à cliquer une seconde fois)
    const queued = !!waiting && waiting.startAfter.getTime() <= Date.now() + 5_000;

    const state = latest?.status === 'building' || queued
      ? 'running'
      : latest?.status === 'error'
        ? 'failed'
        : pending.length > 0
          ? 'pending'
          : latest
            ? 'ok'
            : 'idle';

    const person = (user: any) => (user ? { firstName: user.first_name ?? null, lastName: user.last_name ?? null } : null);
    ctx.body = {
      state,
      pendingCount: pending.length,
      step: state === 'running' ? (latest?.status === 'building' ? ((latest as any).step ?? 'checking') : 'queued') : null,
      // Mise en ligne automatique prévue (modifications en attente)
      scheduledAt: state === 'pending' && waiting && !queued ? waiting.startAfter.toISOString() : null,
      reference: state === 'failed' ? (latest as any).reference ?? null : null,
      lastDeployment: latest
        ? {
            status: latest.status,
            reason: (latest as any).reason ?? null,
            reference: (latest as any).reference ?? null,
            step: (latest as any).step ?? null,
            triggeredAt: latest.triggered_at,
            completedAt: latest.completed_at ?? null,
            buildTime: latest.build_time ?? null,
            triggeredBy: person((latest as any).triggered_by),
          }
        : null,
      pending: pending.map((change: any) => ({
        type: change.content_type,
        documentId: change.content_document_id,
        title: change.title,
        action: change.action,
        source: change.source,
        author: person(change.author),
        occurredAt: change.occurred_at,
      })),
    };
  },

  /**
   * Récupère le statut du dernier déploiement + historique
   * GET /api/deployment/status
   */
  async status(ctx) {
    try {
      const user = ctx.state.user;

      log.info('user', user);

      if (!user) {
        return ctx.unauthorized('Authentification requise');
      }

      const site = await getEffectiveSite(ctx);
      if (!site) {
        return ctx.badRequest('Utilisateur sans site assigné');
      }

      const siteIdForRelation = site.documentId;

      // 1. Récupérer le statut du dernier déploiement
      const latestDeployments = await strapi.documents('api::deployment.deployment').findMany({
        filters: {
          site: { documentId: siteIdForRelation }
        },
        sort: { triggered_at: 'desc' },
        limit: 1,
        populate: {
          triggered_by: {
            fields: ['first_name', 'last_name', 'email']
          }
        }
      });

      log.debug('🔍 Latest deployments:', latestDeployments);

      const lastDeployment = latestDeployments.length > 0 ? latestDeployments[0] : null;

      // Si le dernier déploiement est en cours, vérifier son statut chez l'hébergeur
      let currentStatus = null;
      if (lastDeployment && lastDeployment.status === 'building' && lastDeployment.deployment_id) {
        try {
          currentStatus = await deploymentService.checkDeploymentStatus(lastDeployment.deployment_id);
        } catch (error) {
          log.warn('Could not check deployment status:', error);
          currentStatus = lastDeployment;
        }
      } else {
        currentStatus = lastDeployment;
      }

      // 2. Pagination pour l'historique
      const page = parseInt(ctx.query.page as string) || 1;
      const pageSize = parseInt(ctx.query.pageSize as string) || 10;
      const start = (page - 1) * pageSize;

      // 3. Récupérer l'historique paginé
      const deployments = await strapi.documents('api::deployment.deployment').findMany({
        filters: {
          site: { documentId: siteIdForRelation }
        },
        sort: { triggered_at: 'desc' },
        start,
        limit: pageSize,
        populate: {
          triggered_by: {
            fields: ['first_name', 'last_name', 'email']
          }
        }
      });

      // 4. Compter le total
      const total = await strapi.documents('api::deployment.deployment').count({
        filters: {
          site: { documentId: siteIdForRelation }
        }
      });

      ctx.body = {
        currentDeployment: currentStatus,
        data: deployments,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total
          }
        }
      };

    } catch (error) {
      log.error('Get deployment status error:', error);
      ctx.internalServerError('Erreur lors de la récupération du statut');
    }
  },

  /**
   * Vérifie le statut d'un déploiement spécifique
   * GET /api/deployment/check/:deploymentId
   */
  async check(ctx) {
    try {
      const { deploymentId } = ctx.params;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentification requise');
      }

      const site = await getEffectiveSite(ctx);
      if (!site) {
        return ctx.badRequest('Utilisateur sans site assigné');
      }

      const siteIdForRelation = site.documentId;

      // Vérifier que le déploiement appartient au site de l'utilisateur
      const deployments = await strapi.documents('api::deployment.deployment').findMany({
        filters: {
          deployment_id: deploymentId,
          site: { documentId: siteIdForRelation }
        },
        populate: {
          site: {
            fields: ['name', 'slug', 'live_url']
          },
          triggered_by: {
            fields: ['first_name', 'last_name']
          }
        }
      });

      if (!deployments || deployments.length === 0) {
        return ctx.notFound('Déploiement non trouvé');
      }

      const deployment = deployments[0];

      // Si le déploiement est encore en cours, vérifier son statut
      if (deployment.status === 'building') {
        try {
          const updatedDeployment = await deploymentService.checkDeploymentStatus(deploymentId);
          ctx.body = { data: updatedDeployment };
        } catch (error) {
          log.error('Error checking deployment status:', error);
          ctx.body = { data: deployment };
        }
      } else {
        ctx.body = { data: deployment };
      }

    } catch (error) {
      log.error('Check deployment error:', error);
      ctx.internalServerError('Erreur lors de la vérification du déploiement');
    }
  },

  /**
   * Endpoint de debug pour vérifier l'état du système de déploiement
   * GET /api/deployment/debug
   */
  async debug(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentification requise');
      }

      if (!hasRole(ctx, ['super_admin'])) {
        return ctx.forbidden('Réservé au super administrateur');
      }

      const site = await getEffectiveSite(ctx);
      const siteId = site?.documentId || site?.id;

      // 1. Variables d'environnement
      const envVars = {
        PUBLISHER: publisher().configured ? publisher().id : 'NOT_CONFIGURED',
        QUEUE_DATABASE_URL: isBuildQueueConfigured() ? '***SET***' : 'NOT_SET',
        STRAPI_PUBLIC_URL: process.env.STRAPI_PUBLIC_URL || 'NOT_SET',
        STRAPI_API_TOKEN: process.env.STRAPI_API_TOKEN ? '***SET***' : 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT_SET'
      };

      // 2. Info utilisateur
      const userInfo = {
        id: user.id,
        documentId: user.documentId,
        email: user.email,
        municipality_role: user.municipality_role,
        has_site: !!site,
        site_id: siteId,
        site_name: site?.name,
        site_slug: site?.slug
      };

      // 3. Déploiements récents
      let recentDeployments = [];
      if (siteId) {
        recentDeployments = await strapi.documents('api::deployment.deployment').findMany({
          filters: { site: siteId },
          sort: { triggered_at: 'desc' },
          limit: 5,
          populate: {
            triggered_by: {
              fields: ['first_name', 'last_name', 'email']
            }
          }
        });
      }

      // 4. Info du site
      let siteInfo = null;
      if (siteId) {
        const sites = await strapi.documents('api::site.site').findMany({
          filters: { documentId: siteId } as any
        });
        siteInfo = sites && sites.length > 0 ? {
          id: (sites[0] as any).id,
          documentId: (sites[0] as any).documentId,
          name: (sites[0] as any).name,
          slug: (sites[0] as any).slug,
          netlify_site_id: (sites[0] as any).netlify_site_id,
          live_url: (sites[0] as any).live_url
        } : null;
      }

      // 5. Status du système
      const systemStatus = {
        backend_running: true,
        sites_directory_exists: require('fs').existsSync(require('path').join(__dirname, '../../../sites')),
        temp_directory: require('path').join(__dirname, '../../../temp'),
        deployment_service_loaded: !!deploymentService
      };

      ctx.body = {
        timestamp: new Date().toISOString(),
        environment_variables: envVars,
        user_info: userInfo,
        site_info: siteInfo,
        recent_deployments: recentDeployments,
        system_status: systemStatus
      };

    } catch (error) {
      log.error('Debug endpoint error:', error);
      ctx.internalServerError('Erreur lors de la récupération des informations de debug');
    }
  }
}));

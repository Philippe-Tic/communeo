/**
 * deployment controller
 */

import { factories } from '@strapi/strapi';
import deploymentService from '../../../services/deployment';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

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
      const siteIdForRelation = site.id;

      console.log('🔍 Trigger deployment - siteId:', siteId, 'userId:', userId);
      console.log('🔍 User site object:', site);

      // Vérifier s'il n'y a pas déjà un déploiement en cours
      const ongoingDeployments = await strapi.entityService.findMany('api::deployment.deployment', {
        filters: {
          site: siteIdForRelation,
          status: 'building'
        }
      });

      if (ongoingDeployments && ongoingDeployments.length > 0) {
        return ctx.badRequest('Un déploiement est déjà en cours pour ce site');
      }

      console.log('🔍 Attempting to fetch site with siteId:', siteId);

      // Récupérer les infos du site - utiliser findMany avec filtre pour Strapi v5
      const sites = await strapi.entityService.findMany('api::site.site', {
        filters: { documentId: siteId } as any
      });

      const siteData = sites && sites.length > 0 ? sites[0] : null;

      console.log('🔍 Site found:', siteData ? 'YES' : 'NO');
      if (siteData) {
        console.log('🔍 Site details:', { id: (siteData as any).id, documentId: (siteData as any).documentId, name: (siteData as any).name, slug: (siteData as any).slug });
      }

      if (!siteData) {
        console.log('❌ Site not found with siteId:', siteId);
        return ctx.notFound('Site non trouvé');
      }

      // Lancer le déploiement en arrière-plan
      console.log('🚀 Launching async deployment process...');

      deploymentService.buildAndDeploy(siteId, (siteData as any).slug, userId)
        .then(result => {
          console.log('✅ Async deployment process completed:', result);
          if (!result.success) {
            console.error('❌ Deployment failed:', result.error);
            // Créer une entrée d'erreur en base
            strapi.entityService.create('api::deployment.deployment', {
              data: {
                site: siteIdForRelation,
                deployment_id: `error-${Date.now()}`,
                status: 'error',
                triggered_by: userId,
                error_message: result.error,
                build_time: result.buildTime,
                triggered_at: new Date(),
                completed_at: new Date()
              }
                          }).catch(err => console.error('Failed to create error deployment record:', err));
          } else {
            console.log('✅ Deployment successful, deployment ID:', result.deployment?.deployment_id);
          }
        })
        .catch(error => {
          console.error('💥 Unexpected deployment error:', error);
          strapi.log.error('Unexpected deployment error:', error);
        });

      console.log('📤 Returning immediate response to client...');

      // Retourner immédiatement avec statut "building"
      ctx.body = {
        success: true,
        message: 'Déploiement lancé avec succès',
        status: 'building',
        site: {
          id: siteId,
          name: (siteData as any).name,
          slug: (siteData as any).slug
        }
      };

      console.log('✅ Trigger response sent successfully');

    } catch (error) {
      console.error('💥 Trigger deployment error:', error);
      strapi.log.error('Trigger deployment error:', error);
      ctx.internalServerError('Erreur lors du lancement du déploiement');
    }
  },

  /**
   * Récupère le statut du dernier déploiement + historique
   * GET /api/deployment/status
   */
  async status(ctx) {
    try {
      const user = ctx.state.user;

      console.log('user', user);

      if (!user) {
        return ctx.unauthorized('Authentification requise');
      }

      const site = await getEffectiveSite(ctx);
      if (!site) {
        return ctx.badRequest('Utilisateur sans site assigné');
      }

      const siteIdForRelation = site.id;

      // 1. Récupérer le statut du dernier déploiement
      const latestDeployments = await strapi.entityService.findMany('api::deployment.deployment', {
        filters: {
          site: siteIdForRelation
        },
        sort: { triggered_at: 'desc' },
        limit: 1,
        populate: {
          triggered_by: {
            fields: ['first_name', 'last_name', 'email']
          }
        }
      });

      console.log('🔍 Latest deployments:', latestDeployments);

      const lastDeployment = latestDeployments.length > 0 ? latestDeployments[0] : null;

      // Si le dernier déploiement est en cours, vérifier son statut sur Netlify
      let currentStatus = null;
      if (lastDeployment && lastDeployment.status === 'building') {
        try {
          currentStatus = await deploymentService.checkDeploymentStatus(lastDeployment.deployment_id);
        } catch (error) {
          console.warn('Could not check deployment status:', error);
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
      const deployments = await strapi.entityService.findMany('api::deployment.deployment', {
        filters: {
          site: siteIdForRelation
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
      const total = await strapi.entityService.count('api::deployment.deployment', {
        filters: {
          site: siteIdForRelation
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
      strapi.log.error('Get deployment status error:', error);
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

      const siteIdForRelation = site.id;

      // Vérifier que le déploiement appartient au site de l'utilisateur
      const deployments = await strapi.entityService.findMany('api::deployment.deployment', {
        filters: {
          deployment_id: deploymentId,
          site: siteIdForRelation
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
          strapi.log.error('Error checking deployment status:', error);
          ctx.body = { data: deployment };
        }
      } else {
        ctx.body = { data: deployment };
      }

    } catch (error) {
      strapi.log.error('Check deployment error:', error);
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

      const site = await getEffectiveSite(ctx);
      const siteId = site?.documentId || site?.id;

      // 1. Variables d'environnement
      const envVars = {
        NETLIFY_TOKEN: process.env.NETLIFY_TOKEN ? '***SET***' : 'NOT_SET',
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
        recentDeployments = await strapi.entityService.findMany('api::deployment.deployment', {
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
        const sites = await strapi.entityService.findMany('api::site.site', {
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
      console.error('Debug endpoint error:', error);
      ctx.internalServerError('Erreur lors de la récupération des informations de debug');
    }
  }
}));

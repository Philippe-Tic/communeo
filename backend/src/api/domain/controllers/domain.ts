/**
 * domain controller
 */

import domainService from '../../../services/domain';
import domainValidationService from '../../../services/domain-validation';
import netlifyService from '../../../services/netlify';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

export default {
  /**
   * Configure un domaine personnalisé
   * POST /api/domain/configure
   */
  async configure(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentification requise');
      }

      const site = await getEffectiveSite(ctx);
      if (!site) {
        return ctx.badRequest('Utilisateur sans site assigné');
      }

      const { customDomain } = ctx.request.body;

      if (!customDomain) {
        return ctx.badRequest('Le domaine personnalisé est requis');
      }

      const siteId = site.documentId || site.id;

      // 1. Validation complète du domaine
      const validation = await domainValidationService.validateDomainConfiguration(customDomain, siteId);

      if (!validation.isValid) {
        return ctx.badRequest({
          message: 'Configuration du domaine impossible',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // 2. Configuration du domaine
      const config = await domainService.configureDomain(siteId, customDomain);

      ctx.body = {
        success: true,
        domain: config.domain,
        domainType: config.domainType,
        netlifyUrl: config.netlifyUrl,
        dnsInstructions: config.dnsInstructions,
        message: 'Domaine enregistré sur Netlify. Veuillez configurer le pointage DNS.'
      };

    } catch (error: any) {
      strapi.log.error('Configure domain error:', error);
      ctx.badRequest(error.message || 'Erreur lors de la configuration du domaine');
    }
  },

  /**
   * Vérifie et active un domaine personnalisé
   * POST /api/domain/verify
   */
  async verify(ctx) {
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

      // Activer le domaine
      const result = await domainService.activateCustomDomain(siteId);

      if (result.success) {
        ctx.body = {
          success: true,
          url: result.url,
          message: 'Domaine vérifié et activé avec succès!',
          sslProvisioning: true
        };
      } else {
        // Retourner 200 avec success: false + hint pour distinguer "pas encore prêt" de "erreur réelle"
        ctx.body = {
          success: false,
          message: 'Vérification du domaine échouée',
          error: result.error,
          hint: result.hint || 'La propagation DNS peut prendre jusqu\'à 48 heures. Si vous venez de configurer vos enregistrements DNS, réessayez plus tard.'
        };
      }

    } catch (error: any) {
      strapi.log.error('Verify domain error:', error);
      ctx.internalServerError('Erreur lors de la vérification du domaine');
    }
  },

  /**
   * Supprime un domaine personnalisé
   * DELETE /api/domain/remove
   */
  async remove(ctx) {
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

      // Supprimer le domaine
      const result = await domainService.removeDomain(siteId);

      if (result.success) {
        ctx.body = {
          success: true,
          defaultUrl: result.defaultUrl,
          message: 'Domaine personnalisé supprimé avec succès'
        };
      } else {
        ctx.badRequest({
          success: false,
          error: result.error
        });
      }

    } catch (error: any) {
      strapi.log.error('Remove domain error:', error);
      ctx.internalServerError('Erreur lors de la suppression du domaine');
    }
  },

  /**
   * Récupère le statut du domaine
   * GET /api/domain/status
   */
  async status(ctx) {
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

      // Récupérer les infos du site - utiliser findMany avec filtre documentId pour Strapi v5
      const sites = await strapi.entityService.findMany('api::site.site', {
        filters: { documentId: siteId } as any
      });
      const siteData = sites && sites.length > 0 ? sites[0] : null;

      if (!siteData) {
        return ctx.notFound('Site non trouvé');
      }

      const hasCustomDomain = !!(siteData as any).custom_domain;
      const domainType = (siteData as any).domain_type || null;
      let sslStatus = null;

      // Récupérer le statut SSL si domaine configuré et site Netlify existe
      if (hasCustomDomain && (siteData as any).netlify_site_id && (siteData as any).domain_status === 'verified') {
        try {
          sslStatus = await domainService.getSSLStatus((siteData as any).netlify_site_id, (siteData as any).custom_domain);
        } catch (error) {
          strapi.log.warn('Could not get SSL status:', error);
        }
      }

      // Récupérer l'URL Netlify pour les domaines en pending
      let netlifyUrl: string | null = null;
      let dnsInstructions: any = null;

      if (hasCustomDomain && (siteData as any).domain_status === 'pending') {
        // Construire l'URL Netlify
        if ((siteData as any).netlify_site_id) {
          try {
            const netlifySite = await netlifyService.getSite((siteData as any).netlify_site_id);
            netlifyUrl = `${netlifySite.name}.netlify.app`;
          } catch {
            // fallback
          }
        }
        if (!netlifyUrl && (siteData as any).slug) {
          netlifyUrl = `${(siteData as any).slug}-mairie.netlify.app`;
        }

        // Reconstruire les instructions DNS pour l'UI
        if (netlifyUrl) {
          dnsInstructions = domainService.generateDnsInstructions(
            (siteData as any).custom_domain,
            netlifyUrl
          );
        }
      }

      ctx.body = {
        hasCustomDomain,
        customDomain: (siteData as any).custom_domain || null,
        domainStatus: (siteData as any).domain_status || 'pending',
        domainType,
        netlifyUrl,
        dnsInstructions,
        liveUrl: (siteData as any).live_url || null,
        sslEnabled: (siteData as any).ssl_enabled !== false,
        sslStatus,
        domainConfiguredAt: (siteData as any).domain_configured_at || null
      };

    } catch (error: any) {
      strapi.log.error('Get domain status error:', error);
      ctx.internalServerError('Erreur lors de la récupération du statut du domaine');
    }
  },

  /**
   * Diagnostic DNS d'un domaine
   * GET /api/domain/diagnostic/:domain
   */
  async diagnostic(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Authentification requise');
      }

      const { domain } = ctx.params;

      if (!domain) {
        return ctx.badRequest('Domaine requis');
      }

      // Valider le format du domaine
      if (!domainValidationService.validateDomainFormat(domain)) {
        return ctx.badRequest('Format de domaine invalide');
      }

      // Effectuer le diagnostic DNS
      const diagnostic = await domainValidationService.diagnoseDomainDNS(domain);

      ctx.body = {
        domain: diagnostic.domain,
        dns: {
          hasARecord: diagnostic.hasARecord,
          hasAAAARecord: diagnostic.hasAAAARecord,
          hasCNAME: diagnostic.hasCNAME,
          hasTXT: diagnostic.hasTXT,
          records: {
            a: diagnostic.aRecords,
            aaaa: diagnostic.aaaaRecords,
            cname: diagnostic.cnameRecords,
            txt: diagnostic.txtRecords
          }
        }
      };

    } catch (error: any) {
      strapi.log.error('Domain diagnostic error:', error);
      ctx.internalServerError('Erreur lors du diagnostic du domaine');
    }
  }
};

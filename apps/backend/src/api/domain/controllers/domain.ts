/**
 * domain controller
 */

import domainService from '../../../services/domain';
import { isPublisherUnavailable } from '@communeo/pipeline';
import domainValidationService from '../../../services/domain-validation';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';
import { log } from '../../../utils/logger';
import { recordActivity } from '../../../services/activity-log';

const DOMAIN_LIVE_ONLY =
  "Le domaine personnalisé est disponible une fois le site passé en live : pendant l'essai, le site garde son adresse Communeo.";

/** Hébergeur non configuré : 503 plutôt qu'une erreur générique */
function unavailable(ctx, error: unknown): boolean {
  if (!isPublisherUnavailable(error)) return false;
  ctx.status = 503;
  ctx.body = { error: { status: 503, message: error.message } };
  return true;
}

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

      if (!hasRole(ctx, ['admin', 'super_admin'])) {
        return ctx.forbidden('Seul un administrateur peut gérer le domaine');
      }

      const site = await getEffectiveSite(ctx);
      if (!site) {
        return ctx.badRequest('Utilisateur sans site assigné');
      }

      const { customDomain } = ctx.request.body;

      if (!customDomain) {
        return ctx.badRequest('Le domaine personnalisé est requis');
      }

      // Domaine personnalisé réservé aux communes en live (#311), y compris pour l'équipe
      const { plan } = (await strapi.db.query('api::site.site').findOne({ where: { documentId: site.documentId }, select: ['plan'] })) ?? {};
      if (plan && plan !== 'live') {
        return ctx.forbidden(DOMAIN_LIVE_ONLY, { code: 'live_only' });
      }

      const siteId = site.documentId || site.id;

      // 1. Validation complète du domaine
      const validation = await domainValidationService.validateDomainConfiguration(customDomain, siteId);

      if (!validation.isValid) {
        return ctx.badRequest(validation.errors.join(' ') || 'Configuration du domaine impossible', {
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // 2. Configuration du domaine
      const config = await domainService.configureDomain(siteId, customDomain);
      await recordActivity({
        action: 'domain_change',
        siteDocumentId: site.documentId,
        target: { type: 'domain', label: config.domain },
        details: { change: 'configure' },
      });

      ctx.body = {
        success: true,
        domain: config.domain,
        domainType: config.domainType,
        dnsTarget: config.dnsInstructions.target,
        dnsInstructions: config.dnsInstructions,
        message: 'Domaine enregistré. Veuillez configurer le pointage DNS.'
      };

    } catch (error: any) {
      if (unavailable(ctx, error)) return;
      log.error('Configure domain error:', error);
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

      if (!hasRole(ctx, ['admin', 'super_admin'])) {
        return ctx.forbidden('Seul un administrateur peut gérer le domaine');
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
          // Ce qui est attendu et ce que le DNS renvoie (encarts « Attendu / Trouvé » de l'admin)
          mismatch: result.mismatch ?? null,
          checkedAt: new Date().toISOString(),
          hint: result.hint || 'La propagation DNS peut prendre jusqu\'à 48 heures. Si vous venez de configurer vos enregistrements DNS, réessayez plus tard.'
        };
      }

    } catch (error: any) {
      if (unavailable(ctx, error)) return;
      log.error('Verify domain error:', error);
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

      if (!hasRole(ctx, ['admin', 'super_admin'])) {
        return ctx.forbidden('Seul un administrateur peut gérer le domaine');
      }

      const site = await getEffectiveSite(ctx);
      if (!site) {
        return ctx.badRequest('Utilisateur sans site assigné');
      }

      const siteId = site.documentId || site.id;

      // Supprimer le domaine
      const result = await domainService.removeDomain(siteId);

      if (result.success) {
        await recordActivity({
          action: 'domain_change',
          siteDocumentId: site.documentId,
          target: { type: 'domain', label: site.custom_domain ?? null },
          details: { change: 'remove' },
        });
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
      if (unavailable(ctx, error)) return;
      log.error('Remove domain error:', error);
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
      const sites = await strapi.documents('api::site.site').findMany({
        filters: { documentId: siteId } as any
      });
      const siteData = sites && sites.length > 0 ? sites[0] : null;

      if (!siteData) {
        return ctx.notFound('Site non trouvé');
      }

      const hasCustomDomain = !!(siteData as any).custom_domain;
      const domainType = (siteData as any).domain_type || null;
      let sslStatus = null;

      // Statut du certificat HTTPS une fois le domaine vérifié
      if (hasCustomDomain && (siteData as any).netlify_site_id && (siteData as any).domain_status === 'verified') {
        sslStatus = await domainService.getSSLStatus(siteData);
      }

      // Enregistrements DNS à créer tant que le domaine n'est pas vérifié
      let dnsInstructions: any = null;
      if (hasCustomDomain && (siteData as any).domain_status === 'pending') {
        try {
          dnsInstructions = await domainService.dnsInstructions(siteData);
        } catch (error) {
          log.warn('Could not build DNS instructions:', error);
        }
      }

      ctx.body = {
        hasCustomDomain,
        customDomain: (siteData as any).custom_domain || null,
        domainStatus: (siteData as any).domain_status || 'pending',
        domainType,
        dnsTarget: dnsInstructions?.target ?? null,
        dnsInstructions,
        liveUrl: (siteData as any).live_url || null,
        sslEnabled: (siteData as any).ssl_enabled !== false,
        sslStatus,
        domainConfiguredAt: (siteData as any).domain_configured_at || null
      };

    } catch (error: any) {
      log.error('Get domain status error:', error);
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
      log.error('Domain diagnostic error:', error);
      ctx.internalServerError('Erreur lors du diagnostic du domaine');
    }
  }
};

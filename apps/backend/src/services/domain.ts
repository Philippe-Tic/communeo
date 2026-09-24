/**
 * Domain Service - Gestion des domaines personnalisés
 */

import { isApexDomain, isPublisherUnavailable, type DnsInstructions, type DomainCheck } from '@communeo/pipeline';
import { publisher as getPublisher, toPublisherSite } from '../utils/publisher';
import { log } from '../utils/logger';
import { isBuildQueueConfigured } from './build-queue';
import deploymentService from './deployment';

interface DomainConfiguration {
  domain: string;
  domainType: 'apex' | 'subdomain';
  dnsInstructions: DnsInstructions;
}

class DomainService {
  /**
   * Trouve un site par documentId (Strapi v5 : findOne attend un id numérique)
   */
  private async findSiteByDocumentId(siteId: string) {
    const sites = await strapi.documents('api::site.site').findMany({
      filters: { documentId: siteId } as any
    });
    return sites && sites.length > 0 ? sites[0] : null;
  }

  isApexDomain(domain: string): boolean {
    return isApexDomain(domain);
  }

  /**
   * Configure un domaine personnalisé : le rattache au site chez l'hébergeur,
   * puis renvoie les enregistrements DNS à créer.
   */
  async configureDomain(siteId: string, customDomain: string): Promise<DomainConfiguration> {
    log.info(`Configuring domain ${customDomain} for site ${siteId}`);

    if (!this.validateDomainFormat(customDomain)) {
      throw new Error('Format de domaine invalide');
    }
    if (await this.isDomainAlreadyUsed(customDomain, siteId)) {
      throw new Error('Ce domaine est déjà utilisé par un autre site');
    }

    const site = await this.findSiteByDocumentId(siteId);
    if (!site) {
      throw new Error('Site non trouvé');
    }

    const domainType = isApexDomain(customDomain) ? 'apex' : 'subdomain';
    const dnsInstructions = await getPublisher().configureDomain(toPublisherSite(site), customDomain);

    await strapi.documents('api::site.site').update({ documentId: site.documentId,
      data: {
        custom_domain: customDomain,
        domain_status: 'pending',
        domain_type: domainType
      } as any
    });

    log.info(`Domain ${customDomain} registered and saved (type: ${domainType})`);
    return { domain: customDomain, domainType, dnsInstructions };
  }

  /**
   * Enregistrements DNS à créer pour le domaine déjà configuré d'un site
   */
  async dnsInstructions(site: any): Promise<DnsInstructions | null> {
    if (!site?.custom_domain) return null;
    return getPublisher().dnsInstructions(toPublisherSite(site), site.custom_domain);
  }

  /**
   * Active un domaine personnalisé une fois le pointage DNS vérifié par l'hébergeur (qui active aussi HTTPS).
   */
  async activateCustomDomain(siteId: string): Promise<{ success: boolean; url?: string; error?: string; hint?: string; mismatch?: DomainCheck['mismatch'] }> {
    const site = await this.findSiteByDocumentId(siteId);

    if (!site || !(site as any).custom_domain) {
      return { success: false, error: 'Site ou domaine non configuré' };
    }

    try {
      const domain = (site as any).custom_domain;
      const check = await getPublisher().verifyDomain(toPublisherSite(site), domain);

      if (!check.ok) {
        log.warn(`Domain ${domain} DNS routing verification failed: ${JSON.stringify(check.errors)}`);
        return {
          success: false,
          error: check.errors.join(', '),
          mismatch: check.mismatch,
          hint: 'La propagation DNS peut prendre jusqu\'à 48 heures. Si vous venez de configurer vos enregistrements DNS, réessayez plus tard.'
        };
      }

      const customUrl = `https://${domain}`;
      await strapi.documents('api::site.site').update({ documentId: site.documentId,
        data: {
          domain_status: 'verified',
          live_url: customUrl,
          domain_configured_at: new Date()
        } as any
      });

      log.info(`Custom domain ${domain} activated successfully`);
      await this.rebuildForDomain(site.documentId);
      return { success: true, url: customUrl };

    } catch (error: any) {
      if (isPublisherUnavailable(error)) throw error;
      log.error(`Error activating custom domain:`, error);

      await strapi.documents('api::site.site').update({ documentId: site.documentId,
        data: {
          domain_status: 'error'
        } as any
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Le domaine change l'adresse canonique des pages (liens, sitemap, redirection) : on remet le site
   * en ligne. Les champs techniques du Site ne déclenchent pas de build automatique.
   */
  private async rebuildForDomain(siteDocumentId: string): Promise<void> {
    if (!isBuildQueueConfigured()) return;
    try {
      await deploymentService.requestBuild(siteDocumentId, { reason: 'domain' });
    } catch (error) {
      log.warn(`Could not queue a build after the domain change:`, error);
    }
  }

  /**
   * Supprime un domaine personnalisé
   */
  async removeDomain(siteId: string): Promise<{ success: boolean; defaultUrl?: string; error?: string }> {
    try {
      const site = await this.findSiteByDocumentId(siteId);
      if (!site) {
        throw new Error('Site non trouvé');
      }

      const domain = (site as any).custom_domain;
      let defaultUrl = (site as any).live_url;

      if (domain) {
        try {
          const removed = await getPublisher().removeDomain(toPublisherSite(site), domain);
          defaultUrl = removed.defaultUrl ?? defaultUrl;
        } catch (publisherError) {
          if (isPublisherUnavailable(publisherError)) throw publisherError;
          log.warn(`Failed to remove domain from host:`, publisherError);
        }
      }

      await strapi.documents('api::site.site').update({ documentId: site.documentId,
        data: {
          custom_domain: null,
          domain_status: 'pending',
          domain_type: null,
          domain_configured_at: null,
          live_url: defaultUrl
        } as any
      });

      log.info(`Custom domain removed for site ${siteId}`);
      if (domain) await this.rebuildForDomain(site.documentId);
      return { success: true, defaultUrl };

    } catch (error: any) {
      if (isPublisherUnavailable(error)) throw error;
      log.error(`Error removing domain:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Valide le format d'un domaine (accepte apex et sous-domaines)
   */
  validateDomainFormat(domain: string): boolean {
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  /**
   * Vérifie si un domaine est déjà utilisé
   */
  async isDomainAlreadyUsed(domain: string, excludeSiteId?: string): Promise<boolean> {
    const filters: any = { custom_domain: domain };

    if (excludeSiteId) {
      filters.documentId = { $ne: excludeSiteId };
    }

    const existingSites = await strapi.documents('api::site.site').findMany({
      filters
    });

    return existingSites && existingSites.length > 0;
  }

  /**
   * État du certificat HTTPS chez l'hébergeur
   */
  async getSSLStatus(site: any): Promise<unknown | null> {
    try {
      return await getPublisher().certificateStatus(toPublisherSite(site));
    } catch (error: any) {
      log.warn(`Could not get SSL status for ${site?.custom_domain}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export default new DomainService();

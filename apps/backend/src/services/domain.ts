/**
 * Domain Service - Gestion des domaines personnalisés
 */

import { promisify } from 'util';
import dns from 'dns';
import netlifyService from './netlify';
import { log } from '../utils/logger';

const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);

const NETLIFY_LB_IP = '75.2.60.5';

export interface DnsInstruction {
  type: 'A' | 'CNAME';
  name: string;
  displayName: string;
  value: string;
  purpose: string;
  description: string;
}

interface DomainValidationResult {
  isValid: boolean;
  dnsRecordValid: boolean;
  errors: string[];
  warnings: string[];
}

interface DomainConfiguration {
  domain: string;
  domainType: 'apex' | 'subdomain';
  netlifyUrl: string;
  dnsInstructions: {
    isApex: boolean;
    baseDomain: string;
    records: DnsInstruction[];
  };
}

class DomainService {
  private readonly NETLIFY_DNS_TARGET = 'netlify.app';

  /**
   * Trouve un site par documentId (Strapi v5 : findOne attend un id numérique)
   */
  private async findSiteByDocumentId(siteId: string) {
    const sites = await strapi.documents('api::site.site').findMany({
      filters: { documentId: siteId } as any
    });
    return sites && sites.length > 0 ? sites[0] : null;
  }

  /**
   * Détecte si un domaine est un apex (exactement 2 labels : domaine.tld)
   */
  isApexDomain(domain: string): boolean {
    const labels = domain.split('.');
    return labels.length === 2;
  }

  /**
   * Récupère l'URL Netlify concrète d'un site (ex: lyon-mairie.netlify.app)
   */
  private async getNetlifyUrl(siteId: string): Promise<string> {
    const site = await this.findSiteByDocumentId(siteId);
    if (!site) {
      return this.NETLIFY_DNS_TARGET;
    }

    // Essayer de récupérer l'URL depuis Netlify
    if ((site as any).netlify_site_id) {
      try {
        const netlifySite = await netlifyService.getSite((site as any).netlify_site_id);
        // Toujours utiliser le nom Netlify (pas netlifySite.url qui retourne
        // le custom domain après PATCH)
        return `${netlifySite.name}.netlify.app`;
      } catch (error) {
        log.warn('Could not fetch Netlify URL, using default target');
      }
    }

    // Fallback : utiliser le slug pour construire l'URL
    if ((site as any).slug) {
      return `${(site as any).slug}-mairie.netlify.app`;
    }

    return this.NETLIFY_DNS_TARGET;
  }

  /**
   * Configure un domaine personnalisé pour un site.
   * Enregistre immédiatement le domaine sur Netlify (pas de vérification TXT maison).
   */
  async configureDomain(siteId: string, customDomain: string): Promise<DomainConfiguration> {
    try {
      log.info(`Configuring domain ${customDomain} for site ${siteId}`);

      // 1. Valider le format du domaine
      if (!this.validateDomainFormat(customDomain)) {
        throw new Error('Format de domaine invalide');
      }

      // 2. Vérifier que le domaine n'est pas déjà utilisé
      const existingSite = await this.isDomainAlreadyUsed(customDomain, siteId);
      if (existingSite) {
        throw new Error('Ce domaine est déjà utilisé par un autre site');
      }

      // 3. Détecter le type de domaine
      const domainType = this.isApexDomain(customDomain) ? 'apex' : 'subdomain';

      // 4. Récupérer le site en base
      const site = await this.findSiteByDocumentId(siteId);
      if (!site) {
        throw new Error('Site non trouvé');
      }

      // 5. Vérifier que le site a été déployé sur Netlify
      if (!(site as any).netlify_site_id) {
        throw new Error('Le site doit être déployé sur Netlify avant de configurer un domaine personnalisé');
      }

      // 6. Enregistrer immédiatement le domaine sur Netlify
      await netlifyService.addDomainToNetlify((site as any).netlify_site_id, customDomain);

      // 6b. Ajouter l'alias www pour les apex domains
      if (domainType === 'apex') {
        try {
          await netlifyService.addDomainAlias((site as any).netlify_site_id, `www.${customDomain}`);
        } catch (wwwError) {
          log.warn(`Could not add www variant for ${customDomain}:`, wwwError);
        }
      }

      // 7. Récupérer l'URL Netlify concrète
      const netlifyUrl = await this.getNetlifyUrl(siteId);

      // 8. Mettre à jour le site en base
      await strapi.documents('api::site.site').update({ documentId: site.documentId,
        data: {
          custom_domain: customDomain,
          domain_status: 'pending',
          domain_type: domainType
        } as any
      });

      // 9. Préparer les instructions DNS (CNAME/A uniquement)
      const dnsInstructions = this.generateDnsInstructions(customDomain, netlifyUrl);

      log.info(`Domain ${customDomain} registered on Netlify and saved (type: ${domainType})`);

      return {
        domain: customDomain,
        domainType,
        netlifyUrl,
        dnsInstructions
      };

    } catch (error: any) {
      log.error(`Error configuring domain ${customDomain}:`, error);
      throw error;
    }
  }

  /**
   * Vérifie le pointage DNS d'un domaine (CNAME/A uniquement, pas de TXT)
   */
  async verifyDomainRouting(domain: string): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: false,
      dnsRecordValid: false,
      errors: [],
      warnings: []
    };

    try {
      log.info(`Verifying DNS routing for ${domain}`);

      const isApex = this.isApexDomain(domain);
      let dnsValid = false;

      if (isApex) {
        dnsValid = await this.checkApexDnsRecord(domain);
        if (!dnsValid) {
          result.errors.push(`Enregistrement A non configuré ou ne pointe pas vers ${NETLIFY_LB_IP}`);
        }
      } else {
        dnsValid = await this.checkCnameRecord(domain);
        if (!dnsValid) {
          result.errors.push('Enregistrement CNAME non configuré ou incorrect');
        }
      }

      result.dnsRecordValid = dnsValid;
      result.isValid = dnsValid;

      if (result.isValid) {
        log.info(`Domain ${domain} DNS routing verified successfully`);
      } else {
        log.warn(`Domain ${domain} DNS routing verification failed: ${JSON.stringify(result.errors)}`);
      }

      return result;

    } catch (error: any) {
      log.error(`Error verifying domain ${domain}:`, error);
      result.errors.push(`Erreur lors de la vérification DNS: ${error.message}`);
      return result;
    }
  }

  /**
   * Vérifie l'enregistrement CNAME (pour les sous-domaines)
   */
  async checkCnameRecord(domain: string): Promise<boolean> {
    try {
      log.info(`[DOMAIN] CNAME lookup: ${domain}`);
      const records = await resolveCname(domain);
      log.info(`[DOMAIN] CNAME records found: ${JSON.stringify(records)}, expected suffix: ${this.NETLIFY_DNS_TARGET}`);

      // Vérifier si le CNAME pointe vers Netlify
      for (const record of records) {
        if (record.endsWith(this.NETLIFY_DNS_TARGET)) {
          return true;
        }
      }

      return false;

    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        log.info(`[DOMAIN] CNAME lookup failed: ${error.code} for ${domain}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Vérifie le A record pour un apex domain
   */
  async checkApexDnsRecord(domain: string): Promise<boolean> {
    try {
      const records = await resolve4(domain);

      for (const record of records) {
        if (record === NETLIFY_LB_IP) {
          return true;
        }
      }

      return false;

    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Active un domaine personnalisé après vérification du pointage DNS.
   * Le domaine est déjà enregistré sur Netlify (fait dans configureDomain).
   */
  async activateCustomDomain(siteId: string): Promise<{ success: boolean; url?: string; error?: string; hint?: string }> {
    const site = await this.findSiteByDocumentId(siteId);

    if (!site || !(site as any).custom_domain) {
      return { success: false, error: 'Site ou domaine non configuré' };
    }

    try {
      const domain = (site as any).custom_domain;

      log.info(`[DOMAIN] Verifying DNS routing for ${domain}`);

      // 1. Vérifier le pointage DNS (CNAME/A uniquement)
      const validation = await this.verifyDomainRouting(domain);

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          hint: 'La propagation DNS peut prendre jusqu\'à 48 heures. Si vous venez de configurer vos enregistrements DNS, réessayez plus tard.'
        };
      }

      // 2. Mettre à jour le site en base
      const customUrl = `https://${domain}`;

      await strapi.documents('api::site.site').update({ documentId: site.documentId,
        data: {
          domain_status: 'verified',
          live_url: customUrl,
          domain_configured_at: new Date()
        } as any
      });

      // 3. Provisionner le SSL
      if ((site as any).netlify_site_id) {
        try {
          await netlifyService.provisionSSL((site as any).netlify_site_id);
          // Activer force_ssl pour rediriger .netlify.app → custom domain
          await netlifyService.updateSite((site as any).netlify_site_id, { force_ssl: true });
        } catch (sslError) {
          log.warn(`SSL provisioning failed for ${domain}:`, sslError);
        }
      }

      log.info(`Custom domain ${domain} activated successfully`);

      return {
        success: true,
        url: customUrl
      };

    } catch (error: any) {
      log.error(`Error activating custom domain:`, error);

      // Marquer le domaine en erreur
      await strapi.documents('api::site.site').update({ documentId: site.documentId,
        data: {
          domain_status: 'error'
        } as any
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Supprime un domaine personnalisé
   */
  async removeDomain(siteId: string): Promise<{ success: boolean; defaultUrl?: string; error?: string }> {
    try {
      // 1. Récupérer les infos du site
      const site = await this.findSiteByDocumentId(siteId);

      if (!site) {
        throw new Error('Site non trouvé');
      }

      const domain = (site as any).custom_domain;

      // 2. Supprimer de Netlify si configuré
      if ((site as any).netlify_site_id && domain) {
        try {
          await netlifyService.removeDomainFromNetlify((site as any).netlify_site_id, domain);
        } catch (netlifyError) {
          log.warn(`Failed to remove domain from Netlify:`, netlifyError);
        }

        if (this.isApexDomain(domain)) {
          try {
            await netlifyService.removeDomainAlias((site as any).netlify_site_id, `www.${domain}`);
          } catch (wwwError) {
            log.warn(`Failed to remove www variant from Netlify:`, wwwError);
          }
        }
      }

      // 3. Récupérer l'URL par défaut Netlify
      let defaultUrl = (site as any).live_url;
      if ((site as any).netlify_site_id) {
        try {
          const netlifyInfo = await netlifyService.getSite((site as any).netlify_site_id);
          defaultUrl = netlifyInfo.url;
        } catch (error) {
          log.warn('Could not fetch default Netlify URL');
        }
      }

      // 4. Reset en base
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

      return {
        success: true,
        defaultUrl
      };

    } catch (error: any) {
      log.error(`Error removing domain:`, error);
      return {
        success: false,
        error: error.message
      };
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
   * Extrait le domaine de base (les 2 derniers labels : ex. philippechevreul.com)
   */
  private getBaseDomain(domain: string): string {
    const labels = domain.split('.');
    return labels.slice(-2).join('.');
  }

  /**
   * Retourne le nom d'hôte à saisir chez le fournisseur DNS.
   * Retire le suffixe du domaine de base, retourne '@' pour un apex.
   */
  private getDisplayName(fullName: string, baseDomain: string): string {
    if (fullName === baseDomain) {
      return '@';
    }
    const suffix = `.${baseDomain}`;
    if (fullName.endsWith(suffix)) {
      return fullName.slice(0, -suffix.length);
    }
    return fullName;
  }

  /**
   * Génère les instructions DNS pour un domaine (CNAME/A uniquement, pas de TXT)
   */
  generateDnsInstructions(domain: string, netlifyUrl: string): { isApex: boolean; baseDomain: string; records: DnsInstruction[] } {
    const isApex = this.isApexDomain(domain);
    const baseDomain = this.getBaseDomain(domain);
    const records: DnsInstruction[] = [];

    if (isApex) {
      // Apex domain : A record + CNAME www
      records.push({
        type: 'A',
        name: domain,
        displayName: this.getDisplayName(domain, baseDomain),
        value: NETLIFY_LB_IP,
        purpose: 'Pointage du domaine',
        description: `Redirige ${domain} vers le serveur d'hébergement`
      });

      const wwwName = `www.${domain}`;
      records.push({
        type: 'CNAME',
        name: wwwName,
        displayName: this.getDisplayName(wwwName, baseDomain),
        value: netlifyUrl,
        purpose: 'Redirection www',
        description: `Permet à www.${domain} de fonctionner également`
      });
    } else {
      // Subdomain : CNAME
      records.push({
        type: 'CNAME',
        name: domain,
        displayName: this.getDisplayName(domain, baseDomain),
        value: netlifyUrl,
        purpose: 'Pointage du domaine',
        description: `Redirige ${domain} vers le serveur d'hébergement`
      });
    }

    return { isApex, baseDomain, records };
  }

  /**
   * Récupère le statut SSL d'un domaine
   */
  async getSSLStatus(netlifyId: string, domain: string): Promise<any> {
    try {
      return await netlifyService.getSSLStatus(netlifyId, domain);
    } catch (error: any) {
      log.warn(`Could not get SSL status for ${domain}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export default new DomainService();

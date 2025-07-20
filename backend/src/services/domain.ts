/**
 * Domain Service - Gestion des domaines personnalisés
 */

import { promisify } from 'util';
import dns from 'dns';
import crypto from 'crypto';
import netlifyService from './netlify';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

interface DomainValidationResult {
  isValid: boolean;
  txtRecordValid: boolean;
  cnameValid: boolean;
  errors: string[];
  warnings: string[];
}

interface DomainConfiguration {
  domain: string;
  verificationToken: string;
  dnsInstructions: {
    txtRecord: {
      name: string;
      value: string;
      instructions: string;
    };
    cnameRecord: {
      name: string;
      value: string;
      instructions: string;
    };
  };
}

class DomainService {
  private readonly TXT_RECORD_PREFIX = '_netlify-cms-verification';
  private readonly NETLIFY_DNS_TARGET = 'netlify.app';

  /**
   * Génère un token de vérification unique
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Configure un domaine personnalisé pour un site
   */
  async configureDomain(siteId: string, customDomain: string): Promise<DomainConfiguration> {
    try {
      strapi.log.info(`Configuring domain ${customDomain} for site ${siteId}`);

      // 1. Valider le format du domaine
      if (!this.validateDomainFormat(customDomain)) {
        throw new Error('Format de domaine invalide');
      }

      // 2. Vérifier que le domaine n'est pas déjà utilisé
      const existingSite = await this.isDomainAlreadyUsed(customDomain, siteId);
      if (existingSite) {
        throw new Error('Ce domaine est déjà utilisé par un autre site');
      }

      // 3. Générer un token de vérification
      const verificationToken = this.generateVerificationToken();

      // 4. Mettre à jour le site en base
      await strapi.entityService.update('api::site.site', siteId, {
        data: {
          custom_domain: customDomain,
          domain_verification_token: verificationToken,
          domain_status: 'pending'
        } as any
      });

      // 5. Préparer les instructions DNS
      const dnsInstructions = this.generateDnsInstructions(customDomain, verificationToken);

      strapi.log.info(`Domain configuration prepared for ${customDomain}`);

      return {
        domain: customDomain,
        verificationToken,
        dnsInstructions
      };

    } catch (error: any) {
      strapi.log.error(`Error configuring domain ${customDomain}:`, error);
      throw error;
    }
  }

  /**
   * Vérifie la propriété d'un domaine via DNS
   */
  async verifyDomainOwnership(domain: string, token: string): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: false,
      txtRecordValid: false,
      cnameValid: false,
      errors: [],
      warnings: []
    };

    try {
      strapi.log.info(`Verifying domain ownership for ${domain}`);

      // 1. Vérifier l'enregistrement TXT
      const txtValid = await this.checkTxtRecord(domain, token);
      result.txtRecordValid = txtValid;

      if (!txtValid) {
        result.errors.push('Enregistrement TXT de vérification non trouvé ou incorrect');
      }

      // 2. Vérifier l'enregistrement CNAME
      const cnameValid = await this.checkCnameRecord(domain);
      result.cnameValid = cnameValid;

      if (!cnameValid) {
        result.errors.push('Enregistrement CNAME non configuré ou incorrect');
      }

      // 3. Validation globale
      result.isValid = txtValid && cnameValid;

      if (result.isValid) {
        strapi.log.info(`Domain ${domain} verified successfully`);
      } else {
        strapi.log.warn(`Domain ${domain} verification failed:`, result.errors);
      }

      return result;

    } catch (error: any) {
      strapi.log.error(`Error verifying domain ${domain}:`, error);
      result.errors.push(`Erreur lors de la vérification DNS: ${error.message}`);
      return result;
    }
  }

  /**
   * Vérifie l'enregistrement TXT de vérification
   */
  async checkTxtRecord(domain: string, expectedToken: string): Promise<boolean> {
    try {
      const txtRecordName = `${this.TXT_RECORD_PREFIX}.${domain}`;
      const records = await resolveTxt(txtRecordName);

      // Rechercher notre token dans les enregistrements TXT
      for (const record of records) {
        const recordValue = Array.isArray(record) ? record.join('') : record;
        if (recordValue === expectedToken) {
          return true;
        }
      }

      return false;

    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return false; // Enregistrement TXT non trouvé
      }
      throw error;
    }
  }

  /**
   * Vérifie l'enregistrement CNAME
   */
  async checkCnameRecord(domain: string): Promise<boolean> {
    try {
      const records = await resolveCname(domain);

      // Vérifier si le CNAME pointe vers Netlify
      for (const record of records) {
        if (record.endsWith(this.NETLIFY_DNS_TARGET)) {
          return true;
        }
      }

      return false;

    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return false; // Enregistrement CNAME non trouvé
      }
      throw error;
    }
  }

  /**
   * Active un domaine personnalisé après vérification
   */
  async activateCustomDomain(siteId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // 1. Récupérer les infos du site
      const site = await strapi.entityService.findOne('api::site.site', siteId);

      if (!site || !(site as any).custom_domain || !(site as any).domain_verification_token) {
        throw new Error('Site ou domaine non configuré');
      }

      // 2. Vérifier la propriété du domaine
      const validation = await this.verifyDomainOwnership((site as any).custom_domain, (site as any).domain_verification_token);

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // 3. Ajouter le domaine à Netlify
      if ((site as any).netlify_site_id) {
        await netlifyService.addDomainToNetlify((site as any).netlify_site_id, (site as any).custom_domain);
      }

      // 4. Mettre à jour le site en base
      const customUrl = `https://${(site as any).custom_domain}`;

      await strapi.entityService.update('api::site.site', siteId, {
        data: {
          domain_status: 'verified',
          live_url: customUrl,
          domain_configured_at: new Date()
        } as any
      });

      // 5. Provisionner le SSL
      if ((site as any).netlify_site_id) {
        try {
          await netlifyService.provisionSSL((site as any).netlify_site_id);
        } catch (sslError) {
          strapi.log.warn(`SSL provisioning failed for ${(site as any).custom_domain}:`, sslError);
          // Ne pas faire échouer toute l'opération pour un problème SSL
        }
      }

      strapi.log.info(`Custom domain ${(site as any).custom_domain} activated successfully`);

      return {
        success: true,
        url: customUrl
      };

    } catch (error: any) {
      strapi.log.error(`Error activating custom domain:`, error);

      // Marquer le domaine en erreur
      await strapi.entityService.update('api::site.site', siteId, {
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
      const site = await strapi.entityService.findOne('api::site.site', siteId);

      if (!site) {
        throw new Error('Site non trouvé');
      }

      // 2. Supprimer de Netlify si configuré
      if ((site as any).netlify_site_id && (site as any).custom_domain) {
        try {
          await netlifyService.removeDomainFromNetlify((site as any).netlify_site_id, (site as any).custom_domain);
        } catch (netlifyError) {
          strapi.log.warn(`Failed to remove domain from Netlify:`, netlifyError);
          // Continuer même si la suppression Netlify échoue
        }
      }

      // 3. Récupérer l'URL par défaut Netlify
      let defaultUrl = (site as any).live_url;
      if ((site as any).netlify_site_id) {
        try {
          const netlifyInfo = await netlifyService.getSite((site as any).netlify_site_id);
          defaultUrl = netlifyInfo.url;
        } catch (error) {
          strapi.log.warn('Could not fetch default Netlify URL');
        }
      }

      // 4. Reset en base
      await strapi.entityService.update('api::site.site', siteId, {
        data: {
          custom_domain: null,
          domain_verification_token: null,
          domain_status: 'pending',
          domain_configured_at: null,
          live_url: defaultUrl
        } as any
      });

      strapi.log.info(`Custom domain removed for site ${siteId}`);

      return {
        success: true,
        defaultUrl
      };

    } catch (error: any) {
      strapi.log.error(`Error removing domain:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Valide le format d'un domaine
   */
  validateDomainFormat(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  /**
   * Vérifie si un domaine est déjà utilisé
   */
  async isDomainAlreadyUsed(domain: string, excludeSiteId?: string): Promise<boolean> {
    const filters: any = { custom_domain: domain };

    if (excludeSiteId) {
      filters.id = { $ne: excludeSiteId };
    }

    const existingSites = await strapi.entityService.findMany('api::site.site', {
      filters
    });

    return existingSites && existingSites.length > 0;
  }

  /**
   * Génère les instructions DNS pour un domaine
   */
  generateDnsInstructions(domain: string, verificationToken: string) {
    return {
      txtRecord: {
        name: `${this.TXT_RECORD_PREFIX}.${domain}`,
        value: verificationToken,
        instructions: `Ajoutez un enregistrement TXT avec le nom "${this.TXT_RECORD_PREFIX}.${domain}" et la valeur "${verificationToken}" dans votre zone DNS.`
      },
      cnameRecord: {
        name: domain,
        value: this.NETLIFY_DNS_TARGET,
        instructions: `Ajoutez un enregistrement CNAME avec le nom "${domain}" pointant vers "${this.NETLIFY_DNS_TARGET}" dans votre zone DNS.`
      }
    };
  }

  /**
   * Récupère le statut SSL d'un domaine
   */
  async getSSLStatus(netlifyId: string, domain: string): Promise<any> {
    try {
      return await netlifyService.getSSLStatus(netlifyId, domain);
    } catch (error: any) {
      strapi.log.warn(`Could not get SSL status for ${domain}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export default new DomainService();

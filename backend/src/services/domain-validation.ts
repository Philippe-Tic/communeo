/**
 * Domain Validation Service - Validation avancée des domaines
 */

import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    formatValid: boolean;
    dnsResolvable: boolean;
    notReserved: boolean;
    uniqueInSystem: boolean;
  };
}

interface DomainDiagnostic {
  domain: string;
  hasARecord: boolean;
  hasAAAARecord: boolean;
  hasCNAME: boolean;
  hasTXT: boolean;
  txtRecords: string[];
  cnameRecords: string[];
  aRecords: string[];
  aaaaRecords: string[];
}

class DomainValidationService {
  private readonly RESERVED_DOMAINS = [
    'localhost',
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'invalid',
    'local'
  ];

  private readonly BLOCKED_TLDS = [
    'localhost',
    'local',
    'internal',
    'private'
  ];

  /**
   * Valide complètement un domaine
   */
  async validateDomainConfiguration(domain: string, excludeSiteId?: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {
        formatValid: false,
        dnsResolvable: false,
        notReserved: false,
        uniqueInSystem: false
      }
    };

    try {
      // 1. Validation du format
      result.details.formatValid = this.validateDomainFormat(domain);
      if (!result.details.formatValid) {
        result.errors.push('Format de domaine invalide');
        result.isValid = false;
      }

      // 2. Vérification domaines réservés
      result.details.notReserved = !this.isReservedDomain(domain);
      if (!result.details.notReserved) {
        result.errors.push('Ce domaine est réservé et ne peut pas être utilisé');
        result.isValid = false;
      }

      // 3. Vérification de l'unicité dans le système
      result.details.uniqueInSystem = await this.isDomainAvailable(domain, excludeSiteId);
      if (!result.details.uniqueInSystem) {
        result.errors.push('Ce domaine est déjà utilisé par un autre site');
        result.isValid = false;
      }

      // 4. Vérification DNS (résolution)
      result.details.dnsResolvable = await this.isDomainResolvable(domain);
      if (!result.details.dnsResolvable) {
        result.warnings.push('Le domaine ne semble pas être configuré dans le DNS. Vous devrez configurer les enregistrements DNS après validation.');
      }

      strapi.log.info(`Domain validation for ${domain}:`, result);

      return result;

    } catch (error: any) {
      strapi.log.error(`Error validating domain ${domain}:`, error);
      result.errors.push(`Erreur lors de la validation: ${error.message}`);
      result.isValid = false;
      return result;
    }
  }

  /**
   * Valide le format d'un domaine selon RFC 1035
   */
  validateDomainFormat(domain: string): boolean {
    if (!domain || typeof domain !== 'string') {
      return false;
    }

    // Nettoyer le domaine
    domain = domain.toLowerCase().trim();

    // Vérifications de base
    if (domain.length === 0 || domain.length > 253) {
      return false;
    }

    // Ne doit pas commencer ou finir par un point
    if (domain.startsWith('.') || domain.endsWith('.')) {
      return false;
    }

    // Ne doit pas contenir de double points
    if (domain.includes('..')) {
      return false;
    }

    // Diviser en labels (parties séparées par des points)
    const labels = domain.split('.');

    // Doit avoir au moins 2 labels (domaine.tld)
    if (labels.length < 2) {
      return false;
    }

    // Vérifier chaque label
    for (const label of labels) {
      if (!this.validateDomainLabel(label)) {
        return false;
      }
    }

    // Le TLD (dernier label) ne doit contenir que des lettres
    const tld = labels[labels.length - 1];
    if (!/^[a-z]{2,}$/.test(tld)) {
      return false;
    }

    // Vérifier les TLD bloqués
    if (this.BLOCKED_TLDS.includes(tld)) {
      return false;
    }

    return true;
  }

  /**
   * Valide un label de domaine individuel
   */
  private validateDomainLabel(label: string): boolean {
    // Label vide
    if (!label || label.length === 0) {
      return false;
    }

    // Taille maximum d'un label : 63 caractères
    if (label.length > 63) {
      return false;
    }

    // Ne doit pas commencer ou finir par un tiret
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }

    // Doit contenir uniquement des lettres, chiffres et tirets
    if (!/^[a-z0-9-]+$/.test(label)) {
      return false;
    }

    return true;
  }

  /**
   * Vérifie si un domaine est réservé
   */
  private isReservedDomain(domain: string): boolean {
    domain = domain.toLowerCase();

    // Vérifier les domaines exactement réservés
    if (this.RESERVED_DOMAINS.includes(domain)) {
      return true;
    }

    // Vérifier les patterns réservés
    if (domain.endsWith('.localhost') ||
        domain.endsWith('.local') ||
        domain.endsWith('.internal') ||
        domain.endsWith('.private')) {
      return true;
    }

    // Domaines IP (non supportés)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
      return true;
    }

    return false;
  }

  /**
   * Vérifie si un domaine est disponible dans le système
   */
  async isDomainAvailable(domain: string, excludeSiteId?: string): Promise<boolean> {
    try {
      const filters: any = { custom_domain: domain };

      if (excludeSiteId) {
        filters.id = { $ne: excludeSiteId };
      }

      const existingSites = await strapi.entityService.findMany('api::site.site', {
        filters
      });

      return !existingSites || existingSites.length === 0;

    } catch (error: any) {
      strapi.log.error(`Error checking domain availability:`, error);
      // En cas d'erreur, on considère le domaine comme non disponible par sécurité
      return false;
    }
  }

  /**
   * Vérifie si un domaine est résolvable dans le DNS
   */
  async isDomainResolvable(domain: string): Promise<boolean> {
    try {
      // Essayer de résoudre avec différents types d'enregistrements
      const checks = await Promise.allSettled([
        resolve4(domain),
        resolve6(domain),
        resolveCname(domain)
      ]);

      // Si au moins une résolution réussit, le domaine est résolvable
      return checks.some(result => result.status === 'fulfilled');

    } catch (error) {
      return false;
    }
  }

  /**
   * Effectue un diagnostic complet du DNS d'un domaine
   */
  async diagnoseDomainDNS(domain: string): Promise<DomainDiagnostic> {
    const diagnostic: DomainDiagnostic = {
      domain,
      hasARecord: false,
      hasAAAARecord: false,
      hasCNAME: false,
      hasTXT: false,
      txtRecords: [],
      cnameRecords: [],
      aRecords: [],
      aaaaRecords: []
    };

    try {
      // Vérifier les enregistrements A
      try {
        const aRecords = await resolve4(domain);
        diagnostic.hasARecord = aRecords.length > 0;
        diagnostic.aRecords = aRecords;
      } catch (error) {
        // Pas d'enregistrement A
      }

      // Vérifier les enregistrements AAAA
      try {
        const aaaaRecords = await resolve6(domain);
        diagnostic.hasAAAARecord = aaaaRecords.length > 0;
        diagnostic.aaaaRecords = aaaaRecords;
      } catch (error) {
        // Pas d'enregistrement AAAA
      }

      // Vérifier les enregistrements CNAME
      try {
        const cnameRecords = await resolveCname(domain);
        diagnostic.hasCNAME = cnameRecords.length > 0;
        diagnostic.cnameRecords = cnameRecords;
      } catch (error) {
        // Pas d'enregistrement CNAME
      }

      // Vérifier les enregistrements TXT
      try {
        const txtRecords = await resolveTxt(domain);
        diagnostic.hasTXT = txtRecords.length > 0;
        diagnostic.txtRecords = txtRecords.map(record =>
          Array.isArray(record) ? record.join('') : record
        );
      } catch (error) {
        // Pas d'enregistrement TXT
      }

    } catch (error: any) {
      strapi.log.error(`Error diagnosing domain ${domain}:`, error);
    }

    return diagnostic;
  }

  /**
   * Valide un nom de sous-domaine
   */
  validateSubdomain(subdomain: string): boolean {
    if (!subdomain || typeof subdomain !== 'string') {
      return false;
    }

    // Nettoyer
    subdomain = subdomain.toLowerCase().trim();

    // Vérifications de base
    if (subdomain.length === 0 || subdomain.length > 63) {
      return false;
    }

    // Ne doit pas commencer ou finir par un tiret
    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      return false;
    }

    // Doit contenir uniquement des lettres, chiffres et tirets
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return false;
    }

    // Sous-domaines réservés
    const reservedSubdomains = ['www', 'mail', 'ftp', 'admin', 'api', 'cdn', 'test', 'staging'];
    if (reservedSubdomains.includes(subdomain)) {
      return false;
    }

    return true;
  }

  /**
   * Suggère des corrections pour un domaine invalide
   */
  suggestDomainCorrections(domain: string): string[] {
    const suggestions: string[] = [];

    if (!domain || typeof domain !== 'string') {
      return suggestions;
    }

    // Nettoyer le domaine
    let cleaned = domain.toLowerCase().trim();

    // Enlever les protocoles
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/^ftp:\/\//, '');

    // Enlever les chemins
    cleaned = cleaned.split('/')[0];

    // Enlever les ports
    cleaned = cleaned.split(':')[0];

    // Si le domaine nettoyé est différent, l'ajouter comme suggestion
    if (cleaned !== domain && this.validateDomainFormat(cleaned)) {
      suggestions.push(cleaned);
    }

    // Suggestions courantes de TLD
    const commonTlds = ['.com', '.fr', '.org', '.net'];
    const baseDomain = cleaned.split('.')[0];

    for (const tld of commonTlds) {
      const suggestion = baseDomain + tld;
      if (suggestion !== cleaned && this.validateDomainFormat(suggestion)) {
        suggestions.push(suggestion);
      }
    }

    return suggestions.slice(0, 3); // Limiter à 3 suggestions
  }
}

// Export singleton instance
export default new DomainValidationService();

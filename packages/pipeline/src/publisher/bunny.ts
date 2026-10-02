/**
 * Adaptateur Bunny CDN (#382) : le seul endroit qui appelle l'API Bunny (https://api.bunny.net).
 *
 * Les fichiers des sites sont sur le serveur : écrits dans le volume `sites` par la logique de
 * `LocalPublisher` (remplacement atomique, règles Caddy du site), servis par Caddy sur l'origine
 * `https://<ORIGIN_DOMAIN>/sites/<slug>/` (#381). Bunny est devant :
 * - **une Pull Zone par commune** (`communeo-<slug>`, préfixée `dev-` hors production), d'origine
 *   `https://<ORIGIN_DOMAIN>/sites/<slug>/`, servie en Europe et en Amérique du Nord, cache d'un an vidé à
 *   chaque publication, pages gardées en cache quand le serveur est hors ligne (`UseStaleWhileOffline`) ;
 * - ses adresses : `<slug>.<SITES_DOMAIN>` (enregistrement CNAME dans la zone Bunny DNS de
 *   `SITES_DOMAIN`, `BUNNY_DNS_ZONE_ID`), le domaine de la commune ou `www.<domaine>` pour un domaine nu,
 *   chacune avec son certificat Let's Encrypt gratuit délivré par Bunny ;
 * - ses règles (Edge Rules), reconnues à leur description `Communeo : …` et tenues à jour à chaque
 *   publication : en-tête secret `X-Communeo-Origine` vers l'origine (sans lui, l'origine répond 403),
 *   redirection 301 des autres adresses vers l'adresse principale (avant le cache de Bunny : jamais une
 *   redirection mise en cache pour la mauvaise adresse), `X-Robots-Tag: noindex` sur l'adresse technique
 *   `*.b-cdn.net` (gardée pour tester un site sans toucher au DNS).
 *
 * Domaine nu (`mairie-x.fr`) : Bunny ne le sert qu'avec Bunny DNS chez la commune (aplatissement du
 * CNAME). La commune pointe donc `www` vers la Pull Zone (CNAME) et le domaine nu vers le serveur
 * (enregistrement A) : Caddy le redirige vers `www`, avec un certificat obtenu à la première visite
 * (`on_demand_tls`, autorisé par Strapi pour les seuls domaines vérifiés d'une commune).
 */
import dns from 'node:dns/promises';
import { consoleLogger, type Logger } from '../logger';
import { baseDomain, displayName, isApexDomain } from './dns';
import { LocalPublisher } from './local';
import type { DeployStatus, DnsInstructions, DnsRecord, DomainCheck, HostSite, PublisherSite, PublishResult, SitePublisher } from './types';

export const BUNNY_API_URL = 'https://api.bunny.net';
/** En-tête secret que la Pull Zone ajoute aux requêtes vers l'origine (caddy/Caddyfile) */
export const ORIGIN_SECRET_HEADER = 'X-Communeo-Origine';
const CDN_SUFFIX = '.b-cdn.net';
/** Cache de Bunny : un an, vidé à chaque publication (le navigateur suit les en-têtes de l'origine) */
const EDGE_CACHE_SECONDS = 31_536_000;
const DNS_TTL_SECONDS = 300;
const PAGE_SIZE = 1000;

/** Enums de l'API Bunny (core/openapi.json) */
const ACTION = { redirect: 1, setResponseHeader: 5, setRequestHeader: 6 } as const;
const TRIGGER_URL = 0;
const MATCH_ANY = 0;
const DNS_CNAME = 2;

/** Règles gérées par Communeo, reconnues à leur description (les autres ne sont jamais touchées) */
const RULE_PREFIX = 'Communeo : ';
export const BUNNY_RULES = {
  originSecret: `${RULE_PREFIX}en-tête secret vers l'origine`,
  canonical: `${RULE_PREFIX}redirection vers l'adresse principale`,
  technicalHost: `${RULE_PREFIX}adresse technique non indexée`,
} as const;

interface BunnyHostname {
  Id?: number;
  Value: string;
  ForceSSL?: boolean;
  IsSystemHostname?: boolean;
  HasCertificate?: boolean;
}

interface BunnyTrigger {
  Type: number;
  PatternMatches: string[];
  PatternMatchingType: number;
  Parameter1?: string | null;
}

export interface BunnyEdgeRule {
  Guid?: string | null;
  ActionType: number;
  ActionParameter1?: string | null;
  ActionParameter2?: string | null;
  Triggers: BunnyTrigger[];
  TriggerMatchingType: number;
  Description: string;
  Enabled: boolean;
}

interface BunnyPullZone {
  Id: number;
  Name: string;
  OriginUrl?: string;
  Hostnames?: BunnyHostname[];
  EdgeRules?: BunnyEdgeRule[];
}

interface BunnyDnsRecord {
  Id: number;
  Type: number;
  Name: string;
  Value: string;
}

interface BunnyDnsZone {
  Id: number;
  Domain: string;
  Records?: BunnyDnsRecord[];
}

export class BunnyApiError extends Error {
  constructor(
    readonly status: number,
    body: string,
    endpoint: string,
  ) {
    const hint = status === 401 ? ' (clé BUNNY_API_KEY refusée)' : status === 429 ? ' (trop de requêtes)' : '';
    super(`Bunny API ${status}${hint} sur ${endpoint} : ${body.slice(0, 500)}`);
    this.name = 'BunnyApiError';
  }
}

export interface BunnyPublisherOptions {
  apiKey: string;
  /** Valeur de l'en-tête `X-Communeo-Origine` (SITES_ORIGIN_SECRET), attendue par l'origine */
  originSecret: string;
  /** Nom de l'origine des sites servie par Caddy (ORIGIN_DOMAIN), ex. origine.communeo.fr */
  originDomain: string;
  /** Domaine des adresses Communeo, `<slug>.<sitesDomain>` (SITES_DOMAIN) */
  sitesDomain?: string;
  /** Zone Bunny DNS de `sitesDomain` (BUNNY_DNS_ZONE_ID) : sans elle, aucun enregistrement n'est créé */
  dnsZoneId?: string | number;
  /** Dossier des sites (volume `sites`, `/srv/sites`) */
  sitesDir: string;
  /** API d'administration de Caddy, rechargé après chaque publication (worker) */
  caddyAdminUrl?: string;
  /** Préfixe des noms de Pull Zones (`dev-` hors production) */
  namePrefix?: string;
  fetch?: typeof fetch;
  resolveCname?: (domain: string) => Promise<string[]>;
  resolve4?: (domain: string) => Promise<string[]>;
  resolve6?: (domain: string) => Promise<string[]>;
  sleep?: (ms: number) => Promise<void>;
  logger?: Logger;
  /** Tentatives par requête quand Bunny répond 429 ou 5xx (défaut 3) */
  maxAttempts?: number;
}

export class BunnyPublisher implements SitePublisher {
  readonly id = 'bunny';
  readonly configured = true;

  private readonly options: BunnyPublisherOptions;
  private readonly sitesDomain: string | null;
  private readonly namePrefix: string;
  private readonly files: LocalPublisher;
  private readonly fetch: typeof fetch;
  private readonly resolveCname: (domain: string) => Promise<string[]>;
  private readonly resolve4: (domain: string) => Promise<string[]>;
  private readonly resolve6: (domain: string) => Promise<string[]>;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly log: Logger;

  constructor(options: BunnyPublisherOptions) {
    this.options = options;
    this.sitesDomain = options.sitesDomain?.trim().replace(/^\.+|\.+$/g, '').toLowerCase() || null;
    this.namePrefix = options.namePrefix ?? '';
    this.fetch = options.fetch ?? globalThis.fetch;
    this.resolveCname = options.resolveCname ?? ((domain) => dns.resolveCname(domain));
    this.resolve4 = options.resolve4 ?? ((domain) => dns.resolve4(domain));
    this.resolve6 = options.resolve6 ?? ((domain) => dns.resolve6(domain));
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.log = options.logger ?? consoleLogger;
    // Écriture des fichiers : celle de la publication locale (copie complète, échange, règles Caddy)
    this.files = new LocalPublisher({ root: options.sitesDir, caddyAdminUrl: options.caddyAdminUrl, fetch: options.fetch, logger: this.log });
  }

  // Sites

  async ensureSite(site: PublisherSite): Promise<HostSite> {
    return this.toHostSite(await this.ensureZone(site));
  }

  /**
   * Pull Zone de la commune, son adresse Communeo (enregistrement DNS et certificat) et ses règles.
   * Appelé à chaque publication : ce qui manque (adresse refusée, certificat pas encore délivré…) est
   * redemandé.
   */
  private async ensureZone(site: PublisherSite): Promise<BunnyPullZone> {
    const zone = (await this.findZone(site)) ?? (await this.createZone(site));
    await this.ensureCommuneoAddress(zone, site.slug);
    await this.syncEdgeRules(zone, site.customDomain ?? null);
    return zone;
  }

  private async findZone(site: PublisherSite): Promise<BunnyPullZone | null> {
    if (site.hostId && /^\d+$/.test(site.hostId)) {
      try {
        return await this.getZone(site.hostId);
      } catch (error) {
        if (!(error instanceof BunnyApiError && error.status === 404)) throw error;
        this.log.warn(`[BUNNY] Pull Zone ${site.hostId} introuvable, recherche par nom`);
      }
    }
    // Pas d'identifiant Bunny (site encore chez Netlify, #383) : retrouvée par son nom
    return this.findZoneByName(this.zoneName(site.slug));
  }

  private async createZone(site: PublisherSite): Promise<BunnyPullZone> {
    const name = this.zoneName(site.slug);
    this.log.info(`[BUNNY] Création de la Pull Zone ${name}`);
    try {
      const created = await this.request<BunnyPullZone | null>('POST', '/pullzone', this.zoneSettings(site.slug, name));
      if (created?.Id) return { Hostnames: [], EdgeRules: [], ...created };
    } catch (error) {
      // Nom déjà pris : créée par une tentative précédente (réponse perdue), sinon par un autre compte
      if (!(error instanceof BunnyApiError && error.status === 400)) throw error;
      const existing = await this.findZoneByName(name);
      if (existing) return existing;
      throw error;
    }
    const zone = await this.findZoneByName(name);
    if (!zone) throw new Error(`Pull Zone ${name} créée mais introuvable`);
    return zone;
  }

  /**
   * Réglages de la Pull Zone. Régions : Europe (les communes et leurs habitants) et Amérique du Nord
   * (Antilles, Saint-Pierre-et-Miquelon), au même prix ; les visiteurs d'ailleurs (La Réunion, Mayotte,
   * Pacifique) sont servis depuis l'Europe, sans payer les régions plus chères.
   */
  zoneSettings(slug: string, name = this.zoneName(slug)): Record<string, unknown> {
    return {
      Name: name,
      OriginUrl: this.originUrl(slug),
      Type: 0,
      EnableGeoZoneEU: true,
      EnableGeoZoneUS: true,
      EnableGeoZoneASIA: false,
      EnableGeoZoneSA: false,
      EnableGeoZoneAF: false,
      // Serveur hors ligne ou page en cours de rafraîchissement : la version en cache est servie
      UseStaleWhileOffline: true,
      UseStaleWhileUpdating: true,
      VerifyOriginSSL: true,
      // Cache de Bunny d'un an, vidé à chaque publication ; jamais d'erreur gardée en cache
      CacheControlMaxAgeOverride: EDGE_CACHE_SECONDS,
      CacheErrorResponses: false,
      // Les redirections de l'ancien site portent sur la requête (`/?p=12`) : une entrée de cache par requête
      IgnoreQueryStrings: false,
      EnableQueryStringOrdering: true,
      // Journaux de Bunny sans l'adresse IP complète des visiteurs
      EnableLogging: true,
      LoggingIPAnonymizationEnabled: true,
    };
  }

  async deleteSite(site: PublisherSite): Promise<void> {
    const zone = await this.findZone(site);
    // Le nom de la Pull Zone fait foi (le site d'une commune supprimée n'est connu que par son identifiant)
    const slug = (zone && this.slugOf(zone.Name)) || site.slug;
    const failures: unknown[] = [];
    const attempt = async (label: string, action: () => Promise<void>) => {
      try {
        await action();
      } catch (error) {
        this.log.error(`[BUNNY] ${label} :`, error);
        failures.push(error);
      }
    };

    if (zone) {
      await attempt(`Pull Zone ${zone.Name} non supprimée`, async () => {
        this.log.info(`[BUNNY] Suppression de la Pull Zone ${zone.Name}`);
        await this.request('DELETE', `/pullzone/${zone.Id}`).catch(ignoreStatus(404));
      });
    }
    const address = this.communeoHost(slug);
    if (address) await attempt(`Enregistrement DNS ${address} non supprimé`, () => this.removeDnsRecord(address, this.cdnHost(zone?.Name ?? this.zoneName(slug))));
    if (/^[a-z0-9-]+$/.test(slug)) await attempt(`Dossier du site ${slug} non supprimé`, () => this.files.deleteSite({ ...site, slug }));

    if (failures.length) throw failures[0];
  }

  // Publication

  async publish(site: PublisherSite, dir: string, options: { onUploaded?: () => Promise<void> | void } = {}): Promise<PublishResult> {
    const zone = await this.ensureZone(site);
    const written = await this.files.publish(site, dir);
    await options.onUploaded?.();
    // Domaine vérifié : son certificat est redemandé tant qu'il manque
    const canonical = site.customDomain ? this.canonicalDomain(site.customDomain) : null;
    if (canonical) {
      // Domaine vérifié chez Netlify avant le passage à Bunny (#383) : rattaché à la Pull Zone
      await this.addHostname(zone, canonical).catch((error) => this.log.error(`[BUNNY] Adresse ${canonical} non ajoutée à ${zone.Name} :`, error));
      await this.ensureCertificate(zone, canonical);
    }
    await this.request('POST', `/pullzone/${zone.Id}/purgeCache`);
    this.log.info(`[BUNNY] ${site.slug} publié, cache de ${zone.Name} vidé`);
    return { ...this.toHostSite(zone), deployId: written.deployId.replace(/^local-/, 'bunny-'), state: 'ready' };
  }

  async status(): Promise<DeployStatus> {
    // La publication est terminée quand `publish` rend la main (fichiers en place, cache vidé)
    return { state: 'ready' };
  }

  // Domaines

  canonicalDomain(domain: string): string {
    const host = domain.trim().toLowerCase();
    return isApexDomain(host) ? `www.${host}` : host;
  }

  async configureDomain(site: PublisherSite, domain: string): Promise<DnsInstructions> {
    const zone = await this.requireZone(site);
    const host = this.canonicalDomain(domain);
    try {
      await this.addHostname(zone, host);
    } catch (error) {
      if (error instanceof BunnyApiError && error.status === 400) {
        throw new Error(`Bunny a refusé le domaine ${host} : il est peut-être déjà associé à un autre site.`);
      }
      throw error;
    }
    return this.instructionsFor(zone.Name, domain);
  }

  async dnsInstructions(site: PublisherSite, domain: string): Promise<DnsInstructions> {
    const zone = site.hostId ? await this.findZone(site) : null;
    return this.instructionsFor(zone?.Name ?? this.zoneName(site.slug), domain);
  }

  async verifyDomain(site: PublisherSite, domain: string): Promise<DomainCheck> {
    const zone = await this.requireZone(site);
    const target = this.cdnHost(zone.Name);
    const host = this.canonicalDomain(domain);

    const found = (await lookup(() => this.resolveCname(host))).map(normalizeHost);
    // Domaine chez Bunny DNS (CNAME aplati) : pas de CNAME visible, mais la réponse vient de la Pull Zone
    if (!found.includes(target) && !(await this.servedByZone(host, zone.Id))) {
      return {
        ok: false,
        errors: [`Enregistrement CNAME de ${host} non configuré ou incorrect`],
        mismatch: { type: 'CNAME', name: host, expected: target, found },
      };
    }

    if (isApexDomain(domain)) {
      const { v4 } = await this.serverAddresses();
      const apex = await lookup(() => this.resolve4(domain));
      // Toutes les adresses du domaine nu : une ancienne adresse restante enverrait une partie des visiteurs ailleurs
      if (!apex.length || apex.some((address) => !v4.includes(address))) {
        return {
          ok: false,
          errors: [`Enregistrement A de ${domain} non configuré ou ne pointe pas seulement vers ${v4.join(', ')}`],
          mismatch: { type: 'A', name: domain, expected: v4.join(', '), found: apex },
        };
      }
    }

    // Domaine configuré avant le passage à Bunny (#383) : rattaché ici
    await this.addHostname(zone, host);
    await this.ensureCertificate(zone, host);
    return { ok: true, errors: [] };
  }

  async removeDomain(site: PublisherSite, domain: string): Promise<{ defaultUrl: string | null }> {
    const zone = site.hostId ? await this.findZone(site) : null;
    if (!zone) return { defaultUrl: null };
    const host = domain.trim().toLowerCase();
    for (const name of new Set([host, this.canonicalDomain(host)])) {
      if (!hasHostname(zone, name)) continue;
      try {
        await this.request('DELETE', `/pullzone/${zone.Id}/removeHostname`, { Hostname: name });
        zone.Hostnames = (zone.Hostnames ?? []).filter((entry) => entry.Value.toLowerCase() !== name);
      } catch (error) {
        this.log.warn(`[BUNNY] Adresse ${name} non retirée de ${zone.Name} :`, error);
      }
    }
    // Plus de redirection vers ce domaine, sans attendre la prochaine publication
    await this.syncEdgeRules(zone, null);
    return { defaultUrl: this.toHostSite(zone).defaultUrl };
  }

  async certificateStatus(site: PublisherSite): Promise<unknown | null> {
    if (!site.hostId) return null;
    try {
      const zone = await this.findZone(site);
      if (!zone) return null;
      return {
        hostnames: (zone.Hostnames ?? [])
          .filter((entry) => !entry.IsSystemHostname)
          .map((entry) => ({ hostname: entry.Value, certificate: !!entry.HasCertificate, forceSsl: !!entry.ForceSSL })),
      };
    } catch (error) {
      this.log.warn(`[BUNNY] État des certificats indisponible pour ${site.hostId} :`, error);
      return null;
    }
  }

  // Interne : adresses, certificats, DNS

  /** `<slug>.<SITES_DOMAIN>` sur la Pull Zone, son enregistrement DNS et son certificat ; un échec ne bloque pas */
  private async ensureCommuneoAddress(zone: BunnyPullZone, slug: string): Promise<void> {
    const host = this.communeoHost(slug);
    if (!host) return;
    try {
      await this.addHostname(zone, host);
    } catch (error) {
      this.log.error(`[BUNNY] Adresse ${host} non ajoutée à ${zone.Name} :`, error);
      return;
    }
    try {
      await this.ensureDnsRecord(host, this.cdnHost(zone.Name));
    } catch (error) {
      this.log.error(`[BUNNY] Enregistrement DNS de ${host} non créé :`, error);
    }
    await this.ensureCertificate(zone, host);
  }

  private async addHostname(zone: BunnyPullZone, host: string): Promise<void> {
    if (hasHostname(zone, host)) return;
    await this.request('POST', `/pullzone/${zone.Id}/addHostname`, { Hostname: host });
    zone.Hostnames = [...(zone.Hostnames ?? []), { Value: host, HasCertificate: false, ForceSSL: false }];
    this.log.info(`[BUNNY] Adresse ${host} ajoutée à ${zone.Name}`);
  }

  /**
   * Certificat Let's Encrypt gratuit de Bunny, puis https forcé. Délivré seulement quand l'adresse pointe
   * vers Bunny : un échec est consigné, le certificat sera redemandé à la prochaine publication.
   */
  private async ensureCertificate(zone: BunnyPullZone, host: string): Promise<void> {
    const entry = (zone.Hostnames ?? []).find((hostname) => hostname.Value.toLowerCase() === host);
    if (!entry || (entry.HasCertificate && entry.ForceSSL)) return;
    try {
      if (!entry.HasCertificate) {
        await this.request('GET', `/pullzone/loadFreeCertificate?hostname=${encodeURIComponent(host)}`);
        entry.HasCertificate = true;
      }
      await this.request('POST', `/pullzone/${zone.Id}/setForceSSL`, { Hostname: host, ForceSSL: true });
      entry.ForceSSL = true;
      this.log.info(`[BUNNY] Certificat HTTPS actif pour ${host}`);
    } catch (error) {
      this.log.warn(`[BUNNY] Certificat HTTPS de ${host} pas encore délivré :`, error instanceof Error ? error.message : error);
    }
  }

  /** CNAME `<slug>` → `<zone>.b-cdn.net` dans la zone Bunny DNS ; un autre enregistrement du même nom est laissé tel quel */
  private async ensureDnsRecord(host: string, target: string): Promise<void> {
    const dnsZone = await this.dnsZone();
    if (!dnsZone) return;
    const name = relativeName(host, dnsZone.Domain);
    if (name === null) {
      this.log.warn(`[BUNNY] ${host} n'est pas dans la zone DNS ${dnsZone.Domain} : aucun enregistrement créé`);
      return;
    }
    const records = (dnsZone.Records ?? []).filter((record) => record.Name.toLowerCase() === name);
    const cname = records.find((record) => record.Type === DNS_CNAME);
    if (cname && normalizeHost(cname.Value) === target) return;
    if (cname) {
      await this.request('POST', `/dnszone/${dnsZone.Id}/records/${cname.Id}`, { Id: cname.Id, Type: DNS_CNAME, Name: name, Value: target, Ttl: DNS_TTL_SECONDS });
    } else if (records.length) {
      this.log.warn(`[BUNNY] ${host} a déjà un enregistrement DNS d'un autre type : laissé tel quel`);
      return;
    } else {
      await this.request('PUT', `/dnszone/${dnsZone.Id}/records`, { Type: DNS_CNAME, Name: name, Value: target, Ttl: DNS_TTL_SECONDS, Comment: 'Communeo : adresse du site de la commune' });
    }
    this.log.info(`[BUNNY] DNS : ${host} → ${target}`);
  }

  /** Supprime le CNAME de la commune, seulement s'il pointe vers sa Pull Zone */
  private async removeDnsRecord(host: string, target: string): Promise<void> {
    const dnsZone = await this.dnsZone();
    if (!dnsZone) return;
    const name = relativeName(host, dnsZone.Domain);
    const ours = (dnsZone.Records ?? []).filter((record) => record.Type === DNS_CNAME && record.Name.toLowerCase() === name && normalizeHost(record.Value) === target);
    for (const record of ours) {
      await this.request('DELETE', `/dnszone/${dnsZone.Id}/records/${record.Id}`).catch(ignoreStatus(404));
      this.log.info(`[BUNNY] DNS : ${host} supprimé`);
    }
  }

  private async dnsZone(): Promise<BunnyDnsZone | null> {
    if (!this.options.dnsZoneId) return null;
    return this.request<BunnyDnsZone>('GET', `/dnszone/${this.options.dnsZoneId}`);
  }

  // Interne : règles de la Pull Zone

  /** Règles `Communeo : …` voulues pour cette Pull Zone */
  edgeRules(zone: BunnyPullZone, customDomain: string | null): BunnyEdgeRule[] {
    const onUrls = (patterns: string[]): Pick<BunnyEdgeRule, 'Triggers' | 'TriggerMatchingType'> => ({
      // Au plus 5 conditions par déclencheur (limites de Bunny) ; un déclencheur suffit à appliquer la règle
      Triggers: chunk(patterns, 5).map((group) => ({ Type: TRIGGER_URL, PatternMatches: group, PatternMatchingType: MATCH_ANY })),
      TriggerMatchingType: MATCH_ANY,
    });
    const technical = this.cdnHost(zone.Name);
    const rules: BunnyEdgeRule[] = [
      {
        Description: BUNNY_RULES.originSecret,
        Enabled: true,
        ActionType: ACTION.setRequestHeader,
        ActionParameter1: ORIGIN_SECRET_HEADER,
        ActionParameter2: this.options.originSecret,
        ...onUrls(['*']),
      },
      {
        Description: BUNNY_RULES.technicalHost,
        Enabled: true,
        ActionType: ACTION.setResponseHeader,
        ActionParameter1: 'X-Robots-Tag',
        ActionParameter2: 'noindex, nofollow',
        ...onUrls([`*://${technical}/*`]),
      },
    ];
    // Domaine vérifié : les autres adresses de la Pull Zone y redirigent (l'adresse technique reste testable)
    const canonical = customDomain ? this.canonicalDomain(customDomain) : null;
    const others = canonical
      ? (zone.Hostnames ?? []).map((entry) => entry.Value.toLowerCase()).filter((host) => host !== canonical && host !== technical && !host.endsWith(CDN_SUFFIX))
      : [];
    if (canonical && others.length) {
      rules.push({
        Description: BUNNY_RULES.canonical,
        Enabled: true,
        ActionType: ACTION.redirect,
        // {{path}} : chemin et requête (variables des Edge Rules)
        ActionParameter1: `https://${canonical}{{path}}`,
        ActionParameter2: '301',
        ...onUrls(others.map((host) => `*://${host}/*`)),
      });
    }
    return rules;
  }

  /** Ajoute, met à jour ou retire les règles `Communeo : …` ; celles qui n'ont pas changé ne sont pas renvoyées */
  private async syncEdgeRules(zone: BunnyPullZone, customDomain: string | null): Promise<void> {
    const wanted = this.edgeRules(zone, customDomain);
    const current = (zone.EdgeRules ?? []).filter((rule) => rule.Description?.startsWith(RULE_PREFIX));
    for (const rule of wanted) {
      const existing = current.find((candidate) => candidate.Description === rule.Description);
      if (existing && sameRule(existing, rule)) continue;
      await this.request('POST', `/pullzone/${zone.Id}/edgerules/addOrUpdate`, { ...rule, Guid: existing?.Guid ?? null });
    }
    for (const rule of current) {
      if (wanted.some((candidate) => candidate.Description === rule.Description) || !rule.Guid) continue;
      await this.request('DELETE', `/pullzone/${zone.Id}/edgerules/${rule.Guid}`).catch(ignoreStatus(404));
    }
    zone.EdgeRules = [...(zone.EdgeRules ?? []).filter((rule) => !rule.Description?.startsWith(RULE_PREFIX)), ...wanted];
  }

  // Interne : instructions DNS

  private async instructionsFor(zoneName: string, domain: string): Promise<DnsInstructions> {
    const base = baseDomain(domain);
    const target = this.cdnHost(zoneName);
    const record = (type: DnsRecord['type'], name: string, value: string, purpose: string, description: string): DnsRecord => ({
      type,
      name,
      displayName: displayName(name, base),
      value,
      purpose,
      description,
    });

    const apex = isApexDomain(domain);
    if (!apex) {
      return {
        isApex: false,
        baseDomain: base,
        target,
        records: [record('CNAME', domain, target, 'Pointage du domaine', `Fait afficher le site de la mairie sur ${domain}`)],
      };
    }
    const { v4, v6 } = await this.serverAddresses();
    return {
      isApex: true,
      baseDomain: base,
      target,
      records: [
        record('CNAME', `www.${domain}`, target, 'Adresse du site', `Fait afficher le site de la mairie sur www.${domain}`),
        ...v4.map((address) =>
          record('A', domain, address, 'Domaine sans www', `Envoie les visiteurs de ${domain} vers www.${domain} (remplace les autres enregistrements A de ${domain})`),
        ),
        ...v6.map((address) =>
          record('AAAA', domain, address, 'Domaine sans www (IPv6)', `Envoie les visiteurs de ${domain} vers www.${domain} (remplace les autres enregistrements AAAA de ${domain})`),
        ),
      ],
    };
  }

  /** Adresses du serveur (celles de l'origine) : cible du domaine nu, redirigé vers www par Caddy */
  private async serverAddresses(): Promise<{ v4: string[]; v6: string[] }> {
    const v4 = await lookup(() => this.resolve4(this.options.originDomain));
    if (!v4.length) throw new Error(`Adresse du serveur introuvable : ${this.options.originDomain} ne résout pas`);
    const v6 = await lookup(() => this.resolve6(this.options.originDomain));
    return { v4, v6 };
  }

  /** La réponse vient-elle de cette Pull Zone ? (en-tête `CDN-PullZone`, en http : le certificat manque peut-être) */
  private async servedByZone(host: string, zoneId: number): Promise<boolean> {
    try {
      const response = await this.fetch(`http://${host}/`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5000) });
      return response.headers.get('cdn-pullzone') === String(zoneId);
    } catch {
      return false;
    }
  }

  // Interne : noms et API

  private zoneName(slug: string): string {
    return `${this.namePrefix}communeo-${slug}`;
  }

  private slugOf(zoneName: string): string | null {
    const prefix = `${this.namePrefix}communeo-`;
    return zoneName.startsWith(prefix) ? zoneName.slice(prefix.length) : null;
  }

  private cdnHost(zoneName: string): string {
    return `${zoneName.toLowerCase()}${CDN_SUFFIX}`;
  }

  private communeoHost(slug: string): string | null {
    return this.sitesDomain ? `${slug}.${this.sitesDomain}` : null;
  }

  private originUrl(slug: string): string {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Slug invalide : ${slug}`);
    return `https://${this.options.originDomain}/sites/${slug}/`;
  }

  /** L'adresse Communeo si elle est sur la Pull Zone, sinon l'adresse technique `*.b-cdn.net` */
  private toHostSite(zone: BunnyPullZone): HostSite {
    const slug = this.slugOf(zone.Name);
    const communeo = slug ? this.communeoHost(slug) : null;
    const host = communeo && hasHostname(zone, communeo) ? communeo : this.cdnHost(zone.Name);
    return { hostId: String(zone.Id), defaultUrl: `https://${host}` };
  }

  private async requireZone(site: PublisherSite): Promise<BunnyPullZone> {
    const zone = site.hostId ? await this.findZone(site) : null;
    if (!zone) throw new Error("Le site doit être publié au moins une fois avant d'ajouter un domaine personnalisé");
    return zone;
  }

  private getZone(id: string | number): Promise<BunnyPullZone> {
    return this.request('GET', `/pullzone/${id}`);
  }

  private async findZoneByName(name: string): Promise<BunnyPullZone | null> {
    for (let page = 1; ; page++) {
      const query = new URLSearchParams({ search: name, page: String(page), perPage: String(PAGE_SIZE) });
      const result = await this.request<{ Items?: BunnyPullZone[]; HasMoreItems?: boolean } | BunnyPullZone[]>('GET', `/pullzone?${query}`);
      const items = Array.isArray(result) ? result : (result?.Items ?? []);
      const found = items.find((zone) => zone.Name === name);
      if (found) return found;
      if (Array.isArray(result) || !result?.HasMoreItems || !items.length) return null;
    }
  }

  /** Requête à l'API ; 429 et 5xx (et coupure réseau) réessayés avec un délai croissant ou celui de `Retry-After` */
  private async request<T = unknown>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const attempts = this.options.maxAttempts ?? 3;
    const label = `${method} ${endpoint.split('?')[0]}`;
    for (let attempt = 1; ; attempt++) {
      let response: Response;
      try {
        response = await this.fetch(`${BUNNY_API_URL}${endpoint}`, {
          method,
          headers: { AccessKey: this.options.apiKey, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        if (attempt >= attempts) throw error;
        await this.sleep(backoff(attempt));
        continue;
      }
      const text = await response.text();
      if (response.ok) return (text ? JSON.parse(text) : null) as T;
      if ((response.status === 429 || response.status >= 500) && attempt < attempts) {
        this.log.warn(`[BUNNY] ${label} : ${response.status}, nouvel essai`);
        await this.sleep(retryAfter(response) ?? backoff(attempt));
        continue;
      }
      throw new BunnyApiError(response.status, text, label);
    }
  }
}

function hasHostname(zone: BunnyPullZone, host: string): boolean {
  return (zone.Hostnames ?? []).some((entry) => entry.Value.toLowerCase() === host.toLowerCase());
}

function sameRule(current: BunnyEdgeRule, wanted: BunnyEdgeRule): boolean {
  const triggers = (rule: BunnyEdgeRule) =>
    JSON.stringify((rule.Triggers ?? []).map((trigger) => [trigger.Type, trigger.PatternMatches ?? [], trigger.PatternMatchingType]));
  return (
    current.ActionType === wanted.ActionType &&
    (current.ActionParameter1 ?? '') === (wanted.ActionParameter1 ?? '') &&
    (current.ActionParameter2 ?? '') === (wanted.ActionParameter2 ?? '') &&
    current.TriggerMatchingType === wanted.TriggerMatchingType &&
    current.Enabled === wanted.Enabled &&
    triggers(current) === triggers(wanted)
  );
}

/** Nom d'un enregistrement dans sa zone DNS (`lyon` pour lyon.communeo.fr), `null` hors de la zone */
function relativeName(host: string, zoneDomain: string): string | null {
  const domain = normalizeHost(zoneDomain);
  if (host === domain) return '';
  return host.endsWith(`.${domain}`) ? host.slice(0, -domain.length - 1) : null;
}

function normalizeHost(host: string): string {
  return host.trim().replace(/\.$/, '').toLowerCase();
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

function backoff(attempt: number): number {
  return 1000 * 2 ** (attempt - 1);
}

function retryAfter(response: Response): number | null {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 60) * 1000 : null;
}

/** Ignore une réponse d'erreur de ce statut (déjà supprimé…) */
function ignoreStatus(status: number) {
  return (error: unknown) => {
    if (!(error instanceof BunnyApiError && error.status === status)) throw error;
  };
}

const DNS_MISSES = new Set(['ENOTFOUND', 'ENODATA', 'ESERVFAIL', 'ENOTIMP', 'EREFUSED']);

/** Résolution DNS : un nom absent n'est pas une erreur, juste aucun enregistrement. */
async function lookup(resolve: () => Promise<string[]>): Promise<string[]> {
  try {
    return await resolve();
  } catch (error) {
    if (DNS_MISSES.has((error as NodeJS.ErrnoException).code ?? '')) return [];
    throw error;
  }
}

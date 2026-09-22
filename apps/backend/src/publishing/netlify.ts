/**
 * Adaptateur Netlify : le seul endroit du backend qui appelle l'API Netlify.
 * Un site Netlify par commune (`<slug>-mairie`, préfixé `dev-` hors production), publié par dépôt ZIP.
 */
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import { log } from '../utils/logger';
import { baseDomain, displayName, isApexDomain } from './dns';
import type {
  DeployState,
  DeployStatus,
  DnsInstructions,
  DnsRecord,
  DomainCheck,
  HostSite,
  PublisherSite,
  PublishResult,
  SitePublisher,
} from './types';

const API_URL = 'https://api.netlify.com/api/v1';
/** Répartiteur de charge Netlify, cible des enregistrements A pour un apex */
export const NETLIFY_LOAD_BALANCER_IP = '75.2.60.5';
const DNS_SUFFIX = '.netlify.app';
const PAGE_SIZE = 100;

interface NetlifySite {
  id: string;
  name: string;
  url?: string;
  custom_domain?: string | null;
  domain_aliases?: string[];
}

interface NetlifyDeploy {
  id: string;
  state: string;
  error_message?: string | null;
}

export class NetlifyApiError extends Error {
  constructor(readonly status: number, body: string) {
    super(`Netlify API ${status}: ${body}`);
    this.name = 'NetlifyApiError';
  }
}

export interface NetlifyPublisherOptions {
  token: string;
  /** Préfixe des noms de sites Netlify (`dev-` hors production) */
  namePrefix?: string;
  fetch?: typeof fetch;
  resolveCname?: (domain: string) => Promise<string[]>;
  resolve4?: (domain: string) => Promise<string[]>;
  sleep?: (ms: number) => Promise<void>;
  /** Attente maximale de la mise en ligne d'un dépôt, en ms */
  deployTimeoutMs?: number;
  pollIntervalMs?: number;
}

export class NetlifyPublisher implements SitePublisher {
  readonly id = 'netlify';
  readonly configured = true;

  private readonly token: string;
  private readonly namePrefix: string;
  private readonly fetch: typeof fetch;
  private readonly resolveCname: (domain: string) => Promise<string[]>;
  private readonly resolve4: (domain: string) => Promise<string[]>;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly deployTimeoutMs: number;
  private readonly pollIntervalMs: number;

  constructor(options: NetlifyPublisherOptions) {
    this.token = options.token;
    this.namePrefix = options.namePrefix ?? '';
    this.fetch = options.fetch ?? globalThis.fetch;
    this.resolveCname = options.resolveCname ?? ((domain) => dns.resolveCname(domain));
    this.resolve4 = options.resolve4 ?? ((domain) => dns.resolve4(domain));
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.deployTimeoutMs = options.deployTimeoutMs ?? 60_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
  }

  // Sites

  async ensureSite(site: PublisherSite): Promise<HostSite> {
    if (site.hostId) {
      try {
        return this.toHostSite(await this.getSite(site.hostId));
      } catch (error) {
        // Site supprimé côté Netlify : on le retrouve par son nom ou on le recrée
        if (!(error instanceof NetlifyApiError && error.status === 404)) throw error;
        log.warn(`[NETLIFY] Site ${site.hostId} introuvable, recherche par nom`);
      }
    }

    const name = this.siteName(site);
    const existing = await this.findSiteByName(name);
    if (existing) return this.toHostSite(existing);

    log.info(`[NETLIFY] Création du site ${name}`);
    const created: NetlifySite = await this.request('/sites', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return this.toHostSite(created);
  }

  async deleteSite(site: PublisherSite): Promise<void> {
    if (!site.hostId) return;
    log.info(`[NETLIFY] Suppression du site ${site.hostId}`);
    await this.request(`/sites/${site.hostId}`, { method: 'DELETE' });
  }

  // Publication

  async publish(site: PublisherSite, dir: string): Promise<PublishResult> {
    const host = await this.ensureSite(site);
    if (site.customDomain) await this.redirectDefaultDomain(dir, host, site.customDomain);
    const zip = await zipDirectory(dir);
    log.info(`[NETLIFY] Dépôt de ${(zip.length / 1024 / 1024).toFixed(2)} Mo sur ${host.hostId}`);

    const deploy: NetlifyDeploy = await this.request(`/sites/${host.hostId}/deploys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/zip' },
      body: zip,
    });

    const state = await this.waitForDeploy(host.hostId, deploy.id);
    return { ...host, deployId: deploy.id, state };
  }

  async status(deployId: string): Promise<DeployStatus> {
    const deploy: NetlifyDeploy = await this.request(`/deploys/${deployId}`);
    const state = toDeployState(deploy.state);
    return state === 'error' ? { state, error: deploy.error_message || `Dépôt ${deploy.state}` } : { state };
  }

  // Domaines

  async configureDomain(site: PublisherSite, domain: string): Promise<DnsInstructions> {
    const hostId = requireHostId(site);
    const updated: NetlifySite = await this.request(`/sites/${hostId}`, {
      method: 'PATCH',
      body: JSON.stringify({ custom_domain: domain }),
    });
    // Netlify répond 200 mais garde l'ancien domaine quand il est pris par un autre compte
    if (updated.custom_domain !== domain) {
      throw new Error(
        `Netlify a refusé le domaine ${domain} : il est peut-être déjà associé à un autre compte Netlify.`,
      );
    }

    if (isApexDomain(domain)) {
      try {
        await this.setAliases(updated, [...(updated.domain_aliases ?? []), `www.${domain}`]);
      } catch (error) {
        log.warn(`[NETLIFY] Alias www.${domain} non ajouté:`, error);
      }
    }

    return this.instructionsFor(updated.name, domain);
  }

  async dnsInstructions(site: PublisherSite, domain: string): Promise<DnsInstructions> {
    const name = site.hostId ? (await this.getSite(site.hostId)).name : this.siteName(site);
    return this.instructionsFor(name, domain);
  }

  async verifyDomain(site: PublisherSite, domain: string): Promise<DomainCheck> {
    const hostId = requireHostId(site);
    const apex = isApexDomain(domain);
    const pointed = apex
      ? (await lookup(() => this.resolve4(domain))).includes(NETLIFY_LOAD_BALANCER_IP)
      : (await lookup(() => this.resolveCname(domain))).some((record) => record.endsWith(DNS_SUFFIX));

    if (!pointed) {
      return {
        ok: false,
        errors: [
          apex
            ? `Enregistrement A non configuré ou ne pointe pas vers ${NETLIFY_LOAD_BALANCER_IP}`
            : 'Enregistrement CNAME non configuré ou incorrect',
        ],
      };
    }

    // Le certificat se provisionne en arrière-plan : un échec ici n'empêche pas l'activation
    try {
      await this.request(`/sites/${hostId}/ssl`, { method: 'POST' });
      await this.request(`/sites/${hostId}`, { method: 'PATCH', body: JSON.stringify({ force_ssl: true }) });
    } catch (error) {
      log.warn(`[NETLIFY] Certificat HTTPS non demandé pour ${domain}:`, error);
    }
    return { ok: true, errors: [] };
  }

  async removeDomain(site: PublisherSite, domain: string): Promise<{ defaultUrl: string | null }> {
    if (!site.hostId) return { defaultUrl: null };
    const updated: NetlifySite = await this.request(`/sites/${site.hostId}`, {
      method: 'PATCH',
      body: JSON.stringify({ custom_domain: null }),
    });
    if (isApexDomain(domain)) {
      try {
        await this.setAliases(updated, (updated.domain_aliases ?? []).filter((alias) => alias !== `www.${domain}`));
      } catch (error) {
        log.warn(`[NETLIFY] Alias www.${domain} non retiré:`, error);
      }
    }
    return { defaultUrl: this.toHostSite(updated).defaultUrl };
  }

  async certificateStatus(site: PublisherSite): Promise<unknown | null> {
    if (!site.hostId) return null;
    try {
      return await this.request(`/sites/${site.hostId}/ssl`);
    } catch (error) {
      log.warn(`[NETLIFY] État du certificat indisponible pour ${site.hostId}:`, error);
      return null;
    }
  }

  // Interne

  /** L'adresse *.netlify.app redirige vers le domaine personnalisé (règle en tête de `_redirects`). */
  private async redirectDefaultDomain(dir: string, host: HostSite, domain: string): Promise<void> {
    const file = path.join(dir, '_redirects');
    const existing = await fs.readFile(file, 'utf8').catch(() => '');
    const rule = `${host.defaultUrl}/* https://${domain}/:splat 301!\n`;
    await fs.writeFile(file, rule + existing, 'utf8');
  }

  private siteName(site: PublisherSite): string {
    return `${this.namePrefix}${site.slug}-mairie`;
  }

  private toHostSite(site: NetlifySite): HostSite {
    return { hostId: site.id, defaultUrl: `https://${site.name}${DNS_SUFFIX}` };
  }

  private getSite(hostId: string): Promise<NetlifySite> {
    return this.request(`/sites/${hostId}`);
  }

  /** Parcourt toutes les pages : l'API ne renvoie que 100 sites par page. */
  private async findSiteByName(name: string): Promise<NetlifySite | null> {
    const seen = new Set<string>();
    for (let page = 1; ; page++) {
      const query = new URLSearchParams({ filter: 'all', name, page: String(page), per_page: String(PAGE_SIZE) });
      const sites: NetlifySite[] = await this.request(`/sites?${query}`);
      const found = sites.find((site) => site.name === name);
      if (found) return found;
      const fresh = sites.filter((site) => !seen.has(site.id));
      fresh.forEach((site) => seen.add(site.id));
      if (sites.length < PAGE_SIZE || fresh.length === 0) return null;
    }
  }

  private async setAliases(site: NetlifySite, aliases: string[]): Promise<void> {
    const unique = [...new Set(aliases)];
    const current = site.domain_aliases ?? [];
    if (unique.length === current.length && unique.every((alias) => current.includes(alias))) return;
    await this.request(`/sites/${site.id}`, { method: 'PATCH', body: JSON.stringify({ domain_aliases: unique }) });
  }

  private instructionsFor(siteName: string, domain: string): DnsInstructions {
    const base = baseDomain(domain);
    const target = `${siteName}${DNS_SUFFIX}`;
    const record = (type: DnsRecord['type'], name: string, value: string, purpose: string, description: string): DnsRecord => ({
      type,
      name,
      displayName: displayName(name, base),
      value,
      purpose,
      description,
    });

    const apex = isApexDomain(domain);
    const records = apex
      ? [
          record('A', domain, NETLIFY_LOAD_BALANCER_IP, 'Pointage du domaine', `Redirige ${domain} vers le serveur d'hébergement`),
          record('CNAME', `www.${domain}`, target, 'Redirection www', `Permet à www.${domain} de fonctionner également`),
        ]
      : [record('CNAME', domain, target, 'Pointage du domaine', `Redirige ${domain} vers le serveur d'hébergement`)];

    return { isApex: apex, baseDomain: base, target, records };
  }

  /** Attend la fin du traitement du dépôt ; `building` si le délai est dépassé. */
  private async waitForDeploy(hostId: string, deployId: string): Promise<DeployState> {
    const deadline = Date.now() + this.deployTimeoutMs;
    while (Date.now() < deadline) {
      let status: DeployStatus | null = null;
      try {
        status = await this.status(deployId);
      } catch (error) {
        log.warn(`[NETLIFY] État du dépôt ${deployId} indisponible:`, error);
      }
      if (status?.state === 'error') throw new Error(`Netlify a refusé le dépôt : ${status.error}`);
      if (status?.state === 'ready') {
        // Publie ce dépôt en production même si la publication automatique est verrouillée sur le site
        await this.request(`/sites/${hostId}/deploys/${deployId}/restore`, { method: 'POST' });
        return 'ready';
      }
      await this.sleep(this.pollIntervalMs);
    }
    log.warn(`[NETLIFY] Dépôt ${deployId} toujours en cours après ${this.deployTimeoutMs / 1000} s`);
    return 'building';
  }

  private async request(endpoint: string, init: RequestInit = {}): Promise<any> {
    const response = await this.fetch(`${API_URL}${endpoint}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string>),
      },
    });
    const text = await response.text();
    if (!response.ok) throw new NetlifyApiError(response.status, text);
    return text ? JSON.parse(text) : null;
  }
}

function toDeployState(state: string): DeployState {
  if (state === 'ready') return 'ready';
  if (state === 'error' || state === 'rejected' || state === 'skipped') return 'error';
  return 'building';
}

function requireHostId(site: PublisherSite): string {
  if (!site.hostId) throw new Error("Le site doit être publié au moins une fois avant d'ajouter un domaine personnalisé");
  return site.hostId;
}

/** Résolution DNS : un nom absent n'est pas une erreur, juste aucun enregistrement. */
async function lookup(resolve: () => Promise<string[]>): Promise<string[]> {
  try {
    return await resolve();
  } catch (error: any) {
    if (['ENOTFOUND', 'ENODATA', 'ESERVFAIL', 'ENOTIMP', 'EREFUSED'].includes(error?.code)) return [];
    throw error;
  }
}

/** ZIP en mémoire du dossier, fichiers à la racine de l'archive. */
export function zipDirectory(dir: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const sink = new PassThrough();
    const chunks: Buffer[] = [];
    sink.on('data', (chunk: Buffer) => chunks.push(chunk));
    sink.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    archive.pipe(sink);
    archive.directory(dir, false);
    archive.finalize();
  });
}

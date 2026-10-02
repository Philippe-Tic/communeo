/**
 * `getPublisher()` renvoie l'adaptateur de l'hébergeur configuré. Sans configuration (pas de
 * NETLIFY_TOKEN), rien ne plante au démarrage : seules les actions de publication échouent,
 * avec un message clair.
 */
import path from 'node:path';
import type { Logger } from '../logger';
import { BunnyPublisher } from './bunny';
import { LocalPublisher } from './local';
import { NetlifyPublisher } from './netlify';
import type { SitePublisher } from './types';

export type * from './types';
export { isApexDomain } from './dns';
export { NetlifyPublisher, NetlifyApiError, zipDirectory, type NetlifyPublisherOptions } from './netlify';
export { LocalPublisher, VERSIONS_DIR, type LocalPublisherOptions } from './local';
export { BunnyPublisher, BunnyApiError, BUNNY_API_URL, BUNNY_RULES, ORIGIN_SECRET_HEADER, type BunnyEdgeRule, type BunnyPublisherOptions } from './bunny';
export {
  CADDY_RULES_DIR,
  CADDY_RULES_FILE,
  CADDY_RULES_PATH,
  caddySiteRules,
  reloadCaddy,
  type CaddySiteRules,
  type CaddySiteRulesInput,
  type ReloadCaddyOptions,
} from './caddy';

export class PublisherUnavailableError extends Error {
  constructor(reason: string) {
    super(`Publication indisponible : ${reason}`);
    this.name = 'PublisherUnavailableError';
  }
}

/** Adaptateur de repli quand aucun hébergeur n'est configuré : chaque action échoue. */
export function unavailablePublisher(reason: string): SitePublisher {
  const fail = async (): Promise<never> => {
    throw new PublisherUnavailableError(reason);
  };
  return {
    id: 'none',
    configured: false,
    ensureSite: fail,
    publish: fail,
    status: fail,
    configureDomain: fail,
    dnsInstructions: fail,
    verifyDomain: fail,
    removeDomain: fail,
    certificateStatus: fail,
    deleteSite: fail,
  };
}

export function isPublisherUnavailable(error: unknown): error is PublisherUnavailableError {
  return error instanceof PublisherUnavailableError;
}

let cached: { key: string; publisher: SitePublisher } | undefined;

/** Dossier des sites dans les conteneurs (volume `sites`) */
const SITES_DIR = '/srv/sites';

const PUBLISHER_ENV = [
  'SITES_PUBLISHER',
  'BUNNY_API_KEY',
  'BUNNY_DNS_ZONE_ID',
  'SITES_ORIGIN_SECRET',
  'ORIGIN_DOMAIN',
  'NETLIFY_TOKEN',
  'NODE_ENV',
  'PUBLISH_DIR',
  'PUBLISH_BASE_URL',
  'SITES_DOMAIN',
  'CADDY_ADMIN_URL',
] as const;

/**
 * Dossier du site publié d'une commune quand les sites sont servis depuis le volume `sites` (Bunny, ou
 * dossier local sans Netlify), même choix que `getPublisher` ; null chez Netlify (rien sur le serveur).
 * `SITES_DIR` : le volume tel que le monte un service qui ne publie pas (Strapi lit le site pour
 * l'export des données, #343), sans changer son hébergeur.
 */
export function publishedSiteDir(slug: string, env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.SITES_PUBLISHER === 'bunny') return path.join(env.PUBLISH_DIR || env.SITES_DIR || SITES_DIR, slug);
  const dir = env.PUBLISH_DIR || env.SITES_DIR;
  if (env.NETLIFY_TOKEN || !dir) return null;
  return path.join(dir, slug);
}

/**
 * SITES_PUBLISHER=bunny → Bunny CDN devant l'origine servie par Caddy (#382 ; BUNNY_API_KEY,
 * SITES_ORIGIN_SECRET et ORIGIN_DOMAIN requis, sinon indisponible : on ne publie jamais ailleurs que là
 * où on l'a demandé). Sinon, comme avant : NETLIFY_TOKEN → Netlify (SITES_DOMAIN : adresses
 * `<slug>.<domaine>`) ; sinon PUBLISH_DIR → dossier local (développement, tests de la stack, origine
 * servie par Caddy : CADDY_ADMIN_URL pour le recharger après chaque publication) ; sinon indisponible.
 * Lu à chaque appel : un jeton ajouté ou retiré est pris en compte sans redémarrer.
 */
export function getPublisher(env: NodeJS.ProcessEnv = process.env, logger?: Logger): SitePublisher {
  const key = PUBLISHER_ENV.map((name) => env[name] ?? '').join('|');
  if (cached?.key === key) return cached.publisher;

  const token = env.NETLIFY_TOKEN || undefined;
  const localDir = env.PUBLISH_DIR || undefined;
  const namePrefix = env.NODE_ENV === 'production' ? '' : 'dev-';
  let publisher: SitePublisher;
  if (env.SITES_PUBLISHER === 'bunny') {
    const missing = (['BUNNY_API_KEY', 'SITES_ORIGIN_SECRET', 'ORIGIN_DOMAIN'] as const).filter((name) => !env[name]);
    publisher = missing.length
      ? unavailablePublisher(`SITES_PUBLISHER=bunny mais ${missing.join(', ')} non défini`)
      : new BunnyPublisher({
          apiKey: env.BUNNY_API_KEY!,
          originSecret: env.SITES_ORIGIN_SECRET!,
          originDomain: env.ORIGIN_DOMAIN!,
          sitesDomain: env.SITES_DOMAIN,
          dnsZoneId: env.BUNNY_DNS_ZONE_ID || undefined,
          sitesDir: localDir ?? SITES_DIR,
          caddyAdminUrl: env.CADDY_ADMIN_URL || undefined,
          namePrefix,
          logger,
        });
  } else if (token) {
    publisher = new NetlifyPublisher({ token, namePrefix, sitesDomain: env.SITES_DOMAIN, logger });
  } else if (localDir) {
    publisher = new LocalPublisher({ root: localDir, baseUrl: env.PUBLISH_BASE_URL, caddyAdminUrl: env.CADDY_ADMIN_URL || undefined, logger });
  } else {
    publisher = unavailablePublisher("NETLIFY_TOKEN n'est pas défini");
  }
  cached = { key, publisher };
  return publisher;
}

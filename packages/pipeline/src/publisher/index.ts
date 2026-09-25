/**
 * `getPublisher()` renvoie l'adaptateur de l'hébergeur configuré. Sans configuration (pas de
 * NETLIFY_TOKEN), rien ne plante au démarrage : seules les actions de publication échouent,
 * avec un message clair.
 */
import type { Logger } from '../logger';
import { LocalPublisher } from './local';
import { NetlifyPublisher } from './netlify';
import type { SitePublisher } from './types';

export type * from './types';
export { isApexDomain } from './dns';
export { NetlifyPublisher, NetlifyApiError, zipDirectory, type NetlifyPublisherOptions } from './netlify';
export { LocalPublisher, type LocalPublisherOptions } from './local';

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

/**
 * NETLIFY_TOKEN → Netlify (SITES_DOMAIN : adresses `<slug>.<domaine>`) ; sinon PUBLISH_DIR → dossier
 * local (développement) ; sinon indisponible.
 * Lu à chaque appel : un jeton ajouté ou retiré est pris en compte sans redémarrer.
 */
export function getPublisher(env: NodeJS.ProcessEnv = process.env, logger?: Logger): SitePublisher {
  const token = env.NETLIFY_TOKEN || undefined;
  const localDir = env.PUBLISH_DIR || undefined;
  const key = `${token ?? ''}|${env.NODE_ENV ?? ''}|${localDir ?? ''}|${env.PUBLISH_BASE_URL ?? ''}|${env.SITES_DOMAIN ?? ''}`;
  if (cached?.key === key) return cached.publisher;

  const publisher = token
    ? new NetlifyPublisher({ token, namePrefix: env.NODE_ENV === 'production' ? '' : 'dev-', sitesDomain: env.SITES_DOMAIN, logger })
    : localDir
      ? new LocalPublisher({ root: localDir, baseUrl: env.PUBLISH_BASE_URL })
      : unavailablePublisher("NETLIFY_TOKEN n'est pas défini");
  cached = { key, publisher };
  return publisher;
}

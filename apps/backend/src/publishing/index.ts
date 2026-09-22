/**
 * Point d'entrée de la publication : `getPublisher()` renvoie l'adaptateur de l'hébergeur configuré.
 * Sans configuration (pas de NETLIFY_TOKEN), Strapi démarre quand même : seules les actions de
 * publication échouent, avec un message clair.
 */
import { NetlifyPublisher } from './netlify';
import type { PublisherSite, SitePublisher } from './types';

export type * from './types';
export { isApexDomain } from './dns';

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

/** Lu à chaque appel : un jeton ajouté ou retiré est pris en compte sans redémarrer. */
export function getPublisher(env: NodeJS.ProcessEnv = process.env): SitePublisher {
  const token = env.NETLIFY_TOKEN || undefined;
  const key = `${token ?? ''}|${env.NODE_ENV ?? ''}`;
  if (cached?.key === key) return cached.publisher;

  const publisher = token
    ? new NetlifyPublisher({ token, namePrefix: env.NODE_ENV === 'production' ? '' : 'dev-' })
    : unavailablePublisher("NETLIFY_TOKEN n'est pas défini");
  cached = { key, publisher };
  return publisher;
}

/** La commune vue par l'adaptateur, à partir du document Site. */
export function toPublisherSite(site: any): PublisherSite {
  return {
    documentId: site.documentId,
    slug: site.slug,
    name: site.name,
    hostId: site.netlify_site_id || null,
    customDomain: site.domain_status === 'verified' ? site.custom_domain || null : null,
  };
}

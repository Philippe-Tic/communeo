/**
 * Accès du backend à l'hébergeur : l'adaptateur de @communeo/pipeline, avec le journal de Strapi.
 */
import { getPublisher, type PublisherSite, type SitePublisher } from '@communeo/pipeline';
import { log } from './logger';

export function publisher(): SitePublisher {
  return getPublisher(process.env, log);
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

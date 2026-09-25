/**
 * Accès aux contenus de la commune. Au build (sites statiques), une seule source est partagée par toutes
 * les pages : chaque type de contenu n'est chargé qu'une fois. En preview (serveur), chaque requête
 * recharge les brouillons de la commune de la requête (voir request-context.ts).
 */
import { breadcrumb, createContentSource, createStrapiLoader, seo, type ContentSource, type LinkVM, type RawLoader, type SeoVM } from '@communeo/core';
import { createFixtureLoader, FIXTURE_CONTEXT, FIXTURE_NOW, type FixtureVariant } from '@communeo/fixtures';
import type { PageContext } from '@communeo/theme-contract';
import { requestContext } from './request-context';

const env = process.env;
const isServer = env.RENDER_MODE === 'server';

function required(name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

/** Preview : réglages non enregistrés de la requête appliqués au Site lu */
function withSettings(loader: RawLoader): RawLoader {
  const settings = requestContext()?.settings;
  if (!settings || Object.keys(settings).length === 0) return loader;
  return { ...loader, site: async () => ({ ...(await loader.site()), ...settings }) };
}

function createSource(): ContentSource {
  if (env.DATA_SOURCE === 'strapi') {
    const apiUrl = required('STRAPI_URL');
    return createContentSource(
      withSettings(createStrapiLoader({
        apiUrl,
        token: required('STRAPI_TOKEN'),
        siteDocumentId: requestContext()?.siteDocumentId ?? required('SITE_DOCUMENT_ID'),
        status: env.CONTENT_STATUS === 'draft' ? 'draft' : 'published',
      })),
      { siteUrl: (env.SITE_URL ?? '').replace(/\/$/, ''), mediaUrl: env.STRAPI_PUBLIC_URL ?? apiUrl },
    );
  }
  return createContentSource(
    withSettings(createFixtureLoader({ variant: (env.FIXTURE_VARIANT as FixtureVariant) || 'complete', logo: env.FIXTURE_LOGO === 'blason' ? 'blason' : 'horizontal', criticalAlert: env.FIXTURE_ALERT === 'critical', trial: env.FIXTURE_PLAN === 'trial' })),
    FIXTURE_CONTEXT,
    { now: FIXTURE_NOW },
  );
}

let shared: ContentSource | undefined;
/** Build statique : une source pour tout le site. Preview : une source par requête (brouillons à jour). */
export const getSource = (): ContentSource => {
  if (!isServer) return (shared ??= createSource());
  const context = requestContext();
  return context ? (context.source ??= createSource()) : createSource();
};

/** Contexte commun passé à chaque template du thème. */
export async function pageContext(
  source: ContentSource,
  path: string,
  page: { title: string; seo: SeoVM; breadcrumb?: LinkVM[] },
): Promise<PageContext> {
  const [site, nav, alerts, practical] = await Promise.all([source.site(), source.navigation(), source.alerts(), source.practical()]);
  return { site, nav, alerts, practical, path, title: page.title, seo: page.seo, breadcrumb: page.breadcrumb ?? [] };
}

/** Réponse 404 en preview ; au build, les routes dynamiques ne génèrent que les chemins existants. */
export const notFound = () => new Response(null, { status: 404, statusText: 'Not found' });

/**
 * Contexte d'une page sans contenu propre (listes, pages pratiques, pages légales) :
 * titre, description, fil d'Ariane et SEO construits d'un coup.
 */
export async function simplePage(
  source: ContentSource,
  options: { path: string; title: string; description?: string | null; trail?: Array<{ label: string; href: string }>; noindex?: boolean },
): Promise<PageContext> {
  const site = await source.site();
  const trail = options.trail ?? [{ label: options.title, href: options.path }];
  return pageContext(source, options.path, {
    title: options.title,
    seo: seo({ siteUrl: site.url, mediaUrl: '' }, { title: options.title, description: options.description, path: options.path, noindex: options.noindex }),
    breadcrumb: breadcrumb(...trail),
  });
}

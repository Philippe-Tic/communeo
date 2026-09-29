/**
 * Redirections depuis l'ancien site de la commune (#335), pour les administrateurs.
 *
 * GET  /api/redirects          → { redirects: [{ from, to }], destinations: [{ path, label, kind }] }
 * PUT  /api/redirects          → { redirects: [{ from, to }] } : remplace toute la liste, puis met le
 *                                site en ligne (mise en ligne automatique de la commune)
 * POST /api/redirects/suggest  → { addresses?: string, sitemapUrl?: string } : anciennes adresses
 *                                (collées, ou lues dans le plan du site de l'ancien site) avec la page
 *                                proposée pour chacune ; rien n'est enregistré
 *
 * Les redirections partent avec chaque mise en ligne (build-worker → fichier `_redirects` de
 * l'hébergeur).
 */
import {
  associationSlugs,
  isSelfRedirect,
  isValidDestination,
  LEGAL_PAGES,
  normalizeOldAddress,
  REDIRECTS_MAX,
  SECTIONS,
  sitemapLocations,
  suggestDestination,
  type RedirectDestination,
} from '@communeo/core';
import autoDeployService from '../../../services/auto-deploy';
import { recordPendingChange } from '../../../services/pending-changes';
import { listRedirects } from '../../../services/redirects';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';
import { fetchPublicText, PublicFetchError } from '../../../utils/public-fetch';

const REDIRECT = 'api::redirect.redirect';
const MAX_SITEMAPS = 10;

async function communeOf(ctx) {
  if (!hasRole(ctx, ['admin', 'super_admin'])) {
    ctx.forbidden('Réservé aux administrateurs de la commune');
    return null;
  }
  const effective = await getEffectiveSite(ctx);
  if (!effective) {
    ctx.forbidden('Aucun site assigné à ce compte');
    return null;
  }
  return strapi.db.query('api::site.site').findOne({ where: { documentId: effective.documentId }, select: ['id', 'documentId', 'name'] });
}

/** Pages du site vers lesquelles rediriger : accueil, rubriques, pages, contenus publiés, pages légales */
async function destinations(siteDocumentId: string): Promise<RedirectDestination[]> {
  const bySite = { site: { documentId: siteDocumentId } } as any;
  const published = (uid: string, fields: string[]) =>
    strapi.documents(uid as any).findMany({ filters: bySite, status: 'published', fields: fields as any, limit: 2000 } as any) as Promise<any[]>;
  const [pages, articles, events, documents, associations] = await Promise.all([
    published('api::page.page', ['title', 'slug']),
    published('api::article.article', ['title', 'slug']),
    published('api::evenement.evenement', ['title', 'slug']),
    published('api::official-document.official-document', ['title', 'slug']),
    strapi.db.query('api::association.association').findMany({ where: { ...bySite, status: 'published' }, select: ['documentId', 'name'] }),
  ]);
  const slugs = associationSlugs(associations);
  return [
    { path: '/', label: 'Accueil', kind: 'Rubrique' },
    ...Object.values(SECTIONS).map((section) => ({ path: section.path, label: section.label, kind: 'Rubrique' })),
    ...pages.map((page) => ({ path: `/${page.slug}`, label: page.title, kind: 'Page' })),
    ...articles.map((article) => ({ path: `${SECTIONS.actualites.path}/${article.slug}`, label: article.title, kind: 'Actualité' })),
    ...events.map((event) => ({ path: `${SECTIONS.agenda.path}/${event.slug}`, label: event.title, kind: 'Événement' })),
    ...documents.map((document) => ({ path: `${SECTIONS.documents.path}/${document.slug}`, label: document.title, kind: 'Document officiel' })),
    ...associations.map((association: any) => ({ path: `${SECTIONS.associations.path}/${slugs.get(association.documentId)}`, label: association.name, kind: 'Association' })),
    ...Object.values(LEGAL_PAGES).map((page) => ({ path: page.path, label: page.label, kind: 'Page légale' })),
  ];
}

/** Adresses d'un plan du site, index de plans du site compris (10 fichiers au plus) */
async function sitemapAddresses(url: string): Promise<string[]> {
  const xml = await fetchPublicText(url);
  if (!/<sitemapindex/i.test(xml)) return sitemapLocations(xml);
  const children = sitemapLocations(xml).slice(0, MAX_SITEMAPS);
  const lists = await Promise.all(children.map((child) => fetchPublicText(child).then(sitemapLocations).catch(() => [] as string[])));
  return lists.flat();
}

export default {
  async list(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    ctx.body = { data: { redirects: await listRedirects(site.documentId), destinations: await destinations(site.documentId) } };
  },

  async save(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    const input = (ctx.request.body ?? {}).redirects;
    if (!Array.isArray(input)) return ctx.badRequest('redirects : une liste { from, to }');
    if (input.length > REDIRECTS_MAX) return ctx.badRequest(`${REDIRECTS_MAX} redirections au plus.`);

    const errors: string[] = [];
    const seen = new Map<string, string>();
    for (const [index, item] of input.entries()) {
      const from = normalizeOldAddress(String(item?.from ?? ''));
      const to = String(item?.to ?? '').trim();
      const line = `Ligne ${index + 1}`;
      if (!from) errors.push(`${line} : ancienne adresse invalide.`);
      else if (!isValidDestination(to)) errors.push(`${line} : choisissez une page du site.`);
      else if (seen.has(from) && seen.get(from) !== to) errors.push(`${line} : ${from} est déjà redirigée ailleurs.`);
      else if (!isSelfRedirect({ from, to })) seen.set(from, to);
    }
    if (errors.length) return ctx.badRequest(errors.slice(0, 5).join(' '), { errors });

    const before = await listRedirects(site.documentId);
    const rows = [...seen.entries()].map(([from, to]) => ({ from, to }));
    const changed = JSON.stringify(before) !== JSON.stringify([...rows].sort((a, b) => a.from.localeCompare(b.from)));
    if (changed) {
      await strapi.db.query(REDIRECT).deleteMany({ where: { site: site.id } });
      for (const row of rows) {
        await strapi.db.query(REDIRECT).create({ data: { site: site.id, from_path: row.from, to_path: row.to } });
      }
      // Une seule ligne dans « Mise en ligne », quel que soit le nombre de redirections
      await recordPendingChange({
        uid: REDIRECT,
        documentId: 'redirections',
        siteDocumentId: site.documentId,
        action: 'update',
        entry: { title: 'Redirections de l’ancien site' },
      }).catch(() => undefined);
      await autoDeployService.scheduleDeployIfEnabled(site.documentId);
    }
    ctx.body = { data: { redirects: await listRedirects(site.documentId) } };
  },

  async suggest(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    const body = (ctx.request.body ?? {}) as { addresses?: unknown; sitemapUrl?: unknown };
    let addresses = typeof body.addresses === 'string' ? body.addresses.split(/[\s,;]+/) : [];
    if (typeof body.sitemapUrl === 'string' && body.sitemapUrl.trim()) {
      try {
        addresses = [...addresses, ...(await sitemapAddresses(body.sitemapUrl.trim()))];
      } catch (error) {
        if (error instanceof PublicFetchError) return ctx.badRequest(`Plan du site illisible : ${error.message}.`);
        throw error;
      }
    }
    const unique = [...new Set(addresses.map(normalizeOldAddress).filter((address): address is string => !!address))];
    if (!unique.length) return ctx.badRequest('Aucune adresse exploitable : collez les adresses de l’ancien site, ou l’adresse de son plan du site.');
    const kept = unique.slice(0, REDIRECTS_MAX);
    const choices = await destinations(site.documentId);
    ctx.body = {
      data: {
        suggestions: kept.map((from) => suggestDestination(from, choices)),
        truncated: unique.length > kept.length,
      },
    };
  },
};

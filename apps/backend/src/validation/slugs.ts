/**
 * Slugs uniques par commune (et non globalement).
 * - À la création sans slug : généré depuis le titre, avec un suffixe si l'adresse est déjà prise.
 * - Slug fourni et déjà utilisé dans la commune : refusé avec un message clair.
 */
import { errors } from '@strapi/utils';
import { isValidSlug, slugify } from '@communeo/core';

export const SLUG_CONTENT_TYPES = [
  'api::page.page',
  'api::article.article',
  'api::evenement.evenement',
  'api::official-document.official-document',
];

const siteDocumentIdOf = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const v = value as any;
    if (typeof v.documentId === 'string') return v.documentId;
    const connect = v.connect ?? v.set;
    const first = Array.isArray(connect) ? connect[0] : connect;
    if (first) return siteDocumentIdOf(first);
  }
  return null;
};

async function isSlugTaken(strapi: any, uid: string, slug: string, siteDocumentId: string, documentId?: string) {
  const existing = await strapi.db.query(uid).findOne({
    select: ['documentId'],
    where: {
      slug,
      site: { documentId: siteDocumentId },
      ...(documentId ? { documentId: { $ne: documentId } } : {}),
    },
  });
  return !!existing;
}

const slugError = (message: string) =>
  new errors.ValidationError(message, { errors: [{ path: ['slug'], message, name: 'ValidationError' }] });

export const slugsMiddleware = (strapi: any) => async (ctx: any, next: () => Promise<any>) => {
  if (!SLUG_CONTENT_TYPES.includes(ctx.uid) || (ctx.action !== 'create' && ctx.action !== 'update')) return next();

  const data = ctx.params?.data;
  if (!data || typeof data !== 'object') return next();

  const documentId: string | undefined = ctx.params?.documentId;
  let siteDocumentId = siteDocumentIdOf(data.site);
  if (!siteDocumentId && documentId) {
    const current = await strapi.db.query(ctx.uid).findOne({ where: { documentId }, populate: ['site'] });
    siteDocumentId = current?.site?.documentId ?? null;
  }
  // Sans commune (cas limite, ex. super admin sans impersonation) : pas de contrôle possible
  if (!siteDocumentId) return next();

  if (ctx.action === 'create' && !data.slug && typeof data.title === 'string') {
    const base = slugify(data.title) || 'contenu';
    let candidate = base;
    for (let n = 2; await isSlugTaken(strapi, ctx.uid, candidate, siteDocumentId); n += 1) {
      candidate = `${base.slice(0, 95)}-${n}`;
    }
    data.slug = candidate;
    return next();
  }

  if (typeof data.slug === 'string') {
    if (!isValidSlug(data.slug)) {
      throw slugError("L'adresse ne peut contenir que des lettres minuscules sans accents, des chiffres et des tirets");
    }
    if (await isSlugTaken(strapi, ctx.uid, data.slug, siteDocumentId, documentId)) {
      throw slugError('Cette adresse est déjà utilisée par un autre contenu de la commune');
    }
  }

  return next();
};

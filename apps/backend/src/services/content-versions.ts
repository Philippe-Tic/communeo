/**
 * Historique des versions (#183) : à chaque publication d'une page, actualité, événement ou
 * document officiel, un instantané de la version publiée, dans la forme où l'éditeur de l'admin
 * lit le contenu (blocs et fichiers peuplés) — c'est l'éditeur qui restaure une version, par son
 * propre chargement, en créant un nouveau brouillon. La version en ligne n'est jamais modifiée.
 * Avant une restauration, le brouillon en cours est lui-même gardé (kind « draft ») : rien ne se perd.
 * 50 versions au plus par contenu (les plus anciennes partent).
 */
import { summarizeChanges } from '@communeo/core';
import { log } from '../utils/logger';

const VERSION = 'api::content-version.content-version';
export const MAX_VERSIONS = 50;

/** Types versionnés, par leur nom d'API (celui des routes de l'admin) */
export const VERSIONED_TYPES: Record<string, string> = {
  pages: 'api::page.page',
  articles: 'api::article.article',
  evenements: 'api::evenement.evenement',
  'official-documents': 'api::official-document.official-document',
};
const TYPE_OF_UID = Object.fromEntries(Object.entries(VERSIONED_TYPES).map(([type, uid]) => [uid, type]));

/** Ce que l'éditeur peuple : fichiers, et blocs avec leurs fichiers */
export function snapshotPopulate(uid: string): Record<string, unknown> {
  const attributes = (strapi.contentTypes as any)[uid]?.attributes ?? {};
  const populate: Record<string, unknown> = {};
  for (const [name, attribute] of Object.entries<any>(attributes)) {
    if (attribute.type === 'media') populate[name] = true;
    if (attribute.type === 'dynamiczone' || attribute.type === 'component') populate[name] = { populate: '*' };
  }
  return populate;
}

/** Instantané : sans les champs techniques (identifiants, dates, commune) */
function clean(entry: any): Record<string, unknown> {
  const { id, documentId, createdAt, updatedAt, publishedAt, locale, site, localizations, createdBy, updatedBy, ...rest } =
    entry ?? {};
  return rest;
}

const nameOf = (user: any) =>
  user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || null : null;

export async function recordVersion(uid: string, documentId: string, kind: 'published' | 'draft'): Promise<void> {
  const type = TYPE_OF_UID[uid];
  if (!type) return;
  try {
    const entry: any = await strapi.documents(uid as any).findOne({
      documentId,
      status: kind === 'published' ? 'published' : 'draft',
      populate: { ...snapshotPopulate(uid), site: { fields: ['documentId'] } } as any,
    });
    if (!entry?.site?.id) return;
    const snapshot = clean(entry);
    const [previous] = await strapi.db.query(VERSION).findMany({
      where: { content_type: type, content_document_id: documentId, kind: 'published' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      limit: 1,
    });
    const user = (strapi as any).requestContext?.get?.()?.state?.user ?? null;
    await strapi.db.query(VERSION).create({
      data: {
        site: entry.site.id,
        content_type: type,
        content_document_id: documentId,
        kind,
        snapshot,
        summary: kind === 'draft' ? 'brouillon gardé avant une restauration' : summarizeChanges(previous?.snapshot, snapshot),
        block_count: Array.isArray(snapshot.blocks) ? snapshot.blocks.length : null,
        author: user?.id ?? null,
        author_name: nameOf(user),
      },
    });
    // Au plus 50 versions par contenu
    const old = await strapi.db.query(VERSION).findMany({
      where: { content_type: type, content_document_id: documentId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      offset: MAX_VERSIONS,
      select: ['id'],
    });
    if (old.length) await strapi.db.query(VERSION).deleteMany({ where: { id: { $in: old.map((row: any) => row.id) } } });
  } catch (error) {
    log.error(`[VERSIONS] Version non enregistrée (${uid} ${documentId}) :`, error);
  }
}

/** Middleware des documents : un instantané après chaque publication d'un contenu versionné */
export function contentVersionsMiddleware() {
  return async (ctx: any, next: () => Promise<any>) => {
    if (!TYPE_OF_UID[ctx.uid]) return next();
    const publishing =
      ctx.action === 'publish' || (['create', 'update'].includes(ctx.action) && ctx.params?.status === 'published');
    const result = await next();
    if (publishing) {
      const documentId = ctx.params?.documentId ?? result?.documentId ?? result?.entries?.[0]?.documentId;
      if (documentId) await recordVersion(ctx.uid, documentId, 'published');
    }
    return result;
  };
}

/**
 * Fichiers d'une commune seulement (#189) : un contenu (page, bloc Image, photo d'un élu, logo…) ne
 * peut référencer qu'un fichier de la médiathèque de sa commune. Les ids de fichiers sont des
 * entiers qui se suivent : sans ce contrôle, une commune pourrait afficher le fichier d'une autre.
 * Tolérance pour l'existant : un fichier sans fiche de médiathèque déjà lié à ce même document
 * (envoyé avant la médiathèque) reste accepté.
 */
import { errors } from '@strapi/utils';

const SITE = 'api::site.site';
const MEDIA_ITEM = 'api::media-item.media-item';

type Ref = number;

/** Id d'une référence de fichier sous ses différentes formes (id, "12", { id }, { set / connect }) */
function refs(value: unknown): Ref[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'number') return Number.isInteger(value) ? [value] : [];
  if (typeof value === 'string') return /^\d+$/.test(value) ? [Number(value)] : [];
  if (Array.isArray(value)) return value.flatMap(refs);
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if ('set' in object || 'connect' in object) return [...refs(object.set), ...refs(object.connect)];
    if ('id' in object) return refs(object.id);
  }
  return [];
}

/** Tous les fichiers référencés par les données, blocs et composants imbriqués compris */
export function collectFileRefs(strapi: any, uid: string, data: unknown, depth = 0): Ref[] {
  if (!data || typeof data !== 'object' || depth > 6) return [];
  const model = strapi.getModel(uid);
  if (!model) return [];
  const found: Ref[] = [];
  for (const [name, attribute] of Object.entries<any>(model.attributes ?? {})) {
    const value = (data as Record<string, unknown>)[name];
    if (value === undefined || value === null) continue;
    if (attribute.type === 'media') found.push(...refs(value));
    if (attribute.type === 'component') {
      for (const item of Array.isArray(value) ? value : [value]) found.push(...collectFileRefs(strapi, attribute.component, item, depth + 1));
    }
    if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
      for (const item of value) if (item?.__component) found.push(...collectFileRefs(strapi, item.__component, item, depth + 1));
    }
  }
  return found;
}

async function siteOf(strapi: any, uid: string, ctx: any): Promise<string | null> {
  if (uid === SITE) return ctx.params?.documentId ?? null;
  const target = ctx.params?.data?.site;
  if (ctx.action === 'create' || target !== undefined) {
    if (typeof target === 'string' && !/^\d+$/.test(target)) return target;
    const id = refs(target)[0];
    if (id) return (await strapi.db.query(SITE).findOne({ where: { id }, select: ['documentId'] }))?.documentId ?? null;
    const connected = target?.connect?.[0]?.documentId ?? target?.set?.[0]?.documentId ?? target?.documentId;
    if (connected) return connected;
    if (ctx.action === 'create') return null;
  }
  const entry = await strapi.db.query(uid).findOne({ where: { documentId: ctx.params.documentId }, populate: { site: { select: ['documentId'] } } });
  return entry?.site?.documentId ?? null;
}

export const mediaOwnershipMiddleware = (strapi: any) => async (ctx: any, next: () => Promise<any>) => {
  if ((ctx.action !== 'create' && ctx.action !== 'update') || ctx.uid === MEDIA_ITEM || !ctx.uid?.startsWith('api::')) return next();
  const model = strapi.getModel(ctx.uid);
  const siteScoped = ctx.uid === SITE || model?.attributes?.site?.target === SITE;
  if (!siteScoped) return next();

  const ids = [...new Set(collectFileRefs(strapi, ctx.uid, ctx.params?.data))];
  if (!ids.length) return next();

  const siteDocumentId = await siteOf(strapi, ctx.uid, ctx);
  const owned = siteDocumentId
    ? await strapi.db.query(MEDIA_ITEM).findMany({ where: { site: { documentId: siteDocumentId }, file: { id: { $in: ids } } }, populate: { file: { select: ['id'] } } })
    : [];
  const allowed = new Set<number>(owned.map((item: any) => item.file?.id));
  let missing = ids.filter((id) => !allowed.has(id));

  // Existant : fichier sans fiche de médiathèque, déjà lié à ce document
  if (missing.length && ctx.action === 'update' && ctx.params?.documentId) {
    const knex = strapi.db.connection;
    const tracked = new Set<number>((await knex('files_related_mph').select('file_id').whereIn('file_id', missing).where({ related_type: MEDIA_ITEM })).map((row: any) => row.file_id));
    const rows = await knex(strapi.db.metadata.get(ctx.uid).tableName).select('id').where({ document_id: ctx.params.documentId });
    const linked = new Set<number>(
      (await knex('files_related_mph').select('file_id').whereIn('file_id', missing).where({ related_type: ctx.uid }).whereIn('related_id', rows.map((row: any) => row.id))).map((row: any) => row.file_id),
    );
    missing = missing.filter((id) => tracked.has(id) || !linked.has(id));
  }

  if (missing.length) {
    throw new errors.ValidationError('Fichier introuvable dans la médiathèque de la commune', {
      errors: missing.map((id) => ({ path: ['file'], message: `Le fichier ${id} n'appartient pas à la médiathèque de la commune`, name: 'ValidationError' })),
    });
  }
  return next();
};

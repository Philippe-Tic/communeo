/**
 * Suppression d'une commune : le site chez l'hébergeur, les comptes, tous les contenus rattachés au
 * site (brouillons et versions publiées, fichiers de la médiathèque), puis le site lui-même.
 * Partagée par l'espace équipe et la fin de conservation d'un essai expiré (#310).
 *
 * Le journal d'activité est gardé (trace de la suppression) : il est purgé au bout de 6 mois.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { log } from '../utils/logger';
import { publisher as getPublisher, toPublisherSite } from '../utils/publisher';

const SITE = 'api::site.site';
const MEDIA_ITEM = 'api::media-item.media-item';
const KEPT = new Set(['api::activity-log.activity-log']);

// Suppression en cours : ni mise en ligne programmée, ni « modification en attente », ni ligne de
// journal par contenu supprimé (voir auto-deploy.ts et activity-log.ts)
const globalScope = globalThis as typeof globalThis & { __communeoCommuneDeletion?: AsyncLocalStorage<true> };
const deleting = (globalScope.__communeoCommuneDeletion ??= new AsyncLocalStorage<true>());
export const isCommuneDeletion = (): boolean => deleting.getStore() === true;

/** Types de contenu rattachés à une commune par leur relation `site` */
function siteScopedTypes(): string[] {
  return Object.entries(strapi.contentTypes as Record<string, any>)
    .filter(([uid, type]) => uid.startsWith('api::') && type.attributes?.site?.target === SITE && !KEPT.has(uid))
    .map(([uid]) => uid);
}

export const deleteCommune = (documentId: string): Promise<boolean> => deleting.run(true, () => removeCommune(documentId));

async function removeCommune(documentId: string): Promise<boolean> {
  const site: any = await strapi.db.query(SITE).findOne({ where: { documentId } });
  if (!site) return false;

  if (site.netlify_site_id) {
    try {
      await getPublisher().deleteSite(toPublisherSite(site));
    } catch (error) {
      // La commune est supprimée quand même : le site chez l'hébergeur se retire à la main
      log.error(`Failed to delete host site of ${site.slug}:`, error);
    }
  }

  await strapi.db.query('plugin::users-permissions.user').deleteMany({ where: { site: { documentId } } });

  // Fichiers de la médiathèque (et leurs formats) avant les fiches qui les référencent
  const media = await strapi.db.query(MEDIA_ITEM).findMany({ where: { site: { documentId } }, populate: ['file'] });
  const upload = strapi.plugin('upload').service('upload');
  for (const item of media as any[]) {
    if (!item.file) continue;
    try {
      await upload.remove(item.file);
    } catch (error) {
      log.error(`Failed to remove file ${item.file.id} of ${site.slug}:`, error);
    }
  }

  // Service documents : toutes les versions (brouillon, publiée) et leurs composants
  for (const uid of siteScopedTypes()) {
    const entries = await strapi.db.query(uid as any).findMany({ where: { site: { documentId } }, select: ['documentId'] });
    const documentIds = [...new Set(entries.map((entry: any) => entry.documentId as string))];
    for (const id of documentIds) await strapi.documents(uid as any).delete({ documentId: id });
  }

  await strapi.documents(SITE).delete({ documentId });
  return true;
}

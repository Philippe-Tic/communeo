/**
 * Modifications en attente de mise en ligne : chaque changement visible sur le site public est noté
 * (un par contenu, la dernière action l'emporte) jusqu'à la prochaine mise en ligne réussie.
 * Un échec laisse la liste intacte : le site précédent reste en ligne.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

const PENDING = 'api::pending-change.pending-change';

export type PendingAction = 'publish' | 'unpublish' | 'delete' | 'create' | 'update';
export type PendingSource = 'person' | 'scheduled';

/**
 * Publication programmée en cours (tâche cron) : ni auteur, ni requête. Contexte partagé par toutes
 * les copies du module (code compilé de Strapi, sources chargées par les tests).
 */
const globalScope = globalThis as typeof globalThis & { __communeoScheduledPublication?: AsyncLocalStorage<true> };
const scheduled = (globalScope.__communeoScheduledPublication ??= new AsyncLocalStorage<true>());
export const runAsScheduledPublication = <T>(fn: () => Promise<T>): Promise<T> => scheduled.run(true, fn);
export const isScheduledPublication = (): boolean => scheduled.getStore() === true;

/** Libellé lisible d'un contenu, quel que soit son type */
export function changeTitle(uid: string, entry: any): string {
  if (uid === 'api::site.site') return 'Informations du site';
  const person = [entry?.first_name, entry?.last_name].filter(Boolean).join(' ');
  return entry?.title || entry?.name || person || entry?.slug || 'Sans titre';
}

export async function recordPendingChange(change: {
  uid: string;
  documentId: string;
  siteDocumentId: string;
  action: PendingAction;
  entry: any;
}): Promise<void> {
  const source: PendingSource = isScheduledPublication() ? 'scheduled' : 'person';
  const user = source === 'person' ? (strapi as any).requestContext?.get?.()?.state?.user : null;
  const contentType = change.uid.split('.').pop()!;
  const data = {
    title: changeTitle(change.uid, change.entry),
    action: change.action,
    source,
    author: user?.documentId ?? null,
    occurred_at: new Date(),
  };

  const existing = await strapi.documents(PENDING).findFirst({
    filters: { site: { documentId: change.siteDocumentId }, content_type: contentType, content_document_id: change.documentId } as any,
  });
  if (existing) {
    await strapi.documents(PENDING).update({ documentId: existing.documentId, data: data as any });
  } else {
    await strapi.documents(PENDING).create({
      data: { ...data, site: change.siteDocumentId, content_type: contentType, content_document_id: change.documentId } as any,
    });
  }
}

export async function listPendingChanges(siteDocumentId: string) {
  return strapi.documents(PENDING).findMany({
    filters: { site: { documentId: siteDocumentId } } as any,
    sort: { occurred_at: 'desc' } as any,
    populate: { author: { fields: ['first_name', 'last_name'] } } as any,
    limit: 500,
  });
}

/** Après une mise en ligne réussie : retire ce qui a été modifié avant son début. */
export async function clearPendingChanges(siteDocumentId: string, before: Date): Promise<number> {
  const done = await strapi.documents(PENDING).findMany({
    filters: { site: { documentId: siteDocumentId }, occurred_at: { $lte: before.toISOString() } } as any,
    fields: ['documentId'] as any,
    limit: 10_000,
  });
  for (const entry of done) await strapi.documents(PENDING).delete({ documentId: entry.documentId });
  return done.length;
}

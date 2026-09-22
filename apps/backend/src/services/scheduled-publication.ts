/**
 * Publication programmée : publie les brouillons dont la date `scheduled_at` est passée.
 * Appelé chaque minute par la tâche cron (config/cron-tasks.ts). La publication déclenche
 * ensuite la mise en ligne via le middleware d'auto-deploy (action « publish »).
 */

export const SCHEDULABLE_CONTENT_TYPES = [
  'api::page.page',
  'api::article.article',
  'api::evenement.evenement',
  'api::official-document.official-document',
] as const;

export async function publishDueDocuments(strapi: any, now: Date = new Date()): Promise<number> {
  let published = 0;

  for (const uid of SCHEDULABLE_CONTENT_TYPES) {
    const due = await strapi.documents(uid).findMany({
      status: 'draft',
      filters: { scheduled_at: { $notNull: true, $lte: now.toISOString() } },
      fields: ['documentId', 'scheduled_at'],
      limit: 100,
    });

    for (const doc of due) {
      try {
        // Vider la date d'abord : la version publiée ne doit pas rester « programmée »
        await strapi.documents(uid).update({ documentId: doc.documentId, data: { scheduled_at: null } });
        try {
          await strapi.documents(uid).publish({ documentId: doc.documentId });
        } catch (error) {
          // Remettre la date pour réessayer à la prochaine exécution
          await strapi.documents(uid).update({ documentId: doc.documentId, data: { scheduled_at: doc.scheduled_at } });
          throw error;
        }
        published += 1;
        strapi.log.info(`[scheduled-publication] ${uid} ${doc.documentId} publié (prévu le ${doc.scheduled_at})`);
      } catch (error) {
        strapi.log.error(`[scheduled-publication] Échec de la publication de ${uid} ${doc.documentId}, nouvel essai dans une minute`, error);
      }
    }
  }

  return published;
}

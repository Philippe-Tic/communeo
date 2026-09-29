/** Redirections depuis l'ancien site de la commune (#335), triées par ancienne adresse */
export const listRedirects = async (siteDocumentId: string): Promise<Array<{ from: string; to: string }>> =>
  (
    await strapi.db.query('api::redirect.redirect').findMany({
      where: { site: { documentId: siteDocumentId } },
      orderBy: { from_path: 'asc' },
      select: ['from_path', 'to_path'],
    })
  ).map((row: any) => ({ from: row.from_path as string, to: row.to_path as string }));

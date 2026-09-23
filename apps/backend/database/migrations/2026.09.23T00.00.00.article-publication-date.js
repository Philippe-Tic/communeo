/**
 * Articles déjà publiés sans date de publication : on reprend la date à laquelle ils ont été publiés,
 * sur toutes leurs versions (brouillon compris), pour que la preview affiche la même date que le site.
 */
module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable('articles'))) return;
    await knex.raw(`
      UPDATE articles SET publication_date = (
        SELECT p.published_at FROM articles p
        WHERE p.document_id = articles.document_id AND p.published_at IS NOT NULL
        LIMIT 1
      )
      WHERE publication_date IS NULL
        AND EXISTS (SELECT 1 FROM articles p WHERE p.document_id = articles.document_id AND p.published_at IS NOT NULL)
    `);
  },
};

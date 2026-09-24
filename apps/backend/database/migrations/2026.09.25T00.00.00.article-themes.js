/**
 * Catégories d'actualités par thèmes (#257) : les anciens types deviennent des thèmes.
 * Actualité → Vie municipale, Événement → Culture et loisirs, Information et Urgence → Vie pratique
 * (les messages urgents passent par les alertes). Toutes les versions (brouillon compris).
 */
const MAPPING = {
  news: 'vie-municipale',
  event: 'culture-loisirs',
  information: 'vie-pratique',
  emergency: 'vie-pratique',
};

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable('articles'))) return;
    for (const [from, to] of Object.entries(MAPPING)) {
      await knex('articles').where({ category: from }).update({ category: to });
    }
  },
};

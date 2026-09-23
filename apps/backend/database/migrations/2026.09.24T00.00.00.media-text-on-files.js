/**
 * Médiathèque V2 (#189) : le texte alternatif et la légende sont portés par le fichier (réutilisés
 * par tous les contenus). Reprise des valeurs saisies sur les fiches de médiathèque quand le fichier
 * n'en a pas, puis dossiers techniques renommés en dossiers lisibles.
 */
const FOLDERS = {
  documents: 'Documents officiels',
  equipe: 'Équipe municipale',
  associations: 'Associations',
  messages: 'Réponses aux messages',
  cantine: 'Cantine',
};

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable('media_items'))) return;
    const hasAlt = await knex.schema.hasColumn('media_items', 'alt_text');
    const hasCaption = await knex.schema.hasColumn('media_items', 'caption');
    if (hasAlt || hasCaption) {
      const rows = await knex('media_items as m')
        .join('files_related_mph as r', function join() {
          this.on('r.related_id', '=', 'm.id').andOn('r.related_type', '=', knex.raw('?', ['api::media-item.media-item']));
        })
        .select('r.file_id', ...(hasAlt ? ['m.alt_text'] : []), ...(hasCaption ? ['m.caption'] : []));
      for (const row of rows) {
        const file = await knex('files').where({ id: row.file_id }).first();
        if (!file) continue;
        const update = {};
        if (row.alt_text && row.alt_text.trim() && !(file.alternative_text || '').trim()) update.alternative_text = row.alt_text.trim();
        if (row.caption && row.caption.trim() && !(file.caption || '').trim()) update.caption = row.caption.trim();
        if (Object.keys(update).length) await knex('files').where({ id: row.file_id }).update(update);
      }
    }
    if (await knex.schema.hasColumn('media_items', 'folder')) {
      for (const [key, label] of Object.entries(FOLDERS)) await knex('media_items').where({ folder: key }).update({ folder: label });
      await knex('media_items').whereIn('folder', ['general', '']).update({ folder: null });
    }
  },
};

/**
 * Fichiers : le crédit (photographe, source) est porté par le fichier, comme le texte alternatif et
 * la légende, pour être repris par tous les contenus qui l'utilisent.
 */
export default (plugin: any) => {
  plugin.contentTypes.file.schema.attributes.credit = { type: 'string', configurable: false };
  return plugin;
};

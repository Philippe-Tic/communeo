/**
 * Point d'entrée navigateur : fonctions pures utilisées par les scripts des sites (statut d'ouverture,
 * prochaines collectes, visibilité des alertes, formats). Sans zod ni autre dépendance lourde.
 */
export * from './format';
export * from './site/opening-status';
export * from './site/practical-rules';
export * from './demarches';
// Alertes rechargées dans le navigateur (mise en ligne immédiate, sans reconstruire le site)
export { mapAlert } from './vm/practical';
export type { AlertVM, MapContext } from './vm';
export type { CommuneDetails, CommuneMatch } from './site/public-data';

/**
 * Registre des thèmes disponibles. Chaque thème sera un package `themes/<id>` implémentant le contrat
 * de @communeo/theme-contract ; son manifest détaillera les sections d'accueil qu'il sait afficher.
 * La liste doit rester identique à l'énumération `theme` du Site (vérifié par un test).
 * `menus` reprend les emplacements de menus du manifest du thème (`manifest.menus`) : l'admin
 * n'y propose que les menus que le thème affiche.
 */
export const THEMES = [
  { id: 'institutionnel', name: 'Institutionnel', description: 'Sobre et très lisible, pour tous les publics.', menus: { main: true, footer: true } },
  { id: 'moderne', name: 'Moderne', description: 'Éditorial et visuel, grandes images.', menus: { main: true, footer: true } },
  { id: 'journal', name: 'Journal', description: 'Le journal de la commune, rubriques en colonnes.', menus: { main: true, footer: true } },
  { id: 'bourg', name: 'Bourg', description: 'Chaleureux et pratique, infos du quotidien en avant.', menus: { main: true, footer: true } },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const THEME_IDS = THEMES.map((theme) => theme.id) as ThemeId[];
export const DEFAULT_THEME: ThemeId = 'institutionnel';

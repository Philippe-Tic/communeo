/**
 * Registre des thèmes disponibles. Chaque thème sera un package `themes/<id>` implémentant le contrat
 * de @communeo/theme-contract ; son manifest détaillera les sections d'accueil qu'il sait afficher.
 * La liste doit rester identique à l'énumération `theme` du Site (vérifié par un test).
 */
export const THEMES = [
  { id: 'institutionnel', name: 'Institutionnel', description: 'Sobre et très lisible, pour tous les publics.' },
  { id: 'moderne', name: 'Moderne', description: 'Éditorial et visuel, grandes images.' },
  { id: 'journal', name: 'Journal', description: 'Le journal de la commune, rubriques en colonnes.' },
  { id: 'bourg', name: 'Bourg', description: 'Chaleureux et pratique, infos du quotidien en avant.' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const THEME_IDS = THEMES.map((theme) => theme.id) as ThemeId[];
export const DEFAULT_THEME: ThemeId = 'institutionnel';

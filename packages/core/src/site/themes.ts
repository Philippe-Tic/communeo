import { HOMEPAGE_SECTION_IDS, type HomepageSectionId } from './homepage';

/**
 * Registre des thèmes disponibles. Chaque thème sera un package `themes/<id>` implémentant le contrat
 * de @communeo/theme-contract ; son manifest détaillera les sections d'accueil qu'il sait afficher.
 * La liste doit rester identique à l'énumération `theme` du Site (vérifié par un test).
 * `menus` reprend les emplacements de menus du manifest du thème (`manifest.menus`) : l'admin
 * n'y propose que les menus que le thème affiche.
 * `homeSections` : sections d'accueil que le thème sait afficher (le manifest du thème reprend cette
 * liste) ; l'écran « Page d'accueil » de l'admin range les autres à part. Les réglages des sections
 * non affichées sont gardés : changer de thème ne fait rien perdre.
 */
type ThemeEntry = {
  id: string;
  name: string;
  description: string;
  /** Thème construit (package `themes/<id>` installé dans le renderer) : choisissable et prévisualisable */
  available: boolean;
  menus: { main: true; footer: boolean };
  homeSections: readonly HomepageSectionId[];
};

// Moderne, Journal et Bourg (phase 5) : pas encore construits ; ils préciseront leurs sections à leur construction
export const THEMES = [
  { id: 'institutionnel', name: 'Institutionnel', description: 'Sobre et très lisible, pour tous les publics.', available: true, menus: { main: true, footer: true }, homeSections: HOMEPAGE_SECTION_IDS },
  { id: 'moderne', name: 'Moderne', description: 'Dynamique et typographique : photos en grand, agenda et actualités dès le premier écran.', available: true, menus: { main: true, footer: true }, homeSections: HOMEPAGE_SECTION_IDS },
  { id: 'journal', name: 'Journal', description: 'Le journal de la commune, rubriques en colonnes.', available: false, menus: { main: true, footer: true }, homeSections: HOMEPAGE_SECTION_IDS },
  { id: 'bourg', name: 'Bourg', description: 'Chaleureux et pratique, infos du quotidien en avant.', available: false, menus: { main: true, footer: true }, homeSections: HOMEPAGE_SECTION_IDS },
] as const satisfies readonly ThemeEntry[];

/** Sections d'accueil affichées par un thème (toutes pour un thème inconnu) */
export const themeHomeSections = (theme: string | null | undefined): readonly HomepageSectionId[] =>
  THEMES.find((entry) => entry.id === theme)?.homeSections ?? HOMEPAGE_SECTION_IDS;

export type ThemeId = (typeof THEMES)[number]['id'];
export const THEME_IDS = THEMES.map((theme) => theme.id) as ThemeId[];
export const DEFAULT_THEME: ThemeId = 'institutionnel';

/** Un thème peut être choisi pour un site (construit et installé) */
export const isThemeAvailable = (theme: string | null | undefined) => THEMES.some((entry) => entry.id === theme && entry.available);

/**
 * Contrat de thème : ce qu'un thème doit fournir pour être branché sur le renderer.
 *
 * Répartition des rôles :
 * - le renderer possède le document (<html>, <head>, SEO, JSON-LD, lien d'évitement, bandeau cookies) ;
 * - le thème rend tout le contenu du <body> : en-tête, <main id="contenu">, pied de page ;
 * - le thème ne va jamais chercher de données : il reçoit des view-models de @communeo/core.
 *
 * Un thème incomplet ne compile pas : chaque template et chaque bloc est obligatoire.
 */
import type {
  AlertVM,
  ArticleCardVM,
  ArticleVM,
  AssociationCardVM,
  AssociationVM,
  BlockOf,
  BlockType,
  CanteenWeekVM,
  DocumentVM,
  EventCardVM,
  EventVM,
  HomeVM,
  HomepageSectionId,
  KeyLabel,
  LinkVM,
  NavVM,
  PageVM,
  PaginationVM,
  SeoVM,
  SiteVM,
  TeamVM,
  WasteCollectionVM,
} from '@communeo/core';

/**
 * Composant fourni par un thème. Côté TypeScript, un composant `.astro` est une fonction de ses props :
 * `astro check` vérifie que les props déclarées par le composant correspondent au contrat.
 */
export type ThemeComponent<Props> = (props: Props) => unknown;

// --- Manifest ------------------------------------------------------------------------------------

export interface ThemeManifest {
  /** Identifiant, identique à la valeur de Site.theme */
  id: string;
  name: string;
  description: string;
  /** Sections d'accueil que le thème sait afficher ; les autres sont masquées dans l'admin */
  homeSections: HomepageSectionId[];
  /** Emplacements de menus gérés par le thème */
  menus: { main: true; footer: boolean };
  /** Vignette 1200 × 800 pour le sélecteur de thème de l'admin, relative au package (`thumbnail.png`) */
  thumbnail: string;
}

// --- Contexte commun à toutes les pages ----------------------------------------------------------

export interface PageContext {
  site: SiteVM;
  nav: NavVM;
  /** Alertes visibles (bandeau en haut de page) */
  alerts: AlertVM[];
  /** Chemin de la page courante, pour aria-current */
  path: string;
  /** Fil d'Ariane (vide sur l'accueil) */
  breadcrumb: LinkVM[];
  /** Titre de la page (H1), identique au titre SEO */
  title: string;
  seo: SeoVM;
}

export interface FilterOption extends KeyLabel {
  href: string;
  count: number;
  current: boolean;
}

export interface PaginationLinks extends PaginationVM {
  previous: string | null;
  next: string | null;
  pages: Array<{ page: number; href: string; current: boolean }>;
}

/** Formulaire envoyé à l'API (contact, proposition d'association, newsletter, exercice des droits) */
export interface FormConfig {
  action: string;
  siteId: string;
  /** Options d'un champ de sélection (ex. catégories du formulaire de contact) */
  options?: KeyLabel[];
}

// --- Templates -----------------------------------------------------------------------------------

type WithContext<P = object> = { ctx: PageContext } & P;

export interface ThemeTemplates {
  Home: ThemeComponent<WithContext<{ home: HomeVM }>>;
  Page: ThemeComponent<WithContext<{ page: PageVM }>>;
  ArticleList: ThemeComponent<WithContext<{ articles: ArticleCardVM[]; categories: FilterOption[]; pagination: PaginationLinks }>>;
  Article: ThemeComponent<WithContext<{ article: ArticleVM }>>;
  EventList: ThemeComponent<WithContext<{ upcoming: EventCardVM[]; categories: FilterOption[] }>>;
  Event: ThemeComponent<WithContext<{ event: EventVM }>>;
  DocumentList: ThemeComponent<WithContext<{ documents: DocumentVM[]; types: KeyLabel[]; years: number[] }>>;
  Document: ThemeComponent<WithContext<{ document: DocumentVM }>>;
  Team: ThemeComponent<WithContext<{ team: TeamVM }>>;
  AssociationList: ThemeComponent<WithContext<{ associations: AssociationCardVM[]; categories: FilterOption[]; proposeHref: string }>>;
  Association: ThemeComponent<WithContext<{ association: AssociationVM }>>;
  AssociationProposal: ThemeComponent<WithContext<{ form: FormConfig }>>;
  Contact: ThemeComponent<WithContext<{ form: FormConfig }>>;
  Waste: ThemeComponent<WithContext<{ collections: WasteCollectionVM[] }>>;
  Canteen: ThemeComponent<WithContext<{ weeks: CanteenWeekVM[] }>>;
  Disruptions: ThemeComponent<WithContext<{ alerts: AlertVM[] }>>;
  /**
   * Cadre des pages dont le contenu est commun à tous les thèmes (pages légales, plan du site,
   * recherche, démarches) : le renderer fournit le contenu dans le slot par défaut.
   */
  Frame: ThemeComponent<WithContext<{ lead?: string | null }>>;
  NotFound: ThemeComponent<WithContext>;
}

export type TemplateName = keyof ThemeTemplates;

// --- Blocs ---------------------------------------------------------------------------------------

export type ThemeBlocks = { [T in BlockType]: ThemeComponent<{ block: BlockOf<T> }> };

// --- Thème ---------------------------------------------------------------------------------------

export interface Theme {
  manifest: ThemeManifest;
  templates: ThemeTemplates;
  blocks: ThemeBlocks;
}

/** Déclare un thème : TypeScript refuse un thème auquel il manque un template ou un bloc. */
export const defineTheme = <T extends Theme>(theme: T): T => theme;

export const TEMPLATE_NAMES: TemplateName[] = [
  'Home',
  'Page',
  'ArticleList',
  'Article',
  'EventList',
  'Event',
  'DocumentList',
  'Document',
  'Team',
  'AssociationList',
  'Association',
  'AssociationProposal',
  'Contact',
  'Waste',
  'Canteen',
  'Disruptions',
  'Frame',
  'NotFound',
];

import type { Alerte, Article, Association, Evenement, OfficialDocument, Page, SchoolMenu, Site, TeamMember, WasteSchedule } from '../generated/strapi';
import type {
  AlertVM,
  ArticleVM,
  AssociationVM,
  CanteenWeekVM,
  DocumentVM,
  EventVM,
  HomeVM,
  NavVM,
  PageVM,
  SiteVM,
  TeamVM,
  WasteCollectionVM,
} from '../vm/types';

/** Données brutes d'une commune, au format de l'API Strapi (réponse REST ou fixtures). */
export interface RawLoader {
  site(): Promise<Site>;
  pages(): Promise<Page[]>;
  articles(): Promise<Article[]>;
  events(): Promise<Evenement[]>;
  documents(): Promise<OfficialDocument[]>;
  team(): Promise<TeamMember[]>;
  associations(): Promise<Association[]>;
  alerts(): Promise<Alerte[]>;
  waste(): Promise<WasteSchedule[]>;
  canteen(): Promise<SchoolMenu[]>;
}

/** Ce que le renderer demande : des view-models prêts pour les thèmes. */
export interface ContentSource {
  site(): Promise<SiteVM>;
  navigation(): Promise<NavVM>;
  home(): Promise<HomeVM>;
  pages(): Promise<PageVM[]>;
  articles(): Promise<ArticleVM[]>;
  events(): Promise<EventVM[]>;
  documents(): Promise<DocumentVM[]>;
  team(): Promise<TeamVM>;
  associations(): Promise<AssociationVM[]>;
  /** Alertes visibles au moment du build (le navigateur revérifie les dates) */
  alerts(): Promise<AlertVM[]>;
  waste(): Promise<WasteCollectionVM[]>;
  /** Notes générales de la page Collecte des déchets (horaires de la déchetterie…) */
  wasteNotes(): Promise<string | null>;
  canteen(): Promise<CanteenWeekVM[]>;
}

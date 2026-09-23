/**
 * View-models : les données prêtes à afficher que reçoivent les thèmes.
 *
 * Règles :
 * - aucun type Strapi n'est exposé aux thèmes ;
 * - les libellés sont déjà en français (catégories, dates, tailles de fichiers) ;
 * - une section ou un champ absent vaut `null` : le thème décide de ne rien afficher ;
 * - les dates gardent leur valeur ISO pour <time datetime="…">.
 */
import type { RichTextHeading, RichTextList, RichTextParagraph } from '../blocks/rich-text';
import type { OpeningHours } from '../site/opening-hours';
import type { WasteRule } from '../site/practical-rules';
import type { ThemeId } from '../site/themes';

// --- Briques communes ---------------------------------------------------------------------------

export interface DateVM {
  iso: string;
  /** « 24 juin 2026 » */
  label: string;
}

export interface LinkVM {
  label: string;
  href: string;
  /** Lien vers un autre site : à signaler (icône, « nouvelle fenêtre ») */
  external: boolean;
}

export interface ImageVM {
  src: string;
  /** Texte alternatif ; chaîne vide si l'image est décorative */
  alt: string;
  width: number | null;
  height: number | null;
  /** Variantes redimensionnées, pour srcset */
  srcset: string | null;
  caption: string | null;
  credit: string | null;
}

export interface FileVM {
  name: string;
  href: string;
  /** « PDF » */
  type: string;
  /** « 1,2 Mo » */
  size: string;
  /** « PDF – 1,2 Mo » */
  label: string;
}

export interface KeyLabel<K extends string = string> {
  key: K;
  label: string;
}

/** Contact cliquable : { label: '02 41 00 00 00', href: 'tel:+33241000000' } */
export interface ContactPointVM {
  label: string;
  href: string;
}

export interface PaginationVM {
  page: number;
  pageCount: number;
  total: number;
}

export interface ListVM<T> extends PaginationVM {
  items: T[];
}

export interface TocEntryVM {
  id: string;
  label: string;
  level: 2 | 3;
}

export interface SeoVM {
  title: string;
  description: string | null;
  canonical: string;
  image: ImageVM | null;
  /** Données structurées schema.org, déjà prêtes à sérialiser */
  jsonLd: Record<string, unknown>[];
  noindex: boolean;
}

// --- Texte riche --------------------------------------------------------------------------------

/** Titre enrichi d'un identifiant d'ancre (sommaire, liens profonds). */
export type RichTextHeadingVM = Omit<RichTextHeading, 'attrs'> & { attrs: { level: 2 | 3; id: string } };
export type RichTextVM = { type: 'doc'; content: Array<RichTextParagraph | RichTextHeadingVM | RichTextList> };

// --- Blocs --------------------------------------------------------------------------------------

export type CalloutVariant = 'info' | 'warning' | 'important' | 'tip';
export type VideoProvider = 'youtube' | 'dailymotion' | 'vimeo';

export type BlockVM =
  | { type: 'text'; id: string; body: RichTextVM }
  | { type: 'image'; id: string; image: ImageVM; width: 'normal' | 'full' }
  | { type: 'buttons'; id: string; buttons: Array<LinkVM & { style: 'primary' | 'secondary' }> }
  | { type: 'callout'; id: string; variant: CalloutVariant; variantLabel: string; title: string | null; body: RichTextVM }
  | { type: 'documents'; id: string; title: string | null; files: FileVM[] }
  | { type: 'gallery'; id: string; title: string | null; images: ImageVM[] }
  | { type: 'faq'; id: string; title: string | null; items: Array<{ id: string; question: string; answer: RichTextVM }> }
  | {
      type: 'contact';
      id: string;
      name: string;
      address: string | null;
      phone: ContactPointVM | null;
      email: ContactPointVM | null;
      hours: string | null;
      /** Carte demandée : adresse à géolocaliser (chargée seulement après consentement) */
      map: { query: string } | null;
    }
  | {
      type: 'video';
      id: string;
      title: string;
      provider: VideoProvider;
      providerLabel: string;
      /** URL d'intégration sans cookie quand le fournisseur le permet */
      embedUrl: string;
      watchUrl: string;
      transcript: string | null;
    };

export type BlockType = BlockVM['type'];
export type BlockOf<T extends BlockType> = Extract<BlockVM, { type: T }>;

// --- Site et navigation -------------------------------------------------------------------------

export type AccessibilityLevel = 'non-conforme' | 'partiellement-conforme' | 'conforme';

export interface SiteVM {
  id: string;
  name: string;
  slug: string;
  theme: ThemeId;
  /** URL publique du site, sans slash final */
  url: string;
  logo: ImageVM | null;
  favicon: ImageVM | null;
  population: number | null;
  contact: {
    email: ContactPointVM;
    phone: ContactPointVM | null;
    address: string | null;
    coordinates: { lat: number; lng: number } | null;
    /** Horaires structurés : le statut « ouvert en ce moment » se calcule dans le navigateur */
    hours: OpeningHours | null;
    /** « Lun–Ven : 9h–12h / 14h–17h30 » */
    hoursSummary: Array<{ days: string; hours: string }>;
    formIntro: string | null;
  };
  social: Array<LinkVM & { platform: string }>;
  legal: {
    siret: string | null;
    publicationDirector: { name: string; title: string | null } | null;
    host: { name: string; address: string | null; phone: string | null } | null;
    credits: RichTextVM | null;
    extra: RichTextVM | null;
    privacyPolicy: RichTextVM | null;
    dpo: { name: string | null; email: ContactPointVM | null; phone: ContactPointVM | null } | null;
    accessibility: {
      level: AccessibilityLevel;
      /** « Partiellement conforme » */
      levelLabel: string;
      declaration: RichTextVM | null;
      schemaUrl: string | null;
      actionPlanUrl: string | null;
    };
  };
  services: {
    demarches: { enabled: boolean; inseeCode: string | null; audiences: string[] };
    openData: { enabled: boolean; url: string | null };
  };
}

export type NavItemVM = ({ kind: 'link' } & LinkVM) | { kind: 'group'; label: string; children: LinkVM[] };

export interface NavVM {
  main: NavItemVM[];
  footer: LinkVM[];
  /** Liens légaux obligatoires du pied de page (communs à tous les thèmes) */
  legal: LinkVM[];
}

// --- Contenus ------------------------------------------------------------------------------------

export interface ArticleCardVM {
  id: string;
  title: string;
  href: string;
  summary: string | null;
  image: ImageVM | null;
  date: DateVM;
  category: KeyLabel<'news' | 'event' | 'information' | 'emergency'>;
  featured: boolean;
}

export interface ArticleVM extends ArticleCardVM {
  author: string | null;
  blocks: BlockVM[];
  toc: TocEntryVM[];
  breadcrumb: LinkVM[];
  related: ArticleCardVM[];
  seo: SeoVM;
}

export interface EventCardVM {
  id: string;
  title: string;
  href: string;
  image: ImageVM | null;
  category: KeyLabel;
  start: DateVM;
  end: DateVM | null;
  /** « Samedi 5 octobre 2026, de 14h à 18h » ou « Du 12 au 14 juillet 2026 » */
  period: string;
  multiDay: boolean;
  location: string | null;
  featured: boolean;
}

export interface EventVM extends EventCardVM {
  address: string | null;
  /** « Gratuit » ou montant */
  price: string | null;
  organizer: string | null;
  contact: { email: ContactPointVM | null; phone: ContactPointVM | null };
  externalLink: LinkVM | null;
  registration: { required: boolean; deadline: DateVM | null; places: number | null } | null;
  /** Fichier .ics « Ajouter à mon agenda » */
  icsHref: string;
  blocks: BlockVM[];
  toc: TocEntryVM[];
  breadcrumb: LinkVM[];
  seo: SeoVM;
}

export interface PageVM {
  id: string;
  title: string;
  href: string;
  lead: string | null;
  image: ImageVM | null;
  blocks: BlockVM[];
  toc: TocEntryVM[];
  updatedAt: DateVM;
  breadcrumb: LinkVM[];
  seo: SeoVM;
}

export interface DocumentVM {
  id: string;
  title: string;
  href: string;
  type: KeyLabel;
  date: DateVM;
  sessionDate: DateVM | null;
  reference: string | null;
  year: number;
  description: string | null;
  file: FileVM | null;
  attachments: FileVM[];
}

export interface TeamMemberVM {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  /** « Maire », « 2e adjointe », « Conseiller municipal » */
  title: string;
  delegation: string | null;
  bio: string | null;
  photo: ImageVM | null;
  /** « CM », à afficher quand il n'y a pas de photo */
  initials: string;
  email: ContactPointVM | null;
  officeHours: string | null;
}

export interface TeamVM {
  groups: Array<{ key: 'maire' | 'adjoints' | 'conseillers' | 'services'; label: string; members: TeamMemberVM[] }>;
  total: number;
}

export interface AssociationCardVM {
  id: string;
  name: string;
  href: string;
  category: KeyLabel;
  summary: string | null;
  logo: ImageVM | null;
}

export interface AssociationVM extends AssociationCardVM {
  description: string | null;
  contact: { name: string | null; email: ContactPointVM | null; phone: ContactPointVM | null };
  website: LinkVM | null;
  address: string | null;
  breadcrumb: LinkVM[];
  seo: SeoVM;
}

export interface AlertVM {
  id: string;
  title: string;
  message: string;
  severity: KeyLabel<'info' | 'warning' | 'critical'>;
  type: KeyLabel | null;
  link: LinkVM | null;
  area: string | null;
  location: string | null;
  /** « Du 6 au 17 octobre 2026 » */
  period: string | null;
  start: DateVM | null;
  end: DateVM | null;
  /** Affichage : l'alerte n'est plus montrée après cette date (calcul dans le navigateur) */
  displayUntil: string | null;
}

export interface WasteCollectionVM {
  key: string;
  label: string;
  /** « OM », « TRI », « VER » : pastille textuelle, jamais la couleur seule */
  abbreviation: string;
  /** Jour de passage ; `null` pour l'apport volontaire ou sur rendez-vous */
  day: KeyLabel | null;
  /** Libellé complet : « Chaque semaine, d'avril à novembre », « Le 1er mercredi du mois » */
  frequency: KeyLabel;
  zone: string | null;
  notes: string | null;
  /** Règle de calcul des prochains passages (dans le navigateur) */
  rule: WasteRule;
  /** Prochains passages calculés au build (repli sans JavaScript) */
  upcoming: DateVM[];
}

export interface CanteenDayVM {
  day: KeyLabel;
  date: DateVM;
  closed: boolean;
  courses: Array<{ key: 'starter' | 'main' | 'side' | 'dairy' | 'dessert' | 'snack'; label: string; dish: string; badges: string[] }>;
}

export interface CanteenWeekVM {
  id: string;
  start: DateVM;
  /** « Semaine du 22 au 26 septembre » */
  label: string;
  school: string | null;
  mode: 'detailed' | 'file';
  days: CanteenDayVM[];
  file: FileVM | null;
  image: ImageVM | null;
}

// --- Accueil -------------------------------------------------------------------------------------

export interface HomeVM {
  hero: {
    title: string;
    subtitle: string | null;
    image: ImageVM | null;
    primary: LinkVM | null;
    secondary: LinkVM | null;
  } | null;
  quickLinks: Array<LinkVM & { description: string | null; icon: string | null }> | null;
  featuredNews: ArticleCardVM[] | null;
  agenda: EventCardVM[] | null;
  mayorWord: { title: string; body: RichTextVM; photo: ImageVM | null; signature: { name: string | null; role: string | null } } | null;
  keyFigures: Array<{ value: string; label: string; icon: string | null }> | null;
  /** Les données viennent de SiteVM.contact */
  practicalInfo: boolean;
  weather: { lat: number; lng: number } | null;
  wasteCollection: WasteCollectionVM[] | null;
  disruptions: AlertVM[] | null;
  canteen: CanteenWeekVM | null;
  associations: AssociationCardVM[] | null;
  partners: Array<{ name: string; logo: ImageVM | null; href: string | null }> | null;
  newsletter: boolean;
  freeContent: { title: string | null; body: RichTextVM } | null;
  seo: SeoVM;
}

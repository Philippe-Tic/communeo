// Média Strapi v5 format plat (retourné par populate)
export interface StrapiMedia {
  id: number;
  documentId: string;
  name: string;
  url: string;
  alternativeText?: string;
  width?: number;
  height?: number;
  size: number;
  mime: string;
  ext?: string;
}

// Type pour les relations Strapi v5
export interface StrapiData<T> {
  data: T;
}

export interface StrapiCollection<T> {
  data: T[];
}

// Composants légaux Strapi
export interface MentionsLegales {
  id?: number;
  siret?: string;
  publication_director?: string;
  publication_director_title?: string;
  hebergeur_name?: string;
  hebergeur_address?: string;
  hebergeur_phone?: string;
  credits?: string;
  mentions_legales_extra?: string;
}

export interface RGPD {
  id?: number;
  rgpd_policy?: string;
  dpo_name?: string;
  dpo_email?: string;
  dpo_phone?: string;
}

export interface Accessibilite {
  id?: number;
  accessibility_level?: 'non-conforme' | 'partiellement-conforme' | 'conforme';
  accessibility_declaration?: string;
  accessibility_schema_url?: string;
  accessibility_action_plan_url?: string;
}

export interface InfosPratiques {
  id?: number;
  opening_hours?: any;
  population?: number;
  contact_form_intro?: string;
  latitude?: number;
  longitude?: number;
}

export interface DemarchesIdentite {
  id?: number;
  has_dispositif_recueil?: boolean;
  appointment_url?: string;
  appointment_provider?: 'synbird' | 'ants-rdv' | 'rdv-service-public' | 'autre';
  remise_titre_info?: string;
}

// Homepage config components
export interface HomepageQuickLink {
  id?: number;
  label: string;
  url: string;
  description?: string;
  icon?: 'document' | 'identity' | 'folder' | 'mail' | 'alert' | 'clock' | 'phone' | 'map' | 'calendar' | 'users' | 'building' | 'heart' | 'info' | 'shield' | 'book' | 'globe';
}

export interface HomepageKeyFigure {
  id?: number;
  value: string;
  label: string;
  icon?: 'users' | 'map' | 'building' | 'calendar' | 'heart' | 'book' | 'globe' | 'shield' | 'tree' | 'star';
}

export interface HomepagePartner {
  id?: number;
  name: string;
  logo?: StrapiMedia | null;
  url?: string;
}

export interface HomepageConfig {
  id?: number;
  hero_title?: string;
  hero_subtitle?: string;
  hero_image?: StrapiMedia | null;
  hero_cta_primary_label?: string;
  hero_cta_primary_url?: string;
  hero_cta_secondary_label?: string;
  hero_cta_secondary_url?: string;
  content?: string;
  meta_description?: string;
  show_quick_links?: boolean;
  quick_links?: HomepageQuickLink[];
  show_mayor_word?: boolean;
  mayor_word_title?: string;
  mayor_word_content?: string;
  show_articles?: boolean;
  articles_count?: number;
  show_events?: boolean;
  events_count?: number;
  show_key_figures?: boolean;
  key_figures?: HomepageKeyFigure[];
  show_associations?: boolean;
  associations_count?: number;
  show_partners?: boolean;
  partners?: HomepagePartner[];
  show_weather?: boolean;
  show_waste_collection?: boolean;
  show_disruptions?: boolean;
  show_newsletter?: boolean;
  show_school_menu?: boolean;
}

// Réseaux sociaux
export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'tiktok' | 'autre';

export interface SocialLink {
  id?: number;
  platform: SocialPlatform;
  url: string;
  label?: string;
  icon?: StrapiMedia | null;
}

// Navigation configurable
export type LinkKey = 'articles' | 'evenements' | 'documents' | 'equipe' | 'associations' | 'demarches' | 'open-data' | 'collecte-dechets' | 'perturbations' | 'cantine';

export type NavigationItemType = 'page' | 'link' | 'section';

export interface NavigationItem {
  id: string;
  type: NavigationItemType;
  label?: string;
  enabled: boolean;
  // type='page':
  pageDocumentId?: string;
  // type='link':
  linkKey?: LinkKey;
  // type='section':
  children?: NavigationItem[];
}

// Configuration du site (mairie) - Strapi v5
export interface Site {
  id: number;
  documentId: string;
  name: string;            // "Mairie de Lyon"
  slug: string;            // "lyon"
  colors?: any;            // JSON field
  logo?: StrapiMedia | null;
  favicon?: StrapiMedia | null;
  mentions_legales?: MentionsLegales;
  rgpd?: RGPD;
  accessibilite?: Accessibilite;
  infos_pratiques?: InfosPratiques;
  demarches_identite?: DemarchesIdentite;
  contact_mail: string;
  contact_phone?: string;
  address?: string;
  // Open Data
  open_data_enabled?: boolean;
  open_data_url?: string;
  open_data_platform?: 'data-gouv-fr' | 'opendatasoft' | 'custom' | 'none';
  // Homepage
  homepage?: HomepageConfig;
  // Navigation
  navigation_config?: NavigationItem[];
  // Réseaux sociaux
  social_links?: SocialLink[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Pages CMS - Strapi v5
export interface Page {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: string;         // Rich text HTML
  status: 'draft' | 'published' | 'archived';
  meta_description?: string;
  featured_image?: StrapiMedia | null;
  menu_order: number;
  show_in_menu: boolean;
  template: 'default' | 'about' | 'services';
  scheduled_at?: string;
  site: StrapiData<Site> | Site;  // Relation (peut être peuplée ou non)
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Articles - Strapi v5
export interface Article {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  image?: StrapiMedia | null;
  publication_date?: string;
  summary?: string;
  category: 'news' | 'event' | 'information' | 'emergency';
  author?: string;
  featured: boolean;
  meta_description?: string;
  scheduled_at?: string;
  view_count?: number;
  site: StrapiData<Site> | Site;  // Relation (peut être peuplée ou non)
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Événements - Strapi v5
export interface Event {
  id: number;
  documentId: string;
  title: string;
  description: string;
  slug: string;
  start_date: string;
  end_date?: string;
  location?: string;
  image?: StrapiMedia | null;
  price: string;
  external_link?: string;
  category: 'cultural' | 'sport' | 'meeting' | 'celebration' | 'workshop' | 'conference';
  organizer?: string;
  contact_email?: string;
  contact_phone?: string;
  max_participants?: number;
  registration_required: boolean;
  registration_deadline?: string;
  address?: string;
  featured: boolean;
  site: StrapiData<Site> | Site;  // Relation (peut être peuplée ou non)
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Réponses API Strapi v5
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiCollectionResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Documents officiels - Strapi v5
export interface OfficialDocument {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description?: string;
  document_type: 'pv-conseil-municipal' | 'deliberation' | 'arrete' | 'plu' | 'scot' | 'carte-communale' | 'budget-primitif' | 'compte-administratif' | 'rapport-orientations-budgetaires' | 'autre';
  document_date: string;
  session_date?: string;
  file: StrapiMedia | null;
  additional_files?: StrapiMedia[];
  status: 'draft' | 'published' | 'archived';
  reference_number?: string;
  year: number;
  site: StrapiData<Site> | Site;
  createdAt: string;
  updatedAt: string;
}

// Membres de l'équipe municipale - Strapi v5
export interface TeamMember {
  id: number;
  documentId: string;
  first_name: string;
  last_name: string;
  role: 'maire' | 'adjoint' | 'conseiller' | 'dgs' | 'agent';
  delegation?: string;
  bio?: string;
  photo?: StrapiMedia;
  display_order: number;
  site: StrapiData<Site> | Site;
  createdAt: string;
  updatedAt: string;
}

// Associations - Strapi v5
export interface Association {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  category: 'sport' | 'culture' | 'social' | 'environnement' | 'education' | 'autre';
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  address?: string;
  logo?: StrapiMedia;
  status: 'pending' | 'published' | 'rejected';
  submission_source: 'manual' | 'public_form';
  site: StrapiData<Site> | Site;
  createdAt: string;
  updatedAt: string;
}

export type AlerteType = 'travaux' | 'coupure-eau' | 'coupure-electricite' | 'deviation' | 'intemperie' | 'autre';

export interface Alerte {
  id: number;
  documentId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  active: boolean;
  display_from?: string;
  display_until?: string;
  link_url?: string;
  link_label?: string;
  alert_type?: AlerteType;
  location?: string;
  start_date?: string;
  end_date?: string;
  affected_area?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WasteSchedule {
  id: number;
  documentId: string;
  waste_type: 'ordures-menageres' | 'tri-selectif' | 'verre' | 'dechets-verts' | 'encombrants';
  collection_day: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
  frequency: 'hebdomadaire' | 'bimensuel' | 'mensuel';
  start_date?: string;
  zone?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Menus de cantine scolaire
export type MealLabel = 'bio' | 'local' | 'vegetarien' | 'fait-maison' | 'aop';

export interface SchoolMenuMeal {
  id?: number;
  day: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi';
  starter?: string;
  main_course: string;
  side_dish?: string;
  dairy?: string;
  dessert?: string;
  snack?: string;
  labels?: MealLabel[];
}

export interface SchoolMenu {
  id: number;
  documentId: string;
  week_start: string;
  menu_mode: 'image' | 'manual';
  menu_image?: StrapiMedia | null;
  menu_pdf?: StrapiMedia | null;
  meals?: SchoolMenuMeal[];
  school_name?: string;
  createdAt: string;
  updatedAt: string;
}

// Types utilitaires
export type SiteData = Site;
export type PageData = Page;
export type ArticleData = Article;
export type EventData = Event;
export type OfficialDocumentData = OfficialDocument;

// Types pour les médias Strapi v5 (format wrappé legacy)
export interface MediaAttribute {
  data?: {
    id: number;
    documentId: string;
    name: string;
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
    size: number;
    mime: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

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
}

// Configuration du site (mairie) - Strapi v5
export interface Site {
  id: number;
  documentId: string;
  name: string;            // "Mairie de Lyon"
  slug: string;            // "lyon"
  theme: 'classique' | 'moderne' | 'accessible';
  colors?: any;            // JSON field
  logo?: MediaAttribute;
  mentions_legales?: MentionsLegales;
  rgpd?: RGPD;
  accessibilite?: Accessibilite;
  infos_pratiques?: InfosPratiques;
  contact_mail: string;
  contact_phone?: string;
  address?: string;
  // Open Data
  open_data_enabled?: boolean;
  open_data_url?: string;
  open_data_platform?: 'data-gouv-fr' | 'opendatasoft' | 'custom' | 'none';
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
  featured_image?: MediaAttribute;
  menu_order: number;
  show_in_menu: boolean;
  template: 'default' | 'homepage' | 'about' | 'services';
  is_homepage: boolean;
  parent_page?: Page | null;
  child_pages?: Page[];
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
  image?: MediaAttribute;
  publication_date?: string;
  summary?: string;
  category: 'news' | 'event' | 'information' | 'emergency';
  author?: string;
  featured: boolean;
  meta_description?: string;
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
  image?: MediaAttribute;
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

// Types utilitaires
export type SiteData = Site;
export type PageData = Page;
export type ArticleData = Article;
export type EventData = Event;
export type OfficialDocumentData = OfficialDocument;

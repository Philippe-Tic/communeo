// Types pour les médias Strapi v5
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

// Type pour les relations Strapi v5
export interface StrapiData<T> {
  data: T;
}

export interface StrapiCollection<T> {
  data: T[];
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
  contact_mail: string;
  contact_phone?: string;
  address?: string;
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
  template: 'default' | 'homepage' | 'contact' | 'about' | 'services';
  is_homepage: boolean;
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

// Types utilitaires
export type SiteData = Site;
export type PageData = Page;
export type ArticleData = Article;
export type EventData = Event;

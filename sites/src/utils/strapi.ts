import type {
  Site, Page, Article, Event, StrapiCollectionResponse
} from '../types/strapi';

// Configuration depuis les variables d'environnement
const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = import.meta.env.STRAPI_TOKEN || '';
const SITE_DOCUMENT_ID = import.meta.env.SITE_DOCUMENT_ID || ''; // Utilisation du documentId au lieu de l'id numérique

// Configuration de base pour les requêtes
const baseConfig = {
  headers: {
    'Content-Type': 'application/json',
    ...(STRAPI_TOKEN && { 'Authorization': `Bearer ${STRAPI_TOKEN}` })
  }
};

/**
 * Fonction utilitaire pour construire les URLs avec filtres et populate
 */
function buildStrapiUrl(endpoint: string, options: {
  filters?: Record<string, any>;
  populate?: string | string[] | Record<string, any>;
  sort?: string | string[];
  pagination?: { page?: number; pageSize?: number };
} = {}): string {
  const url = new URL(`${STRAPI_URL}/api/${endpoint}`);

  // Filtre automatique par site documentId pour tous les contenus sauf les sites eux-mêmes
  if (endpoint !== 'sites' && !endpoint.startsWith('sites/')) {
    if (SITE_DOCUMENT_ID) {
      url.searchParams.set('filters[site][documentId][$eq]', SITE_DOCUMENT_ID);
    }
  }

  // Filtres additionnels
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          url.searchParams.set(`filters[${key}][${subKey}]`, String(subValue));
        });
      } else {
        url.searchParams.set(`filters[${key}]`, String(value));
      }
    });
  }

  // Populate
  if (options.populate) {
    if (typeof options.populate === 'string') {
      url.searchParams.set('populate', options.populate);
    } else if (Array.isArray(options.populate)) {
      options.populate.forEach(field => {
        url.searchParams.append('populate', field);
      });
    } else {
      url.searchParams.set('populate', '*');
    }
  }

  // Sort
  if (options.sort) {
    const sortParam = Array.isArray(options.sort) ? options.sort.join(',') : options.sort;
    url.searchParams.set('sort', sortParam);
  }

  // Pagination
  if (options.pagination) {
    if (options.pagination.page) {
      url.searchParams.set('pagination[page]', String(options.pagination.page));
    }
    if (options.pagination.pageSize) {
      url.searchParams.set('pagination[pageSize]', String(options.pagination.pageSize));
    }
  }

  return url.toString();
}

/**
 * Fonction générique pour les requêtes Strapi
 */
async function strapiRequest<T>(url: string): Promise<T | null> {
  // Pendant le build, on skip complètement les requêtes Strapi
  if (process.env.NODE_ENV === 'production') {
    console.log('🚫 [BUILD MODE] Skipping Strapi request:', url);
    return null;
  }

  try {
    const response = await fetch(url, baseConfig);

    if (!response.ok) {
      throw new Error(`Strapi request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Strapi request error:', error);
    return null;
  }
}

/**
 * Récupère la configuration du site actuel
 */
export async function getSiteConfig(): Promise<Site> {
  if (!SITE_DOCUMENT_ID) {
    return createDefaultSite();
  }

  // Rechercher le site par documentId
  const url = buildStrapiUrl('sites', {
    filters: {
      documentId: { $eq: SITE_DOCUMENT_ID }
    },
    populate: ['logo']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Site>>(url);

  if (!response || !response.data || response.data.length === 0) {
    console.warn(`Site with documentId ${SITE_DOCUMENT_ID} not found, using default`);
    return createDefaultSite();
  }

  return response.data[0];
}

/**
 * Crée un site par défaut pour les builds sans connexion Strapi
 */
function createDefaultSite(): Site {
  return {
    id: 1,
    documentId: SITE_DOCUMENT_ID || 'default',
    name: 'Mairie',
    slug: 'default',
    theme: 'classique',
    colors: {
      primary: '#1f2937',
      secondary: '#3b82f6',
      primaryRgb: '31, 41, 55',
      secondaryRgb: '59, 130, 246'
    },
    contact_mail: 'contact@mairie.fr',
    address: 'Adresse de la mairie',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString()
  };
}

/**
 * Récupère la page d'accueil (page avec is_homepage=true)
 */
export async function getHomepage(): Promise<Page | null> {
  const url = buildStrapiUrl('pages', {
    filters: {
      status: { $eq: 'published' },
      is_homepage: { $eq: true }
    },
    populate: ['featured_image', 'site']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Page>>(url);
  if (!response?.data) return null;
  return response.data.length > 0 ? response.data[0] : null;
}

/**
 * Récupère toutes les pages publiées
 */
export async function getPages(): Promise<Page[]> {
  const url = buildStrapiUrl('pages', {
    filters: {
      status: { $eq: 'published' }
    },
    populate: ['featured_image', 'site'],
    sort: ['menu_order:asc', 'title:asc']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Page>>(url);
  return response?.data ?? [];
}

/**
 * Récupère les pages à afficher dans le menu
 */
export async function getMenuPages(): Promise<Page[]> {
  const url = buildStrapiUrl('pages', {
    filters: {
      status: { $eq: 'published' },
      show_in_menu: { $eq: true }
    },
    populate: ['site'],
    sort: ['menu_order:asc', 'title:asc']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Page>>(url);
  return response?.data ?? [];
}

/**
 * Récupère une page par son slug
 */
export async function getPageBySlug(slug: string): Promise<Page | null> {
  const url = buildStrapiUrl('pages', {
    filters: {
      slug: { $eq: slug },
      status: { $eq: 'published' }
    },
    populate: ['featured_image', 'site']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Page>>(url);
  if (!response?.data) return null;
  return response.data.length > 0 ? response.data[0] : null;
}

/**
 * Récupère tous les articles publiés
 */
export async function getArticles(limit?: number): Promise<Article[]> {
  const url = buildStrapiUrl('articles', {
    filters: {
      status: { $eq: 'published' }
    },
    populate: ['image', 'site'],
    sort: ['publication_date:desc', 'createdAt:desc'],
    ...(limit && { pagination: { pageSize: limit } })
  });

  const response = await strapiRequest<StrapiCollectionResponse<Article>>(url);
  return response?.data ?? [];
}

/**
 * Récupère les articles mis en avant
 */
export async function getFeaturedArticles(limit: number = 3): Promise<Article[]> {
  const url = buildStrapiUrl('articles', {
    filters: {
      status: { $eq: 'published' },
      featured: { $eq: true }
    },
    populate: ['image', 'site'],
    sort: ['publication_date:desc', 'createdAt:desc'],
    pagination: { pageSize: limit }
  });

  const response = await strapiRequest<StrapiCollectionResponse<Article>>(url);
  return response?.data ?? [];
}

/**
 * Récupère un article par son slug
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const url = buildStrapiUrl('articles', {
    filters: {
      slug: { $eq: slug },
      status: { $eq: 'published' }
    },
    populate: ['image', 'site']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Article>>(url);
  if (!response?.data) return null;
  return response.data.length > 0 ? response.data[0] : null;
}

/**
 * Récupère les événements à venir
 */
export async function getUpcomingEvents(limit?: number): Promise<Event[]> {
  const now = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

  const url = buildStrapiUrl('evenements', {
    filters: {
      start_date: { $gte: now },
      category: { $in: ['cultural', 'sport', 'meeting', 'celebration', 'workshop', 'conference'] }
    },
    populate: ['image', 'site'],
    sort: ['start_date:asc'],
    ...(limit && { pagination: { pageSize: limit } })
  });

  const response = await strapiRequest<StrapiCollectionResponse<Event>>(url);
  return response?.data ?? [];
}

/**
 * Récupère tous les événements
 */
export async function getEvents(): Promise<Event[]> {
  const url = buildStrapiUrl('evenements', {
    populate: ['image', 'site'],
    sort: ['start_date:desc']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Event>>(url);
  return response?.data ?? [];
}

/**
 * Récupère un événement par son slug
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const url = buildStrapiUrl('evenements', {
    filters: {
      slug: { $eq: slug }
    },
    populate: ['image', 'site']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Event>>(url);
  if (!response?.data) return null;
  return response.data.length > 0 ? response.data[0] : null;
}

/**
 * Utilitaire pour construire l'URL complète d'une image Strapi
 */
export function getStrapiImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';

  // Si l'URL est déjà absolue, la retourner telle quelle
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }

  // Sinon, préfixer avec l'URL de Strapi
  return `${STRAPI_URL}${imageUrl}`;
}

/**
 * Utilitaire pour formater les dates en français
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Utilitaire pour formater les dates et heures en français
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

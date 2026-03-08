import type {
  Site, Page, Article, Event, OfficialDocument, TeamMember, Association, Alerte, WasteSchedule, SchoolMenu, StrapiCollectionResponse
} from '../types/strapi';

/**
 * Filtre les contenus dont scheduled_at est dans le futur (publication programmée).
 * Les contenus sans scheduled_at ou avec une date passée sont conservés.
 */
function filterScheduled<T extends { scheduled_at?: string }>(items: T[]): T[] {
  const now = new Date();
  return items.filter(item => !item.scheduled_at || new Date(item.scheduled_at) <= now);
}

/**
 * Vérifie si un contenu unique est déjà publié (scheduled_at dans le passé ou absent).
 */
function isPublished<T extends { scheduled_at?: string }>(item: T | null): boolean {
  if (!item) return false;
  if (!item.scheduled_at) return true;
  return new Date(item.scheduled_at) <= new Date();
}

// Configuration depuis les variables d'environnement
const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
export { STRAPI_URL as strapiBaseUrl };

// URL publique pour les liens dans le HTML (documents, og:image, etc.)
const STRAPI_PUBLIC_URL = import.meta.env.STRAPI_PUBLIC_URL || STRAPI_URL;
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
  try {
    const response = await fetch(url, baseConfig);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`Strapi ${response.status} ${response.statusText} — ${url}`);
      if (body) console.error(`   Response: ${body.substring(0, 500)}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Strapi unreachable — ${url}:`, (error as Error).message);
    return null;
  }
}

/**
 * Récupère la configuration du site actuel
 */
export async function getSiteConfig(): Promise<Site> {
  if (!SITE_DOCUMENT_ID) {
    console.warn('SITE_DOCUMENT_ID not set — site will be grey/empty');
    return createDefaultSite();
  }

  // Rechercher le site par documentId avec named populate (using 'true' to avoid Strapi v5 recursing into media internal relations)
  const baseUrl = buildStrapiUrl('sites', {
    filters: {
      documentId: { $eq: SITE_DOCUMENT_ID }
    }
  });
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.set('populate[logo]', 'true');
  urlObj.searchParams.set('populate[favicon]', 'true');
  urlObj.searchParams.set('populate[mentions_legales]', 'true');
  urlObj.searchParams.set('populate[rgpd]', 'true');
  urlObj.searchParams.set('populate[accessibilite]', 'true');
  urlObj.searchParams.set('populate[infos_pratiques]', 'true');
  urlObj.searchParams.set('populate[demarches_identite]', 'true');
  urlObj.searchParams.set('populate[homepage][populate][hero_image]', 'true');
  urlObj.searchParams.set('populate[homepage][populate][quick_links]', 'true');
  urlObj.searchParams.set('populate[homepage][populate][key_figures]', 'true');
  urlObj.searchParams.set('populate[homepage][populate][partners][populate][logo]', 'true');
  urlObj.searchParams.set('populate[social_links][populate][icon]', 'true');
  const url = urlObj.toString();

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
    colors: {
      primary: '#1f2937',
      primaryRgb: '31 41 55',
    },
    contact_mail: 'contact@mairie.fr',
    address: 'Adresse de la mairie',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString()
  };
}

/**
 * Récupère toutes les pages publiées
 */
export async function getPages(): Promise<Page[]> {
  const url = buildStrapiUrl('pages', {
    filters: {
      status: { $eq: 'published' }
    },
    populate: ['featured_image', 'site', 'parent_page', 'child_pages'],
    sort: ['menu_order:asc', 'title:asc']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Page>>(url);
  return filterScheduled(response?.data ?? []);
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
    populate: ['site', 'parent_page', 'child_pages'],
    sort: ['menu_order:asc', 'title:asc']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Page>>(url);
  return filterScheduled(response?.data ?? []);
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
    populate: ['featured_image', 'site', 'parent_page', 'child_pages']
  });

  const response = await strapiRequest<StrapiCollectionResponse<Page>>(url);
  if (!response?.data) return null;
  const page = response.data.length > 0 ? response.data[0] : null;
  return isPublished(page) ? page : null;
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
  return filterScheduled(response?.data ?? []);
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
  return filterScheduled(response?.data ?? []);
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
  const article = response.data.length > 0 ? response.data[0] : null;
  return isPublished(article) ? article : null;
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
 * Récupère tous les documents officiels publiés
 */
export async function getOfficialDocuments(): Promise<OfficialDocument[]> {
  const url = buildStrapiUrl('official-documents', {
    filters: {
      status: { $eq: 'published' }
    },
    populate: ['file', 'additional_files', 'site'],
    sort: ['document_date:desc'],
    pagination: { pageSize: 500 }
  });

  const response = await strapiRequest<StrapiCollectionResponse<OfficialDocument>>(url);
  return response?.data ?? [];
}

/**
 * Récupère un document officiel par son slug
 */
export async function getOfficialDocumentBySlug(slug: string): Promise<OfficialDocument | null> {
  const url = buildStrapiUrl('official-documents', {
    filters: {
      slug: { $eq: slug },
      status: { $eq: 'published' }
    },
    populate: ['file', 'additional_files', 'site']
  });

  const response = await strapiRequest<StrapiCollectionResponse<OfficialDocument>>(url);
  if (!response?.data) return null;
  return response.data.length > 0 ? response.data[0] : null;
}

/**
 * Récupère les membres de l'équipe municipale
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const url = buildStrapiUrl('team-members', {
    populate: ['photo', 'site'],
    sort: ['display_order:asc', 'last_name:asc']
  });

  const response = await strapiRequest<StrapiCollectionResponse<TeamMember>>(url);
  return response?.data ?? [];
}

/**
 * Récupère les associations publiées
 */
export async function getAssociations(): Promise<Association[]> {
  const url = buildStrapiUrl('associations', {
    filters: {
      status: { $eq: 'published' }
    },
    populate: ['logo', 'site'],
    sort: ['name:asc'],
    pagination: { pageSize: 500 }
  });

  const response = await strapiRequest<StrapiCollectionResponse<Association>>(url);
  return response?.data ?? [];
}

/**
 * Récupère les alertes actives pour le site
 */
export async function getActiveAlerts(): Promise<Alerte[]> {
  const url = buildStrapiUrl('alertes', {
    filters: {
      active: { $eq: true },
    },
    sort: 'severity:desc,createdAt:desc',
  });

  const response = await strapiRequest<StrapiCollectionResponse<Alerte>>(url);
  if (!response?.data) return [];

  // Filter out alerts outside their display window
  return response.data.filter(alert => {
    if (alert.display_from && new Date(alert.display_from) > new Date()) return false;
    if (alert.display_until && new Date(alert.display_until) < new Date()) return false;
    return true;
  });
}

/**
 * Recupere les plannings de collecte actifs
 */
export async function getActiveWasteSchedules(): Promise<WasteSchedule[]> {
  const url = buildStrapiUrl('waste-schedules', {
    filters: {
      active: { $eq: true },
    },
    sort: 'waste_type:asc',
  });

  const response = await strapiRequest<StrapiCollectionResponse<WasteSchedule>>(url);
  return response?.data ?? [];
}

/**
 * Calcule le lundi de la semaine courante
 */
function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Recupere le menu de cantine de la semaine courante
 */
export async function getCurrentSchoolMenu(): Promise<SchoolMenu | null> {
  const weekStart = getCurrentMonday();
  return getSchoolMenuByWeek(weekStart);
}

/**
 * Recupere le menu de cantine d'une semaine donnee
 */
export async function getSchoolMenuByWeek(weekStart: string): Promise<SchoolMenu | null> {
  const baseUrl = buildStrapiUrl('school-menus', {
    filters: {
      week_start: { $eq: weekStart },
    },
  });
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.set('populate[meals]', 'true');
  urlObj.searchParams.set('populate[menu_image]', 'true');
  urlObj.searchParams.set('populate[menu_pdf]', 'true');

  const response = await strapiRequest<StrapiCollectionResponse<SchoolMenu>>(urlObj.toString());
  if (!response?.data || response.data.length === 0) return null;
  return response.data[0];
}

/**
 * Recupere les menus de cantine dans une plage de dates (pour pre-fetching statique)
 */
export async function getSchoolMenusInRange(startDate: string, endDate: string): Promise<SchoolMenu[]> {
  const baseUrl = buildStrapiUrl('school-menus', {
    filters: {
      week_start: { $gte: startDate, $lte: endDate },
    },
    sort: 'week_start:asc',
  });
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.set('populate[meals]', 'true');
  urlObj.searchParams.set('populate[menu_image]', 'true');
  urlObj.searchParams.set('populate[menu_pdf]', 'true');

  const response = await strapiRequest<StrapiCollectionResponse<SchoolMenu>>(urlObj.toString());
  return response?.data ?? [];
}

/**
 * Récupère le maire (premier team_member avec role=maire)
 */
export async function getMayor(): Promise<TeamMember | null> {
  const url = buildStrapiUrl('team-members', {
    filters: {
      role: { $eq: 'maire' }
    },
    populate: ['photo', 'site'],
    pagination: { pageSize: 1 }
  });

  const response = await strapiRequest<StrapiCollectionResponse<TeamMember>>(url);
  if (!response?.data || response.data.length === 0) return null;
  return response.data[0];
}

/**
 * Récupère les associations publiées avec une limite
 */
export async function getPublishedAssociations(limit: number = 6): Promise<Association[]> {
  const url = buildStrapiUrl('associations', {
    filters: {
      status: { $eq: 'published' }
    },
    populate: ['logo', 'site'],
    sort: ['name:asc'],
    pagination: { pageSize: limit }
  });

  const response = await strapiRequest<StrapiCollectionResponse<Association>>(url);
  return response?.data ?? [];
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

  // Sinon, préfixer avec l'URL publique de Strapi
  return `${STRAPI_PUBLIC_URL}${imageUrl}`;
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
 * Construit le chemin hiérarchique complet d'une page en remontant la chaîne des parents.
 * Ex: page "Permis" (parent: "Urbanisme") → "urbanisme/permis"
 */
export function getPagePath(page: Page, allPages: Page[]): string {
  const segments: string[] = [];
  let current: Page | undefined = page;

  while (current) {
    segments.unshift(current.slug);
    if (current.parent_page) {
      current = allPages.find(p => p.documentId === current!.parent_page?.documentId);
    } else {
      current = undefined;
    }
  }

  return segments.join('/');
}

/**
 * Construit le fil d'Ariane pour une page.
 * Retourne un tableau [{title, path}] du parent racine jusqu'à la page courante.
 */
export function buildBreadcrumbs(page: Page, allPages: Page[]): Array<{ title: string; path: string }> {
  const crumbs: Array<{ title: string; path: string }> = [];
  let current: Page | undefined = page;

  while (current) {
    crumbs.unshift({
      title: current.title,
      path: '/' + getPagePath(current, allPages),
    });
    if (current.parent_page) {
      current = allPages.find(p => p.documentId === current!.parent_page?.documentId);
    } else {
      current = undefined;
    }
  }

  return crumbs;
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

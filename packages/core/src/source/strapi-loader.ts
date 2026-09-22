/**
 * Chargement des données d'une commune depuis l'API REST de Strapi.
 * Utilisé par le renderer au build (contenus publiés) et par la preview (brouillons).
 */
import type { Alerte, Article, Association, Evenement, OfficialDocument, Page, SchoolMenu, Site, TeamMember, WasteSchedule } from '../generated/strapi';
import type { RawLoader } from './types';

export interface StrapiLoaderOptions {
  /** URL de l'API, sans /api (ex. http://localhost:1337) */
  apiUrl: string;
  /** Token en lecture seule */
  token: string;
  siteDocumentId: string;
  /** `draft` pour la preview : dernières modifications, même non publiées */
  status?: 'published' | 'draft';
  fetch?: typeof fetch;
}

type Query = Record<string, unknown>;

/** Sérialise un objet imbriqué au format qs de Strapi : populate[blocks][populate]=* */
export function toQueryString(query: Query): string {
  const params = new URLSearchParams();
  const walk = (value: unknown, key: string) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${key}[${index}]`));
    else if (typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, key ? `${key}[${k}]` : k);
    else params.append(key, String(value));
  };
  walk(query, '');
  return params.toString();
}

const BLOCKS = { blocks: { populate: '*' } };

const SITE_POPULATE = {
  logo: true,
  favicon: true,
  mentions_legales: true,
  rgpd: true,
  accessibilite: true,
  infos_pratiques: true,
  social_links: true,
  homepage: {
    populate: {
      hero: { populate: ['image'] },
      quick_links: { populate: ['items'] },
      featured_news: true,
      agenda: true,
      mayor_word: { populate: ['photo'] },
      key_figures: { populate: ['items'] },
      practical_info: true,
      weather: true,
      waste_collection: true,
      disruptions: true,
      canteen: true,
      associations: true,
      partners: { populate: { items: { populate: ['logo'] } } },
      newsletter: true,
      free_content: true,
    },
  },
};

export class StrapiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function createStrapiLoader(options: StrapiLoaderOptions): RawLoader {
  const doFetch = options.fetch ?? fetch;
  const base = options.apiUrl.replace(/\/$/, '');
  const bySite = { site: { documentId: { $eq: options.siteDocumentId } } };
  const status = options.status ?? 'published';

  async function request<T>(path: string, query: Query): Promise<{ data: T; meta?: { pagination?: { pageCount: number } } }> {
    const url = `${base}/api/${path}?${toQueryString(query)}`;
    const response = await doFetch(url, { headers: { Authorization: `Bearer ${options.token}` } });
    if (!response.ok) {
      throw new StrapiError(`Strapi ${response.status} sur /api/${path} : ${await response.text().catch(() => '')}`, response.status);
    }
    return (await response.json()) as { data: T; meta?: { pagination?: { pageCount: number } } };
  }

  /** Récupère toutes les pages de résultats (100 par requête). */
  async function all<T>(path: string, query: Query = {}): Promise<T[]> {
    const items: T[] = [];
    for (let page = 1; ; page += 1) {
      const { data, meta } = await request<T[]>(path, { ...query, status, filters: { ...bySite, ...(query.filters as Query) }, pagination: { page, pageSize: 100 } });
      items.push(...data);
      if (page >= (meta?.pagination?.pageCount ?? 1)) return items;
    }
  }

  return {
    async site() {
      const { data } = await request<Site[]>('sites', { filters: { documentId: { $eq: options.siteDocumentId } }, populate: SITE_POPULATE });
      if (!data[0]) throw new StrapiError(`Commune introuvable : ${options.siteDocumentId}`, 404);
      return data[0];
    },
    pages: () => all<Page>('pages', { populate: { featured_image: true, ...BLOCKS }, sort: ['title:asc'] }),
    articles: () => all<Article>('articles', { populate: { image: true, ...BLOCKS }, sort: ['publication_date:desc', 'createdAt:desc'] }),
    events: () => all<Evenement>('evenements', { populate: { image: true, ...BLOCKS }, sort: ['start_date:asc'] }),
    documents: () =>
      all<OfficialDocument>('official-documents', { populate: ['file', 'additional_files'], sort: ['document_date:desc'] }),
    team: () => all<TeamMember>('team-members', { populate: ['photo'] }),
    associations: () =>
      all<Association>('associations', { populate: ['logo'], filters: { status: { $eq: 'published' } }, sort: ['name:asc'] }),
    alerts: () => all<Alerte>('alertes', { filters: { active: { $eq: true } }, sort: ['createdAt:desc'] }),
    waste: () => all<WasteSchedule>('waste-schedules', { filters: { active: { $eq: true } } }),
    canteen: () => all<SchoolMenu>('school-menus', { populate: ['meals', 'menu_image', 'menu_pdf'], sort: ['week_start:asc'] }),
  };
}

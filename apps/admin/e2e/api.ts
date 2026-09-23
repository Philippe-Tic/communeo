/**
 * API Strapi simulée pour les tests de l'admin : une commune, une session, l'état de mise en ligne.
 */
import type { Page } from '@playwright/test';

export const SITE = {
  documentId: 'site-saint-aubin',
  name: 'Saint-Aubin-sur-Loire',
  slug: 'saint-aubin-sur-loire',
  theme: 'institutionnel',
  live_url: 'https://saint-aubin-sur-loire.fr',
};

export const USERS = {
  admin: { id: 1, documentId: 'u-sophie', email: 'sophie.leroy@saint-aubin.fr', first_name: 'Sophie', last_name: 'Leroy', municipality_role: 'admin', site: SITE },
  editor: { id: 2, documentId: 'u-marc', email: 'marc@saint-aubin.fr', first_name: 'Marc', last_name: 'Dubois', municipality_role: 'editor', site: SITE },
  super_admin: { id: 3, documentId: 'u-equipe', email: 'equipe@communeo.fr', first_name: 'Léa', last_name: 'Communeo', municipality_role: 'super_admin', site: null },
};

export const SITES = [SITE, { documentId: 'site-bellefontaine', name: 'Bellefontaine', slug: 'bellefontaine', theme: 'moderne', live_url: null }];

/** Liens reçus par e-mail (GET /api/user-management/invitation?jeton=) */
export const LINKS: Record<string, object> = {
  'jeton-invitation': { status: 'valid', purpose: 'invitation', firstName: 'Anne', siteName: 'Saint-Aubin-sur-Loire', role: 'editor', email: 'anne@saint-aubin.fr' },
  'jeton-reinitialisation': { status: 'valid', purpose: 'reset', firstName: 'Sophie', siteName: 'Saint-Aubin-sur-Loire', role: 'admin', email: 'sophie.leroy@saint-aubin.fr' },
  'jeton-expire': { status: 'expired', purpose: 'invitation', firstName: 'Anne', siteName: 'Saint-Aubin-sur-Loire', role: 'editor' },
};

export const PASSWORD = 'bon-mot-de-passe';
export const INVALID_LOGIN = 'E-mail ou mot de passe incorrect. Vérifiez votre saisie ; après 5 essais, le compte est bloqué 15 minutes.';

export interface MockPage {
  documentId: string;
  title: string;
  slug: string;
  lead: string | null;
  meta_description: string | null;
  show_in_menu: boolean;
  scheduled_at: string | null;
  publishedAt: string | null;
  updatedAt: string;
  blocks: unknown[];
}

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

export const PAGES: Record<string, MockPage> = {
  'p-salle': {
    documentId: 'p-salle',
    title: 'Location de la salle des fêtes',
    slug: 'location-salle-des-fetes',
    lead: 'La salle accueille jusqu’à 180 personnes.',
    meta_description: null,
    show_in_menu: true,
    scheduled_at: null,
    publishedAt: null,
    updatedAt: '2026-09-20T10:00:00.000Z',
    blocks: [
      { __component: 'blocks.text', id: 3, body: doc('Réservation en mairie.') },
      { __component: 'blocks.buttons', id: 4, buttons: [{ id: 9, label: 'Réserver', url: '/contact', style: 'primary' }] },
    ],
  },
};

const TITLES = [
  'La mairie et ses horaires', 'État civil : naissance, mariage, décès', "Carte nationale d'identité et passeport", 'Urbanisme : permis de construire',
  'Inscriptions scolaires 2026-2027', 'Cantine et accueil périscolaire', 'Médiathèque municipale', 'Conseil municipal : les élus', 'Budget de la commune',
  "Plan local d'urbanisme", 'Collecte des déchets', 'Déchetterie intercommunale', 'Associations sportives', 'Marché du samedi', 'Histoire et patrimoine',
  'Chemins de randonnée', 'Transport à la demande', 'Aide aux personnes âgées', 'Recensement citoyen', 'Jardins familiaux', 'Accueil des nouveaux habitants',
  'Salle omnisports', 'Bibliothèque de rue', 'Cimetière communal',
];

/** 25 pages : « Location de la salle des fêtes » et 24 autres, publiées sauf une sur quatre (brouillons), une programmée */
function manyPages(): Record<string, MockPage> {
  const pages: Record<string, MockPage> = { 'p-salle': structuredClone(PAGES['p-salle']!) };
  TITLES.forEach((title, index) => {
    const documentId = `p-${index + 1}`;
    pages[documentId] = {
      documentId,
      title,
      slug: title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      lead: null,
      meta_description: null,
      show_in_menu: index % 3 === 0,
      scheduled_at: title.startsWith('Inscriptions') ? '2026-11-03T07:00:00.000Z' : null,
      publishedAt: null,
      // Du plus récent (p-1) au plus ancien
      updatedAt: new Date(Date.UTC(2026, 8, 20, 12) - index * 3_600_000).toISOString(),
      blocks: [],
    };
  });
  return pages;
}

const isDraftOnly = (documentId: string) => /^p-(\d+)$/.test(documentId) && Number(documentId.slice(2)) % 4 === 0;

export interface MockOptions {
  user?: keyof typeof USERS;
  publication?: 'pending' | 'ok' | 'running' | 'failed';
  unread?: number;
  loggedIn?: boolean;
  /** Réponse d'erreur à l'enregistrement des pages */
  failPageSaves?: boolean;
  /** Serveur de preview non configuré (503 sur le jeton) */
  previewUnavailable?: boolean;
  /** Pages de la commune : une (défaut), 25, ou aucune */
  pageSet?: 'one' | 'many' | 'none';
  /** Pages dont la publication échoue (champs incomplets) */
  failPublishFor?: string[];
}

export async function mockApi(page: Page, options: MockOptions = {}) {
  const { user = 'admin', publication = 'pending', unread = 3, loggedIn = true, failPageSaves = false, previewUnavailable = false, pageSet = 'one', failPublishFor = [] } = options;
  const calls: string[] = [];
  const bodies: Array<{ call: string; body: { data: Record<string, unknown> } }> = [];
  const posts: Record<string, unknown[]> = {};
  let state = publication;
  const pages: Record<string, MockPage> = pageSet === 'many' ? manyPages() : pageSet === 'none' ? {} : structuredClone(PAGES);
  const published = new Set<string>(Object.keys(pages).filter((id) => !isDraftOnly(id) && !pages[id]!.scheduled_at));
  // Pages en ligne modifiées depuis leur publication
  const modified = new Set<string>();

  // Session côté « serveur » (cookie HttpOnly en vrai) : l'admin ne voit jamais de jeton
  let session = loggedIn;
  // Mots de passe acceptés : celui des comptes de test, et ceux choisis par invitation
  const passwords = new Set([PASSWORD]);

  // Serveur de preview simulé : la page demandée, avec le numéro de version reçu
  await page.route('http://preview.test/**', (route) => {
    const url = new URL(route.request().url());
    const html = `<!doctype html><html lang="fr"><head><title>Aperçu</title></head><body><main><h1>Aperçu de ${url.pathname}</h1><p id="version">version ${url.searchParams.get('v')}</p></main></body></html>`;
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const status = url.searchParams.get('status');
    calls.push(`${method} ${url.pathname}${method !== 'GET' && status ? `?status=${status}` : ''}`);
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    // Comme Strapi : toute écriture de l'admin porte l'en-tête de sécurité
    if (method !== 'GET' && route.request().headers()['x-communeo-csrf'] !== '1') {
      return json({ error: { status: 403, message: 'Requête refusée : en-tête de sécurité manquant' } }, 403);
    }
    if (method === 'POST') (posts[url.pathname] ??= []).push(route.request().postDataJSON());
    if (url.pathname === '/api/session/login') {
      const body = route.request().postDataJSON() as { identifier: string; password: string; remember?: boolean };
      if (!passwords.has(body.password)) return json({ error: { status: 400, message: INVALID_LOGIN } }, 400);
      session = true;
      return json({ ok: true, expiresIn: body.remember ? 2_592_000 : 43200 });
    }
    if (url.pathname === '/api/session/logout') {
      session = false;
      return route.fulfill({ status: 204 });
    }
    // Écrans d'accès, sans session
    if (url.pathname === '/api/user-management/invitation') return json(LINKS[url.searchParams.get('jeton') ?? ''] ?? { status: 'invalid' });
    if (url.pathname === '/api/user-management/accept-invitation') {
      const body = route.request().postDataJSON() as { password: string };
      if (body.password.length < 10) return json({ error: { status: 400, message: 'Le mot de passe doit contenir au moins 10 caractères' } }, 400);
      passwords.add(body.password);
      return json({ ok: true });
    }
    if (url.pathname === '/api/user-management/request-invitation' || url.pathname === '/api/user-management/forgot-password') return json({ ok: true });

    if (!session) return json({ error: { status: 403, message: 'Forbidden' } }, 403);
    if (url.pathname === '/api/users/me') return json(USERS[user]);
    if (url.pathname === '/api/user-management/admins') return json({ data: [{ name: 'Sophie Leroy' }, { name: 'Claire Martin' }] });
    if (url.pathname === '/api/site-management' && USERS[user].municipality_role === 'super_admin') return json({ data: SITES });
    const siteMatch = /^\/api\/site-management\/([^/]+)$/.exec(url.pathname);
    if (siteMatch && USERS[user].municipality_role === 'super_admin') {
      const site = SITES.find((candidate) => candidate.documentId === siteMatch[1]);
      return site ? json({ data: site }) : json({ error: { status: 404, message: 'Site not found' } }, 404);
    }
    if (url.pathname === '/api/deployment/state') {
      return json({ state, pendingCount: state === 'pending' ? 3 : 0, step: state === 'running' ? 'rendering' : null, reference: null });
    }
    if (url.pathname === '/api/deployment/trigger' && method === 'POST') {
      state = 'running';
      return json({ status: 'queued', queued: true }, 202);
    }
    const pageMatch = /^\/api\/pages(?:\/([^/]+))?$/.exec(url.pathname);
    if (pageMatch) {
      const id = pageMatch[1];
      if (method === 'GET' && !id) return json(listPages(pages, url.searchParams));
      if (method === 'GET' && id) {
        const page = pages[id];
        if (!page || (status === 'published' && !published.has(id))) return json({ data: null, error: { status: 404, message: 'Not Found' } }, 404);
        return json({ data: status === 'published' ? { ...page, publishedAt: '2026-09-21T08:00:00.000Z' } : page });
      }
      if (method === 'POST' || method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Partial<MockPage> };
        bodies.push({ call: `${method} ${status ?? 'draft'}`, body });
        if (failPageSaves) return json({ error: { status: 500, message: 'Erreur du serveur' } }, 500);
        if (status === 'published' && id && failPublishFor.includes(id)) return json({ error: { status: 400, message: 'Le bloc 1 (Texte) est vide.' } }, 400);
        const documentId = id ?? 'p-nouvelle';
        const slug = body.data.slug || String(body.data.title ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const page: MockPage = { ...(pages[documentId] ?? PAGES['p-salle']!), ...body.data, documentId, slug, updatedAt: new Date().toISOString() } as MockPage;
        pages[documentId] = page;
        if (status === 'published') {
          published.add(documentId);
          modified.delete(documentId);
        } else if (published.has(documentId)) modified.add(documentId);
        return json({ data: page }, method === 'POST' ? 201 : 200);
      }
      if (method === 'DELETE' && id) {
        delete pages[id];
        return route.fulfill({ status: 204 });
      }
    }
    if (url.pathname === '/api/publication/pages') {
      return json({
        data: Object.fromEntries(
          Object.values(pages).map((page) => [
            page.documentId,
            { state: published.has(page.documentId) ? (modified.has(page.documentId) ? 'modified' : 'published') : 'draft', scheduledAt: page.scheduled_at },
          ]),
        ),
      });
    }
    const unpublish = /^\/api\/publication\/pages\/([^/]+)\/unpublish$/.exec(url.pathname);
    if (unpublish && method === 'POST') {
      published.delete(unpublish[1]!);
      modified.delete(unpublish[1]!);
      return json({ data: { documentId: unpublish[1], state: 'draft' } });
    }
    if (url.pathname === '/api/preview/token' && method === 'POST') {
      if (previewUnavailable) return json({ error: { status: 503, message: "Preview indisponible : PREVIEW_SECRET n'est pas défini" } }, 503);
      const body = route.request().postDataJSON() as { documentId?: string };
      const slug = (body.documentId && pages[body.documentId]?.slug) ?? '';
      return json({ url: `http://preview.test/${slug}?token=jeton-signe`, expiresAt: new Date(Date.now() + 1_800_000).toISOString() });
    }
    if (url.pathname === '/api/contact-submissions') {
      return json({ data: [], meta: { pagination: { total: unread, page: 1, pageSize: 1, pageCount: unread } } });
    }
    return json({ error: { status: 404, message: 'Not Found' } }, 404);
  });

  return {
    published,
    calls,
    bodies,
    pages,
    /** Corps des POST reçus, par route */
    posts,
    /** La session expire côté serveur (le cookie n'est plus valable) */
    expireSession: () => {
      session = false;
    },
  };
}

/** Liste façon Strapi : recherche, filtres de statut par identifiants, tri, pagination */
function listPages(pages: Record<string, MockPage>, params: URLSearchParams) {
  const all = (prefix: string) => [...params.entries()].filter(([key]) => key.startsWith(prefix)).map(([, value]) => value);
  const q = params.get('filters[title][$containsi]')?.toLowerCase();
  const inIds = all('filters[documentId][$in]');
  const notIn = all('filters[documentId][$notIn]');
  let rows = Object.values(pages).filter((page) => {
    if (q && !page.title.toLowerCase().includes(q)) return false;
    if (params.has('filters[documentId][$in][0]') && !inIds.includes(page.documentId)) return false;
    if (notIn.includes(page.documentId)) return false;
    if (params.has('filters[scheduled_at][$notNull]') && !page.scheduled_at) return false;
    if (params.has('filters[scheduled_at][$null]') && page.scheduled_at) return false;
    return true;
  });
  const [field, order] = (params.get('sort[0]') ?? 'updatedAt:desc').split(':') as [keyof MockPage, string];
  rows = rows.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? ''), 'fr') * (order === 'desc' ? -1 : 1));
  const page = Number(params.get('pagination[page]') ?? 1);
  const pageSize = Number(params.get('pagination[pageSize]') ?? 25);
  const data = rows.slice((page - 1) * pageSize, page * pageSize).map(({ blocks: _blocks, ...row }) => ({ ...row, featured_image: null }));
  return { data, meta: { pagination: { page, pageSize, total: rows.length, pageCount: Math.ceil(rows.length / pageSize) } } };
}

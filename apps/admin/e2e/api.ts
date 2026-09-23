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
};

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

export interface MockOptions {
  user?: keyof typeof USERS;
  publication?: 'pending' | 'ok' | 'running' | 'failed';
  unread?: number;
  loggedIn?: boolean;
  /** Réponse d'erreur à l'enregistrement des pages */
  failPageSaves?: boolean;
}

export async function mockApi(page: Page, options: MockOptions = {}) {
  const { user = 'admin', publication = 'pending', unread = 3, loggedIn = true, failPageSaves = false } = options;
  const calls: string[] = [];
  const bodies: Array<{ call: string; body: { data: Record<string, unknown> } }> = [];
  let state = publication;
  const pages = structuredClone(PAGES);
  const published = new Set<string>(['p-salle']);

  if (loggedIn) await page.addInitScript(() => localStorage.setItem('communeo.jwt', 'jeton-de-test'));

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const status = url.searchParams.get('status');
    calls.push(`${method} ${url.pathname}${method !== 'GET' && status ? `?status=${status}` : ''}`);
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/users/me') {
      const auth = route.request().headers().authorization;
      return auth ? json(USERS[user]) : json({ error: { status: 401, message: 'Missing or invalid credentials' } }, 401);
    }
    if (url.pathname === '/api/auth/local') {
      const body = route.request().postDataJSON() as { identifier: string; password: string };
      return body.password === 'bon-mot-de-passe'
        ? json({ jwt: 'jeton-de-test', user: USERS[user] })
        : json({ error: { status: 400, message: 'Invalid identifier or password' } }, 400);
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
      if (method === 'GET' && id) {
        const page = pages[id];
        if (!page || (status === 'published' && !published.has(id))) return json({ data: null, error: { status: 404, message: 'Not Found' } }, 404);
        return json({ data: status === 'published' ? { ...page, publishedAt: '2026-09-21T08:00:00.000Z' } : page });
      }
      if (method === 'POST' || method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Partial<MockPage> };
        bodies.push({ call: `${method} ${status ?? 'draft'}`, body });
        if (failPageSaves) return json({ error: { status: 500, message: 'Erreur du serveur' } }, 500);
        const documentId = id ?? 'p-nouvelle';
        const slug = body.data.slug || String(body.data.title ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const page: MockPage = { ...(pages[documentId] ?? PAGES['p-salle']!), ...body.data, documentId, slug, updatedAt: new Date().toISOString() } as MockPage;
        pages[documentId] = page;
        if (status === 'published') published.add(documentId);
        return json({ data: page }, method === 'POST' ? 201 : 200);
      }
      if (method === 'DELETE' && id) {
        delete pages[id];
        return route.fulfill({ status: 204 });
      }
    }
    if (url.pathname === '/api/contact-submissions') {
      return json({ data: [], meta: { pagination: { total: unread, page: 1, pageSize: 1, pageCount: unread } } });
    }
    return json({ error: { status: 404, message: 'Not Found' } }, 404);
  });

  return { calls, bodies, pages };
}

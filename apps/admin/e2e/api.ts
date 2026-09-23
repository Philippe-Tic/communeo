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

export interface MockOptions {
  user?: keyof typeof USERS;
  publication?: 'pending' | 'ok' | 'running' | 'failed';
  unread?: number;
  loggedIn?: boolean;
}

export async function mockApi(page: Page, options: MockOptions = {}) {
  const { user = 'admin', publication = 'pending', unread = 3, loggedIn = true } = options;
  const calls: string[] = [];
  let state = publication;

  if (loggedIn) await page.addInitScript(() => localStorage.setItem('communeo.jwt', 'jeton-de-test'));

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    calls.push(`${method} ${url.pathname}`);
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
    if (url.pathname === '/api/contact-submissions') {
      return json({ data: [], meta: { pagination: { total: unread, page: 1, pageSize: 1, pageCount: unread } } });
    }
    return json({ error: { status: 404, message: 'Not Found' } }, 404);
  });

  return { calls };
}

/**
 * Preview (mode serveur) : chaque requête est rendue pour une commune et un thème, avec ses brouillons.
 * La réponse est entièrement rendue dans le contexte de la requête (pas de streaming) : aucun
 * composant ne peut lire le thème ou la commune d'une autre requête. Jamais indexée ni mise en cache.
 * En build statique, le middleware ne fait rien.
 */
import { defineMiddleware } from 'astro:middleware';
import { getSource } from './lib/content';
import { resolvePreview } from './lib/preview';
import { withRequestContext, type RequestContext } from './lib/request-context';

const PREVIEW_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

export const onRequest = defineMiddleware(async ({ request }, next) => {
  if (process.env.RENDER_MODE !== 'server') return next();

  const decision = await resolvePreview(request);
  if (decision.kind === 'deny') {
    return new Response('Preview non autorisée : ouvrez-la depuis l’administration de votre commune.', {
      status: 401,
      headers: { ...PREVIEW_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  if (decision.kind === 'redirect') {
    const headers = new Headers({ ...PREVIEW_HEADERS, Location: decision.location });
    for (const value of decision.cookies) headers.append('Set-Cookie', value);
    return new Response(null, { status: 302, headers });
  }

  const { access } = decision;
  const context: RequestContext = { siteDocumentId: access.siteDocumentId, theme: access.theme };
  return withRequestContext(context, async () => {
    // Thème demandé, sinon celui forcé pour le serveur (tests de parité), sinon celui de la commune
    context.theme ??= process.env.THEME || (await getSource().site()).theme;
    const response = await next();
    const body = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(PREVIEW_HEADERS)) headers.set(name, value);
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  });
});

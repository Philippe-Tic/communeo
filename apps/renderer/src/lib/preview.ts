/**
 * Preview : quelle commune (et quel thème) une requête a le droit de voir.
 *
 * Le lien ouvert depuis l'admin porte un jeton signé par Strapi (`?token=`). Le serveur le vérifie,
 * le range dans un cookie HttpOnly et redirige vers la même page sans le jeton (il ne reste ni dans
 * l'historique, ni dans les liens partagés, ni dans les journaux). `?theme=<id>` choisit un autre
 * thème pour la suite de la visite (`?theme=` vide : revenir au thème de la commune).
 * Sans jeton valide : 401. La commune de démonstration (fixtures) n'a pas besoin de jeton.
 */
import { THEME_IDS, verifyPreviewToken } from '@communeo/core';

export const TOKEN_COOKIE = 'communeo_preview';
export const THEME_COOKIE = 'communeo_preview_theme';

export interface PreviewAccess {
  siteDocumentId: string;
  theme?: string;
}

export type PreviewDecision =
  | { kind: 'allow'; access: PreviewAccess }
  | { kind: 'redirect'; location: string; cookies: string[] }
  | { kind: 'deny' };

function cookie(name: string, value: string, options: { maxAge: number; secure: boolean }): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(options.maxAge))}`,
    ...(options.secure ? ['Secure'] : []),
  ].join('; ');
}

function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export async function resolvePreview(request: Request, env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): Promise<PreviewDecision> {
  const url = new URL(request.url);
  const secure = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  const queryToken = url.searchParams.get('token');
  const queryTheme = url.searchParams.get('theme');
  const demo = env.DATA_SOURCE !== 'strapi';

  // Jeton ou thème dans l'adresse : on les range en cookies et on les retire de l'adresse
  if (queryToken !== null || queryTheme !== null) {
    const cookies: string[] = [];
    if (queryToken !== null && !demo) {
      const claims = await verifyPreviewToken(queryToken, env.PREVIEW_SECRET ?? '', now);
      if (!claims) return { kind: 'deny' };
      const maxAge = claims.exp - now.getTime() / 1000;
      cookies.push(cookie(TOKEN_COOKIE, queryToken, { maxAge, secure }));
      // Nouveau jeton : le thème choisi auparavant ne s'applique plus
      if (queryTheme === null) cookies.push(cookie(THEME_COOKIE, '', { maxAge: 0, secure }));
    }
    if (queryTheme !== null) {
      if (queryTheme !== '' && !(THEME_IDS as string[]).includes(queryTheme)) return { kind: 'deny' };
      cookies.push(cookie(THEME_COOKIE, queryTheme, { maxAge: queryTheme ? 12 * 3600 : 0, secure }));
    }
    url.searchParams.delete('token');
    url.searchParams.delete('theme');
    return { kind: 'redirect', location: `${url.pathname}${url.search}`, cookies };
  }

  const theme = readCookie(request, THEME_COOKIE) || undefined;
  if (demo) return { kind: 'allow', access: { siteDocumentId: 'demo', theme } };

  const claims = await verifyPreviewToken(readCookie(request, TOKEN_COOKIE), env.PREVIEW_SECRET ?? '', now);
  if (!claims) return { kind: 'deny' };
  return { kind: 'allow', access: { siteDocumentId: claims.site, theme: theme ?? claims.theme } };
}

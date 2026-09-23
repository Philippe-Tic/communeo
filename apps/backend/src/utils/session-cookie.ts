/**
 * Session de l'administration dans un cookie HttpOnly (le jeton n'est jamais lisible par un script) :
 * `SameSite=Strict`, `Secure` en HTTPS, limité à `/api`, 12 h.
 */
export const SESSION_COOKIE = 'communeo_session';
export const SESSION_DURATION_SECONDS = 12 * 60 * 60;
/** « Rester connecté sur cet ordinateur » */
export const REMEMBERED_SESSION_SECONDS = 30 * 24 * 60 * 60;
/** En-tête exigé pour toute écriture authentifiée par le cookie (protection CSRF en plus de SameSite) */
export const CSRF_HEADER = 'x-communeo-csrf';

export function sessionCookieOptions(ctx: any, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: !!ctx.secure,
    path: '/api',
    maxAge: maxAgeSeconds * 1000,
    overwrite: true,
  };
}

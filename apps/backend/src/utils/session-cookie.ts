/**
 * Session de l'administration dans un cookie HttpOnly (le jeton n'est jamais lisible par un script) :
 * `SameSite=Strict`, `Secure` en HTTPS, limité à `/api`.
 * Durée (#188) : fin après 8 h d'inactivité — le jeton dure 8 h et il est renouvelé au fil de
 * l'utilisation (voir le middleware session-cookie) ; « Rester connecté sur cet ordinateur » :
 * 30 jours, sans renouvellement.
 */
export const SESSION_COOKIE = 'communeo_session';
export const SESSION_IDLE_SECONDS = 8 * 60 * 60;
/** « Rester connecté sur cet ordinateur » */
export const REMEMBERED_SESSION_SECONDS = 30 * 24 * 60 * 60;
/** Renouvellement d'une session ordinaire : au plus une fois par tranche de 5 minutes d'activité */
export const SESSION_RENEW_AFTER_SECONDS = 5 * 60;
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

/** Pose la session d'un utilisateur ; renvoie sa durée en secondes */
export function issueSession(ctx: any, userId: number, remember: boolean): number {
  const duration = remember ? REMEMBERED_SESSION_SECONDS : SESSION_IDLE_SECONDS;
  const jwt = strapi
    .plugin('users-permissions')
    .service('jwt')
    .issue({ id: userId, ...(remember ? { remember: true } : {}) }, { expiresIn: `${duration}s` });
  ctx.cookies.set(SESSION_COOKIE, jwt, sessionCookieOptions(ctx, duration));
  return duration;
}

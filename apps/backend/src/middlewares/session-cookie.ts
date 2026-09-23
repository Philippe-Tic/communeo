/**
 * Authentification par le cookie de session de l'administration : le jeton du cookie devient
 * l'en-tête Authorization habituel, avant l'isolation par commune et les permissions (inchangées).
 * Une écriture authentifiée par le cookie exige l'en-tête X-Communeo-Csrf (en plus de SameSite=Strict).
 * Les appels qui fournissent déjà un en-tête Authorization (jetons d'API, build, preview) ne sont pas concernés.
 */
import { CSRF_HEADER, SESSION_COOKIE } from '../utils/session-cookie';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export default () => {
  return async (ctx: any, next: () => Promise<void>) => {
    if (!ctx.path.startsWith('/api/') || ctx.request.header.authorization) return next();
    const token = ctx.cookies.get(SESSION_COOKIE);
    if (!token || ctx.path === '/api/session/login') return next();

    if (!SAFE_METHODS.has(ctx.method) && ctx.request.header[CSRF_HEADER] !== '1') {
      ctx.status = 403;
      ctx.body = { data: null, error: { status: 403, name: 'ForbiddenError', message: 'Requête refusée : en-tête de sécurité manquant' } };
      return;
    }
    ctx.request.header.authorization = `Bearer ${token}`;
    ctx.state.cookieSession = true;
    return next();
  };
};

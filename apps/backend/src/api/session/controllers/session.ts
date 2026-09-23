/**
 * Connexion à l'administration : vérifie les identifiants et pose la session dans un cookie HttpOnly
 * (voir utils/session-cookie.ts et le middleware session-cookie). Le jeton n'est pas renvoyé.
 */
import { createRateLimiter } from '../../../utils/security';
import { CSRF_HEADER, SESSION_COOKIE, SESSION_DURATION_SECONDS, sessionCookieOptions } from '../../../utils/session-cookie';

const isRateLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const INVALID = 'Adresse e-mail ou mot de passe incorrect.';

export default {
  /**
   * POST /api/session/login — { identifier, password }
   */
  async login(ctx) {
    const { identifier, password } = (ctx.request.body ?? {}) as { identifier?: unknown; password?: unknown };
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
      return ctx.badRequest(INVALID);
    }
    const email = identifier.trim().toLowerCase();
    if (isRateLimited(`login:${ctx.request.ip}`) || isRateLimited(`login:${email}`)) {
      return ctx.tooManyRequests('Trop de tentatives de connexion. Réessayez dans quelques minutes.');
    }

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { $or: [{ email }, { username: identifier.trim() }] },
    });
    const userService = strapi.plugin('users-permissions').service('user');
    const valid = !!user?.password && (await userService.validatePassword(password, user.password));
    // Même réponse pour un compte inconnu, un mauvais mot de passe ou un compte non activé
    if (!valid || user.blocked || user.confirmed === false) return ctx.badRequest(INVALID);

    const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id }, { expiresIn: `${SESSION_DURATION_SECONDS}s` });
    ctx.cookies.set(SESSION_COOKIE, jwt, sessionCookieOptions(ctx, SESSION_DURATION_SECONDS));
    ctx.body = { ok: true, expiresIn: SESSION_DURATION_SECONDS };
  },

  /**
   * POST /api/session/logout
   */
  async logout(ctx) {
    // Même exigence que les autres écritures : pas de déconnexion forcée depuis un autre site
    if (ctx.cookies.get(SESSION_COOKIE) && ctx.request.header[CSRF_HEADER] !== '1') {
      return ctx.forbidden('Requête refusée');
    }
    ctx.cookies.set(SESSION_COOKIE, null, { ...sessionCookieOptions(ctx, 0), maxAge: 0 });
    ctx.status = 204;
  },
};

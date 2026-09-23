/**
 * Connexion à l'administration : vérifie les identifiants et pose la session dans un cookie HttpOnly
 * (voir utils/session-cookie.ts et le middleware session-cookie). Le jeton n'est pas renvoyé.
 */
import { createFailureLimiter } from '../../../utils/security';
import { CSRF_HEADER, REMEMBERED_SESSION_SECONDS, SESSION_COOKIE, SESSION_DURATION_SECONDS, sessionCookieOptions } from '../../../utils/session-cookie';

// 5 échecs par compte (message de la maquette 6.19), 20 par adresse IP, sur 15 minutes
const accountFailures = createFailureLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
const ipFailures = createFailureLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
const INVALID = 'E-mail ou mot de passe incorrect. Vérifiez votre saisie ; après 5 essais, le compte est bloqué 15 minutes.';

export default {
  /**
   * POST /api/session/login — { identifier, password }
   */
  async login(ctx) {
    const { identifier, password, remember } = (ctx.request.body ?? {}) as { identifier?: unknown; password?: unknown; remember?: unknown };
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
      return ctx.badRequest(INVALID);
    }
    const email = identifier.trim().toLowerCase();
    if (ipFailures.isLimited(ctx.request.ip) || accountFailures.isLimited(email)) {
      return ctx.tooManyRequests('Trop de tentatives : le compte est bloqué 15 minutes. Réessayez plus tard ou utilisez « Mot de passe oublié ».');
    }

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { $or: [{ email }, { username: identifier.trim() }] },
    });
    const userService = strapi.plugin('users-permissions').service('user');
    const valid = !!user?.password && (await userService.validatePassword(password, user.password));
    // Même réponse pour un compte inconnu, un mauvais mot de passe ou un compte non activé
    if (!valid || user.blocked || user.confirmed === false) {
      ipFailures.fail(ctx.request.ip);
      accountFailures.fail(email);
      return ctx.badRequest(INVALID);
    }
    accountFailures.reset(email);

    // « Rester connecté sur cet ordinateur » : 30 jours, sinon 12 h
    const duration = remember === true ? REMEMBERED_SESSION_SECONDS : SESSION_DURATION_SECONDS;
    const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id }, { expiresIn: `${duration}s` });
    ctx.cookies.set(SESSION_COOKIE, jwt, sessionCookieOptions(ctx, duration));
    ctx.body = { ok: true, expiresIn: duration };
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

/**
 * Connexion à l'administration : vérifie les identifiants et pose la session dans un cookie HttpOnly
 * (voir utils/session-cookie.ts et le middleware session-cookie). Le jeton n'est pas renvoyé.
 */
import { recordLogin } from '../../../services/activity-log';
import { LOGIN_INVALID as INVALID, LOGIN_LOCKED, loginAttempts } from '../../../utils/login-attempts';
import { CSRF_HEADER, issueSession, SESSION_COOKIE, sessionCookieOptions } from '../../../utils/session-cookie';

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
    if (loginAttempts.isLocked(email, ctx.request.ip)) return ctx.tooManyRequests(LOGIN_LOCKED);

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { $or: [{ email }, { username: identifier.trim() }] },
      populate: ['site'],
    });
    const userService = strapi.plugin('users-permissions').service('user');
    const valid = !!user?.password && (await userService.validatePassword(password, user.password));
    // Même réponse pour un compte inconnu, un mauvais mot de passe ou un compte non activé
    if (!valid || user.blocked || user.confirmed === false || user.active === false) {
      loginAttempts.failed(email, ctx.request.ip);
      return ctx.badRequest(INVALID);
    }
    loginAttempts.succeeded(email);
    // Commune suspendue par l'équipe Communeo : le mot de passe est bon, on peut le dire
    if (user.municipality_role !== 'super_admin' && user.site?.suspended) {
      return ctx.forbidden("Cette commune est suspendue : contactez l'équipe Communeo.");
    }

    // « Rester connecté sur cet ordinateur » : 30 jours ; sinon, fin après 8 h d'inactivité
    const duration = issueSession(ctx, user.id, remember === true);
    await recordLogin(user, ctx.request.ip);
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

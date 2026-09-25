/**
 * E-mails à l'équipe Communeo (SIGNUP_NOTIFY_EMAIL) : inscription à vérifier, nouvelle commune en essai,
 * passage en live demandé (#309, #310, #313). Sans adresse, ou en cas d'échec, l'action continue : la
 * file « À valider » de l'espace équipe reste la référence.
 */
import { log } from '../utils/logger';

export const adminUrl = () => process.env.ADMIN_URL || 'http://localhost:5173';

export async function notifyTeam(subject: string, text: string): Promise<void> {
  const to = process.env.SIGNUP_NOTIFY_EMAIL;
  if (!to) {
    log.warn(`[ÉQUIPE] SIGNUP_NOTIFY_EMAIL non défini : « ${subject} » n'est pas envoyé`);
    return;
  }
  try {
    await strapi.plugin('email').service('email').send({ to, subject, text });
  } catch (error) {
    log.error(`[ÉQUIPE] « ${subject} » non envoyé :`, error);
  }
}

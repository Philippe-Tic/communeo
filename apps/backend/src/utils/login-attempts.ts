/**
 * Tentatives de connexion (#188), communes aux deux entrées : la session de l'admin
 * (POST /api/session/login) et la connexion Strapi (POST /api/auth/local, publique) — sans quoi
 * la seconde contournerait le blocage. 5 échecs par compte (maquette 6.19) et 20 par adresse IP,
 * sur 15 minutes ; pendant le blocage, même le bon mot de passe est refusé. Seuls les échecs
 * comptent (une mairie derrière une seule adresse IP peut connecter plusieurs agents) ; une
 * connexion réussie remet le compteur du compte à zéro.
 */
import { createFailureLimiter } from './security';

const WINDOW_MS = 15 * 60 * 1000;
const accountFailures = createFailureLimiter({ windowMs: WINDOW_MS, max: 5 });
const ipFailures = createFailureLimiter({ windowMs: WINDOW_MS, max: 20 });

export const LOGIN_INVALID =
  'E-mail ou mot de passe incorrect. Vérifiez votre saisie ; après 5 essais, le compte est bloqué 15 minutes.';
export const LOGIN_LOCKED =
  'Trop de tentatives : le compte est bloqué 15 minutes. Réessayez plus tard ou utilisez « Mot de passe oublié ».';

const accountKey = (identifier: string) => identifier.trim().toLowerCase();

export const loginAttempts = {
  isLocked: (identifier: string, ip: string) => ipFailures.isLimited(ip) || accountFailures.isLimited(accountKey(identifier)),
  failed: (identifier: string, ip: string) => {
    ipFailures.fail(ip);
    accountFailures.fail(accountKey(identifier));
  },
  succeeded: (identifier: string) => accountFailures.reset(accountKey(identifier)),
};

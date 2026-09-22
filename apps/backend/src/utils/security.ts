/**
 * Helpers de sécurité partagés : jetons d'invitation, échappement HTML, rate limit.
 */

import crypto from 'crypto';

export const INVITATION_EXPIRY_DAYS = 7;
export const MIN_PASSWORD_LENGTH = 10;

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Génère un jeton d'invitation / réinitialisation.
 * - `token` : envoyé par e-mail à l'utilisateur (`<secret>.<expiresAt>`)
 * - `stored` : stocké en base dans resetPasswordToken (`<sha256(secret)>.<expiresAt>`)
 * Le secret n'est jamais stocké en clair, et l'expiration ne dépend plus de updatedAt.
 */
export function createInvitationToken(): { token: string; stored: string } {
  const secret = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return {
    token: `${secret}.${expiresAt}`,
    stored: `${sha256(secret)}.${expiresAt}`,
  };
}

/**
 * Convertit un jeton reçu en valeur stockée pour la recherche en base.
 * Retourne null si le format est invalide ou le jeton expiré.
 */
export function resolveInvitationToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const match = token.match(/^([a-f0-9]{64})\.(\d{13})$/);
  if (!match) return null;
  const expiresAt = Number(match[2]);
  if (Date.now() > expiresAt) return null;
  return `${sha256(match[1])}.${expiresAt}`;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Rate limiter en mémoire (fenêtre glissante), à clé libre (IP, e-mail…).
 * Suffisant pour une instance unique ; à remplacer par Redis/Postgres en multi-instance.
 */
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const recent = timestamps.filter((t) => now - t < windowMs);
      if (recent.length === 0) hits.delete(key);
      else hits.set(key, recent);
    }
  }, 5 * 60 * 1000).unref();

  return (key: string): boolean => {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) return true;
    recent.push(now);
    hits.set(key, recent);
    return false;
  };
}

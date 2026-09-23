/**
 * Jetons de preview : Strapi les délivre aux utilisateurs d'une commune, le serveur de preview les vérifie.
 * Format `<payload>.<signature>` en base64url, signature HMAC-SHA256 avec un secret partagé
 * (PREVIEW_SECRET). Web Crypto : fonctionne dans Node comme dans un navigateur.
 */
import { SECTIONS } from '../site/navigation';

export interface PreviewClaims {
  /** documentId de la commune : la seule que le jeton permet de voir */
  site: string;
  /** Thème à prévisualiser, à défaut celui de la commune */
  theme?: string;
  /** Expiration, en secondes depuis l'époque Unix */
  exp: number;
}

/** Durée de vie d'un jeton de preview */
export const PREVIEW_TOKEN_TTL_SECONDS = 30 * 60;

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string): Uint8Array => {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function signPreviewToken(
  claims: Omit<PreviewClaims, 'exp'>,
  secret: string,
  options: { ttlSeconds?: number; now?: Date } = {},
): Promise<{ token: string; expiresAt: Date }> {
  if (!secret) throw new Error('Secret de preview manquant');
  const now = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const exp = now + (options.ttlSeconds ?? PREVIEW_TOKEN_TTL_SECONDS);
  const payload = toBase64Url(encoder.encode(JSON.stringify({ ...claims, exp })));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload)));
  return { token: `${payload}.${toBase64Url(signature)}`, expiresAt: new Date(exp * 1000) };
}

/** Claims d'un jeton valide (signature correcte, non expiré), sinon `null`. */
export async function verifyPreviewToken(token: string | null | undefined, secret: string, now: Date = new Date()): Promise<PreviewClaims | null> {
  if (!token || !secret) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  try {
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64Url(signature), encoder.encode(payload));
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Partial<PreviewClaims>;
    if (typeof claims.site !== 'string' || !claims.site || typeof claims.exp !== 'number') return null;
    if (claims.exp * 1000 <= now.getTime()) return null;
    if (claims.theme !== undefined && typeof claims.theme !== 'string') return null;
    return { site: claims.site, exp: claims.exp, ...(claims.theme ? { theme: claims.theme } : {}) };
  } catch {
    return null;
  }
}

/** Contenus prévisualisables et page correspondante sur le site */
export const PREVIEW_PATHS = {
  page: (slug: string) => `/${slug}`,
  article: (slug: string) => `${SECTIONS.actualites.path}/${slug}`,
  evenement: (slug: string) => `${SECTIONS.agenda.path}/${slug}`,
  'official-document': (slug: string) => `${SECTIONS.documents.path}/${slug}`,
} as const;

export type PreviewableType = keyof typeof PREVIEW_PATHS;

/**
 * Client de l'API Strapi (même origine : proxy Vite en développement, nginx en production).
 * La session est un cookie HttpOnly posé par Strapi (POST /api/session/login) : l'admin ne voit jamais
 * le jeton. Chaque requête porte l'en-tête X-Communeo-Csrf, exigé par Strapi pour les écritures.
 * La commune incarnée par un super admin est ajoutée à chaque requête.
 */
const IMPERSONATION_KEY = 'communeo.impersonated-site';

// Jeton des premières versions de l'admin, gardé dans le navigateur : on l'efface
safeSet(localStorage, 'communeo.jwt', null);

export const auth = {
  impersonatedSite: () => safeGet(sessionStorage, IMPERSONATION_KEY),
  setImpersonatedSite: (documentId: string | null) => safeSet(sessionStorage, IMPERSONATION_KEY, documentId),
};

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string | null) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    /* stockage indisponible (navigation privée stricte) : la session ne survivra pas au rechargement */
  }
}

/** Pas (ou plus) de session : Strapi répond 401 (jeton invalide) ou 403 (rôle public) */
export const isUnauthenticated = (error: unknown) => error instanceof ApiError && (error.status === 401 || error.status === 403);

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Communeo-Csrf', '1');
  const site = auth.impersonatedSite();
  if (site) headers.set('X-Site-Document-Id', site);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }

  const response = await fetch(path, { ...init, headers, body, credentials: 'same-origin' });
  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (!response.ok) {
    const error = (data as { error?: { message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(response.status, error?.message ?? response.statusText, error?.details);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

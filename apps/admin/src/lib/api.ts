/**
 * Client de l'API Strapi (même origine : proxy Vite en développement, nginx en production).
 * Le jeton de session et la commune incarnée par un super admin sont ajoutés à chaque requête.
 */
const TOKEN_KEY = 'communeo.jwt';
const IMPERSONATION_KEY = 'communeo.impersonated-site';

export const auth = {
  token: () => safeGet(localStorage, TOKEN_KEY),
  setToken: (token: string | null) => safeSet(localStorage, TOKEN_KEY, token),
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
  const token = auth.token();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const site = auth.impersonatedSite();
  if (site) headers.set('X-Site-Document-Id', site);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }

  const response = await fetch(path, { ...init, headers, body });
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

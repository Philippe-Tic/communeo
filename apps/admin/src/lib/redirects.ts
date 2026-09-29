/**
 * Redirections depuis l'ancien site de la commune (#335) : ancienne adresse → page du site, en 301,
 * publiées avec le site. La proposition automatique rapproche chaque ancienne adresse d'une page.
 */
import { queryOptions } from '@tanstack/react-query';
import type { RedirectRule, RedirectDestination, RedirectSuggestion } from '@communeo/core';
import { api } from './api';

export const redirectsQuery = queryOptions({
  queryKey: ['redirections'],
  queryFn: () => api<{ data: { redirects: RedirectRule[]; destinations: RedirectDestination[] } }>('/api/redirects').then((response) => response.data),
});

export const saveRedirects = (redirects: RedirectRule[]) =>
  api<{ data: { redirects: RedirectRule[] } }>('/api/redirects', { method: 'PUT', json: { redirects } }).then((response) => response.data.redirects);

export const suggestRedirects = (input: { addresses: string; sitemapUrl: string }) =>
  api<{ data: { suggestions: RedirectSuggestion[]; truncated: boolean } }>('/api/redirects/suggest', { method: 'POST', json: input }).then(
    (response) => response.data,
  );

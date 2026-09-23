/**
 * Abonnés à la newsletter de la commune (handoff 6.15) : chiffres, liste paginée, désabonnement
 * (jamais de suppression : la trace reste, RGPD) et export CSV préparé par Strapi.
 */
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { api } from './api';

export interface Subscriber {
  documentId: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscribed_at: string | null;
  active: boolean;
  unsubscribed_at: string | null;
}

export interface NewsletterStats {
  total: number;
  active: number;
  thisMonth: number;
}

export type SubscriberState = 'actifs' | 'desabonnes';

export interface SubscriberParams {
  q: string;
  etat?: SubscriberState;
  page: number;
}

export const SUBSCRIBERS_PAGE_SIZE = 20;

export const newsletterStatsQuery = queryOptions({
  queryKey: ['newsletter-subscribers', 'stats'],
  queryFn: async () => (await api<{ data: NewsletterStats }>('/api/newsletter-subscribers/stats')).data,
});

export function subscribersUrl({ q, etat, page }: SubscriberParams): string {
  const search = new URLSearchParams();
  ['documentId', 'email', 'first_name', 'last_name', 'subscribed_at', 'active', 'unsubscribed_at'].forEach((field, index) => search.set(`fields[${index}]`, field));
  search.set('sort[0]', 'subscribed_at:desc');
  search.set('sort[1]', 'email:asc');
  search.set('pagination[page]', String(page));
  search.set('pagination[pageSize]', String(SUBSCRIBERS_PAGE_SIZE));
  const text = q.trim();
  if (text) ['email', 'first_name', 'last_name'].forEach((field, index) => search.set(`filters[$or][${index}][${field}][$containsi]`, text));
  if (etat) search.set('filters[active][$eq]', etat === 'actifs' ? 'true' : 'false');
  return `/api/newsletter-subscribers?${search}`;
}

export const subscribersQuery = (params: SubscriberParams) =>
  queryOptions({
    queryKey: ['newsletter-subscribers', 'list', params],
    queryFn: async () => {
      const response = await api<{ data: Subscriber[]; meta: { pagination: { total: number; pageCount: number } } }>(subscribersUrl(params));
      return { rows: response.data, total: response.meta.pagination.total, pageCount: Math.max(1, response.meta.pagination.pageCount) };
    },
    placeholderData: keepPreviousData,
  });

export const subscriberName = (subscriber: Subscriber) => [subscriber.first_name, subscriber.last_name].filter(Boolean).join(' ');

export async function unsubscribe(documentId: string): Promise<Subscriber> {
  return (await api<{ data: Subscriber }>(`/api/newsletter-subscribers/${documentId}/unsubscribe`, { method: 'POST' })).data;
}

/** Télécharge le CSV : `Response.text()` retire le BOM, remis pour qu'Excel lise l'UTF-8 */
export async function downloadSubscribersCsv(now: Date = new Date()): Promise<void> {
  const csv = await api<string>('/api/newsletter-subscribers/export');
  const blob = new Blob(['\uFEFF', String(csv).replace(/^\uFEFF/, '')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `abonnes-newsletter-${now.toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Référencement au passage sur le domaine (#336) : Annuaire, fiche Google, Wikipédia */
import { queryOptions } from '@tanstack/react-query';
import type { SeoChecklistId, SeoChecklistItem } from '@communeo/core';
import { api } from './api';

export type SeoChecklist = { siteUrl: string; items: SeoChecklistItem[] } | null;

export const seoChecklistQuery = (refresh = false) =>
  queryOptions({
    queryKey: ['referencement', refresh],
    queryFn: () => api<{ data: SeoChecklist }>(`/api/seo/checklist${refresh ? '?refresh=1' : ''}`).then((response) => response.data),
    staleTime: 5 * 60_000,
  });

export const declareSeoStep = (id: SeoChecklistId, done: boolean) =>
  api<{ data: SeoChecklist }>(`/api/seo/checklist/${id}`, { method: 'PUT', json: { done } }).then((response) => response.data);

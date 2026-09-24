/**
 * Modèles de pages (#153) : cinq pages de démarrage créées en brouillon (assistant de création,
 * liste des pages). GET /api/page-templates, POST /api/page-templates.
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface PageTemplateSummary {
  id: string;
  title: string;
  summary: string;
  suggested: boolean;
  /** Page déjà créée depuis ce modèle */
  page: { documentId: string; title: string } | null;
}

export const pageTemplatesQuery = queryOptions({
  queryKey: ['modeles-de-pages'],
  queryFn: () => api<{ data: PageTemplateSummary[] }>('/api/page-templates').then((response) => response.data),
  staleTime: 0,
});

export async function createFromTemplates(client: QueryClient, templates: string[], { menu }: { menu: boolean }) {
  const response = await api<{
    data: Array<{ documentId: string; title: string; template: string }>;
    meta: { notInMenu: string[] };
  }>('/api/page-templates', { method: 'POST', json: { templates, menu } });
  void client.invalidateQueries({ queryKey: ['modeles-de-pages'] });
  void client.invalidateQueries({ queryKey: ['list', 'pages'] });
  void client.invalidateQueries({ queryKey: ['publication-states', 'pages'] });
  if (menu) void client.invalidateQueries({ queryKey: ['site-settings'] });
  return response;
}

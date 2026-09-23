/**
 * Alertes et perturbations (handoff 6.13) : en ligne immédiatement, sans mise en ligne du site (le
 * bandeau est rechargé par les pages depuis /api/alertes/public). Une alerte est visible quand elle
 * est active et que maintenant est entre son début et sa fin ; « Terminer maintenant » la retire.
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { isAlertVisible } from '@communeo/core';
import { api } from './api';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  documentId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  active: boolean;
  display_from: string | null;
  display_until: string | null;
  link_url: string | null;
  link_label: string | null;
  alert_type: string | null;
  affected_area: string | null;
  start_date: string | null;
  end_date: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AlertData = Pick<
  Alert,
  'title' | 'message' | 'severity' | 'alert_type' | 'affected_area' | 'link_url' | 'link_label'
> & {
  display_from: string;
  display_until: string;
};

export type AlertState = 'active' | 'scheduled' | 'past';

export function alertState(alert: Alert, now: Date = new Date()): AlertState {
  if (
    isAlertVisible({ active: alert.active, display_from: alert.display_from, display_until: alert.display_until }, now)
  )
    return 'active';
  if (alert.active && alert.display_from && new Date(alert.display_from) > now) return 'scheduled';
  return 'past';
}

export const alertsQuery = queryOptions({
  queryKey: ['alerts'],
  queryFn: async () => {
    const alerts: Alert[] = [];
    for (let page = 1; ; page += 1) {
      const response = await api<{ data: Alert[]; meta: { pagination: { pageCount: number } } }>(
        `/api/alertes?sort[0]=display_from:desc&sort[1]=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=100`,
      );
      alerts.push(...response.data);
      if (page >= response.meta.pagination.pageCount) return alerts;
    }
  },
  // Une alerte finit à son heure : l'écran suit sans recharger
  refetchInterval: 60_000,
});

export const alertQuery = (documentId: string) =>
  queryOptions({
    queryKey: ['alerts', documentId],
    queryFn: async () => (await api<{ data: Alert }>(`/api/alertes/${documentId}`)).data,
  });

/** Jour à Paris (AAAA-MM-JJ) d'un instant : dates de la période affichée sur la page Perturbations */
const parisDay = (iso: string) =>
  new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));

const withPeriod = (data: Partial<AlertData>) => ({
  ...data,
  ...(data.display_from ? { start_date: parisDay(data.display_from) } : {}),
  ...(data.display_until ? { end_date: parisDay(data.display_until) } : {}),
});

export async function saveAlert(documentId: string | null, data: AlertData): Promise<Alert> {
  const body = { data: { ...withPeriod(data), active: true } };
  const response = documentId
    ? await api<{ data: Alert }>(`/api/alertes/${documentId}`, { method: 'PUT', json: body })
    : await api<{ data: Alert }>('/api/alertes', { method: 'POST', json: body });
  return response.data;
}

/** Prolonger : nouvelle fin */
export async function extendAlert(documentId: string, until: Date): Promise<Alert> {
  return (
    await api<{ data: Alert }>(`/api/alertes/${documentId}`, {
      method: 'PUT',
      json: { data: withPeriod({ display_until: until.toISOString() }) },
    })
  ).data;
}

/** Terminer maintenant : fin à l'instant, retirée du site au prochain rechargement du bandeau */
export async function endAlert(documentId: string, now: Date = new Date()): Promise<Alert> {
  return (
    await api<{ data: Alert }>(`/api/alertes/${documentId}`, {
      method: 'PUT',
      json: { data: { ...withPeriod({ display_until: now.toISOString() }), active: false } },
    })
  ).data;
}

export const deleteAlert = (documentId: string) => api(`/api/alertes/${documentId}`, { method: 'DELETE' });

export const refreshAlerts = (client: QueryClient) => client.invalidateQueries({ queryKey: ['alerts'] });

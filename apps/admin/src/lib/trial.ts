/**
 * Période d'essai (#310) : 30 jours après l'inscription en libre-service. Une fois l'essai terminé,
 * le site est retiré et l'administration est en lecture seule (le serveur refuse les écritures) ;
 * les données sont conservées 6 mois. « Passer en live » prévient l'équipe Communeo, qui passe la
 * commune en live (le devis en ligne viendra avec #312).
 */
import { deletionDate, trialDaysLeft } from '@communeo/core';
import { api } from './api';
import type { SessionSite } from './session';

export type TrialState =
  | { kind: 'trial'; daysLeft: number; endsAt: Date; requestedAt: Date | null }
  | { kind: 'expired'; deletionAt: Date | null; requestedAt: Date | null }
  | null;

export function trialState(site: SessionSite | null | undefined, now: Date = new Date()): TrialState {
  const requestedAt = site?.live_requested_at ? new Date(site.live_requested_at) : null;
  if (site?.plan === 'expired') {
    return { kind: 'expired', deletionAt: site.trial_expired_at ? deletionDate(site.trial_expired_at) : null, requestedAt };
  }
  if (site?.plan === 'trial' && site.trial_ends_at) {
    return { kind: 'trial', daysLeft: trialDaysLeft(site.trial_ends_at, now), endsAt: new Date(site.trial_ends_at), requestedAt };
  }
  return null;
}

export const isReadOnly = (site: SessionSite | null | undefined) => site?.plan === 'expired';

/** « 25 octobre 2026 » (heure de Paris) */
export const formatDay = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(date);

export const daysLeftLabel = (days: number) => (days <= 1 ? 'dernier jour' : `${days} jours restants`);

export const requestGoLive = () => api<{ data: { liveRequestedAt: string } }>('/api/trial/live-request', { method: 'POST' });

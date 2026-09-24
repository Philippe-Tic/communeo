/**
 * Domaine personnalisé (administrateurs) : enregistrement, instructions DNS de l'hébergeur,
 * vérification manuelle (la propagation DNS peut prendre des heures), retrait.
 */
import { queryOptions } from '@tanstack/react-query';
import { api } from './api';

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME';
  /** Nom complet (www.mairie.fr) */
  name: string;
  /** Nom à saisir chez le fournisseur DNS (`@` pour le domaine lui-même) */
  displayName: string;
  value: string;
  purpose: string;
  description: string;
}

export interface DomainStatus {
  hasCustomDomain: boolean;
  customDomain: string | null;
  domainStatus: 'pending' | 'verified' | 'error';
  domainType: 'apex' | 'subdomain' | null;
  dnsInstructions: { isApex: boolean; baseDomain: string; target: string; records: DnsRecord[] } | null;
  liveUrl: string | null;
  sslEnabled: boolean;
  domainConfiguredAt: string | null;
}

/** Résultat d'une vérification échouée : l'enregistrement attendu et ce que le DNS renvoie */
export interface DomainMismatch {
  type: 'A' | 'AAAA' | 'CNAME';
  name: string;
  expected: string;
  found: string[];
}

export type VerifyResult =
  | { success: true; url: string }
  | { success: false; error: string; hint?: string; mismatch: DomainMismatch | null; checkedAt: string };

export const domainQuery = queryOptions({
  queryKey: ['domaine'],
  queryFn: () => api<DomainStatus>('/api/domain/status'),
});

export const configureDomain = (customDomain: string) =>
  api<{ domain: string }>('/api/domain/configure', { method: 'POST', json: { customDomain } });

export const verifyDomain = () => api<VerifyResult>('/api/domain/verify', { method: 'POST' });

export const removeDomain = () => api<{ defaultUrl: string | null }>('/api/domain/remove', { method: 'DELETE' });

/** « Mairie.Saint-Aubin.fr/ » ou « https://www.mairie.fr » → « mairie.saint-aubin.fr », « www.mairie.fr » */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

export const DOMAIN_FORMAT = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

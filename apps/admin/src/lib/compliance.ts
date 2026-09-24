/**
 * Conformité (#147) : rapport calculé par l'API (`GET /api/compliance`, calcul partagé dans
 * `@communeo/core`) pour l'écran Conformité et le tableau de bord ; et, dans le sommaire des
 * réglages, un point orange sur l'écran où il manque un champ requis.
 */
import { queryOptions } from '@tanstack/react-query';
import type { ComplianceReport } from '@communeo/core';
import { api } from './api';
import type { SiteSettings } from './site-settings';

export const complianceQuery = queryOptions({
  queryKey: ['conformite'],
  queryFn: () => api<{ data: ComplianceReport }>('/api/compliance').then((response) => response.data),
  // Recalculée à chaque visite : on revient souvent de l'écran où l'on vient de compléter un point
  staleTime: 0,
});

/** « 5 points à compléter », « 1 point à compléter » */
export const remainingText = (report: Pick<ComplianceReport, 'done' | 'total'>) => {
  const left = report.total - report.done;
  return `${left} point${left > 1 ? 's' : ''} à compléter`;
};

export type SettingsScreenId = 'informations' | 'legal' | 'accessibilite' | 'reseaux' | 'demarches' | 'open-data';

const filled = (value: string | null | undefined) => !!value?.trim();

/** Écrans de réglages où un champ requis pour la conformité manque */
export function screensToComplete(site: SiteSettings): Set<SettingsScreenId> {
  const missing = new Set<SettingsScreenId>();
  // L'éditeur du site (la mairie) doit indiquer son adresse (LCEN, art. 6)
  if (!filled(site.address)) missing.add('informations');
  if (!filled(site.mentions_legales?.publication_director)) missing.add('legal');
  const level = site.accessibilite?.accessibility_level;
  if (!level || (level !== 'conforme' && !filled(site.accessibilite?.accessibility_schema_url)))
    missing.add('accessibilite');
  return missing;
}

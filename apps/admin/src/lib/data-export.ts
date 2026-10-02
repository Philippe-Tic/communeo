/**
 * Export des données de la commune (#343) : une archive ZIP préparée en arrière-plan, téléchargeable
 * 7 jours. Administrateurs de la commune (Mon site › Exporter les données) et équipe Communeo (fiche de
 * la commune : `site`, puisqu'un lien de téléchargement ne porte pas l'en-tête d'impersonation).
 */
import { queryOptions } from '@tanstack/react-query';
import { dataExportInProgress, type DataExportState } from '@communeo/core';
import { api, auth } from './api';

const withSite = (path: string, site?: string) => {
  // Équipe : la fiche de la commune, ou l'administration de la commune où elle est entrée
  const target = site ?? auth.impersonatedSite();
  return target ? `${path}?${new URLSearchParams({ site: target })}` : path;
};

export const dataExportQuery = (site?: string) =>
  queryOptions({
    queryKey: ['export-donnees', site ?? null],
    queryFn: () => api<{ data: DataExportState }>(withSite('/api/data-export', site)).then((response) => response.data),
    // Préparation en cours : l'écran suit l'avancement
    refetchInterval: (query) => (dataExportInProgress(query.state.data?.status) ? 3000 : false),
  });

export const requestDataExport = (site?: string) =>
  api<{ data: DataExportState }>(withSite('/api/data-export', site), { method: 'POST' }).then(
    (response) => response.data,
  );

/** Lien de téléchargement de l'archive prête (session de l'administration) */
export const dataExportDownloadUrl = (site?: string) => withSite('/api/data-export/download', site);

/** Taille lisible : « 12,4 Mo » */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fr-FR')} Ko`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Go`;
}

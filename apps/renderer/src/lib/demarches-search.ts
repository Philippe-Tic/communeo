/**
 * Recherche dans toutes les démarches de service-public.fr, depuis le navigateur : l'API publique du
 * backend, ou l'index réduit de la commune de démonstration. Sert la page Démarches et la recherche
 * du site.
 */
import {
  DemarcheSearchIndex,
  demarcheHref,
  mapDemarcheSearch,
  type DemarcheAudience,
  type DemarcheIndexEntry,
  type DemarcheSearchVM,
} from '@communeo/core/client';

let demoIndex: Promise<DemarcheSearchIndex | null> | null = null;

/** `null` : le service ne répond pas */
export async function searchDemarches(endpoint: string, audience: DemarcheAudience, query: string, limit = 20): Promise<DemarcheSearchVM | null> {
  if (endpoint.endsWith('.json')) {
    demoIndex ??= fetch(endpoint)
      .then((response) => (response.ok ? (response.json() as Promise<DemarcheIndexEntry[]>) : null))
      .then((entries) => (entries ? new DemarcheSearchIndex(entries) : null))
      .catch(() => null);
    const index = await demoIndex;
    if (!index) return null;
    const { total, results } = index.search(query, limit);
    return { audience, query, total, results };
  }
  const url = `${endpoint}/${audience}?q=${encodeURIComponent(query)}&limit=${limit}`;
  const payload = await fetch(url)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
  return payload ? mapDemarcheSearch(payload, audience, query) : null;
}

/** Libellé du type de page de la DILA, pour situer un résultat */
const kindLabel = (kind: string) => {
  if (kind.startsWith('Dossier')) return 'Dossier';
  if (kind.includes('Question')) return 'Question-réponse';
  if (kind.includes('Comment faire')) return 'Comment faire si…';
  return 'Fiche pratique';
};

/** Un résultat : même balisage que la recherche du site, que les thèmes habillent déjà */
export function searchResultItem(result: DemarcheIndexEntry, audience: DemarcheAudience): HTMLLIElement {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = demarcheHref(result.id, audience);
  link.textContent = result.title;
  const type = document.createElement('p');
  type.textContent = [kindLabel(result.kind), result.context].filter(Boolean).join(' · ');
  item.append(link, type);
  if (result.description) {
    const description = document.createElement('p');
    description.textContent = result.description;
    item.append(description);
  }
  return item;
}

export const resultCount = (total: number, query: string) =>
  total ? `${total} démarche${total > 1 ? 's' : ''} pour « ${query} »` : `Aucune démarche pour « ${query} »`;

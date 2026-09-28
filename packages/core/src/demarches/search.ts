/**
 * Recherche dans toutes les démarches de service-public.fr (plusieurs milliers de fiches), quel que
 * soit leur rang dans l'arborescence. Le backend construit l'index à partir des archives de la DILA
 * et répond avec `DemarcheSearchIndex` ; la commune de démonstration l'applique à un petit index.
 */
import type { DemarcheAudience } from './types';

/** Une fiche ou un dossier, tel que l'index le garde. */
export interface DemarcheIndexEntry {
  id: string;
  title: string;
  description: string;
  /** Rubrique où la fiche est rangée (dossier, sinon thème) */
  context: string;
  /** Dossier, fiche pratique, question-réponse… */
  kind: string;
}

export interface DemarcheSearchResult extends DemarcheIndexEntry {
  score: number;
}

export interface DemarcheSearchVM {
  audience: DemarcheAudience;
  query: string;
  total: number;
  results: DemarcheIndexEntry[];
}

/** Mots trop courants pour départager des fiches */
const STOP_WORDS = new Set([
  'a', 'au', 'aux', 'avec', 'ce', 'ces', 'comment', 'd', 'dans', 'de', 'des', 'du', 'en', 'est', 'et', 'faire',
  'il', 'je', 'l', 'la', 'le', 'les', 'ma', 'mon', 'mes', 'ou', 'où', 'par', 'pour', 'qu', 'que', 'qui', 'sa',
  'se', 'son', 'ses', 'sur', 'un', 'une', 'y',
]);

/** Minuscules, sans accents ni ponctuation : « Carte d'identité » → « carte d identite » */
export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Termes de la requête, sans les mots vides (gardés si la requête n'a qu'eux) */
export function searchTerms(query: string): string[] {
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  const meaningful = words.filter((word) => !STOP_WORDS.has(word));
  return [...new Set(meaningful.length ? meaningful : words)].slice(0, 8);
}

interface Prepared {
  entry: DemarcheIndexEntry;
  title: string[];
  titleText: string;
  other: string[];
}

const words = (value: string) => normalizeSearchText(value).split(' ').filter(Boolean);

/** Un terme trouve un mot qui commence par lui (« passe » → « passeport ») ; un mot entier compte plus. */
const matchWeight = (term: string, list: string[]) => {
  let best = 0;
  for (const word of list) {
    if (word === term) return 1;
    if (word.startsWith(term)) best = 0.7;
    // Pluriels et accords : « cartes » trouve « carte »
    else if (term.length > 3 && term.startsWith(word) && term.length - word.length <= 1) best = Math.max(best, 0.8);
  }
  return best;
};

export class DemarcheSearchIndex {
  private readonly prepared: Prepared[];

  constructor(entries: DemarcheIndexEntry[]) {
    this.prepared = entries.map((entry) => ({
      entry,
      title: words(entry.title),
      titleText: normalizeSearchText(entry.title),
      other: words(`${entry.description} ${entry.context}`),
    }));
  }

  get size() {
    return this.prepared.length;
  }

  /**
   * Chaque terme doit être trouvé (titre, description ou rubrique) ; le titre pèse le plus. Si aucune
   * fiche ne les contient tous, les fiches qui en contiennent le plus sont proposées.
   */
  search(query: string, limit = 20): { total: number; results: DemarcheSearchResult[] } {
    const terms = searchTerms(query);
    if (!terms.length) return { total: 0, results: [] };
    const phrase = terms.join(' ');

    const scored: Array<DemarcheSearchResult & { matched: number }> = [];
    for (const item of this.prepared) {
      let score = 0;
      let matched = 0;
      for (const term of terms) {
        const inTitle = matchWeight(term, item.title);
        const elsewhere = inTitle ? 0 : matchWeight(term, item.other);
        if (inTitle || elsewhere) matched += 1;
        score += inTitle * 10 + elsewhere * 3;
      }
      if (!matched) continue;
      if (item.titleText.startsWith(phrase)) score += 8;
      else if (item.titleText.includes(phrase)) score += 4;
      // Les dossiers regroupent les fiches d'un sujet : bon point d'entrée
      if (item.entry.kind === 'Dossier') score += 2;
      // À score égal, le titre le plus court est le plus général
      score -= item.title.length * 0.05;
      scored.push({ ...item.entry, score, matched });
    }

    const best = Math.max(0, ...scored.map((result) => result.matched));
    const found = scored
      .filter((result) => result.matched === best)
      .map(({ matched: _matched, ...result }) => result)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'fr'));
    return { total: found.length, results: found.slice(0, limit) };
  }
}

/** Réponse de l'API de recherche → résultats prêts à afficher */
export function mapDemarcheSearch(payload: unknown, audience: DemarcheAudience, query: string): DemarcheSearchVM {
  const raw = (payload ?? {}) as { data?: unknown; meta?: { total?: unknown } };
  const results = (Array.isArray(raw.data) ? raw.data : [])
    .map((item) => item as Partial<DemarcheIndexEntry>)
    .filter((item) => typeof item.id === 'string' && typeof item.title === 'string')
    .map((item) => ({
      id: item.id!,
      title: item.title!,
      description: typeof item.description === 'string' ? item.description : '',
      context: typeof item.context === 'string' ? item.context : '',
      kind: typeof item.kind === 'string' ? item.kind : '',
    }));
  const total = typeof raw.meta?.total === 'number' ? raw.meta.total : results.length;
  return { audience, query, total, results };
}

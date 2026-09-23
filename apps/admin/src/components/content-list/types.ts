/**
 * Description d'un type de contenu pour le gabarit de liste : ce qui change d'un type à l'autre
 * (colonnes, filtres, mots), le reste est commun (recherche, statut, tri, pages, actions).
 */
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ListSource, StatusFilter } from '@/lib/content-list';

/** Le nom du contenu, pour des phrases justes : « 2 pages sélectionnées », « Aucun événement… » */
export interface Noun {
  one: string;
  many: string;
  feminine: boolean;
  /** Avec l'article défini : « la page », « l'actualité », « le document » */
  definite: string;
}

export interface Media {
  url: string;
  alternativeText?: string | null;
  formats?: { thumbnail?: { url: string } } | null;
}

export interface ListRow {
  documentId: string;
  title: string;
  updatedAt: string;
  scheduled_at?: string | null;
}

export interface ColumnDef<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Tri par ce champ Strapi ; `sortLabel` complète « Trié par … » */
  sortField?: string;
  sortLabel?: string;
  className?: string;
  /** Masquée sous 1200 px (tablette, écran 1366 avec la preview) */
  wideOnly?: boolean;
}

export interface FilterDef {
  /** Paramètre d'adresse (?categorie=travaux) */
  key: string;
  label: string;
  /** Champ Strapi filtré */
  field: string;
  options: { value: string; label: string }[];
}

export interface ContentListConfig<T extends ListRow> {
  source: ListSource;
  title: string;
  noun: Noun;
  newLabel: string;
  /** Route de l'éditeur, avec $documentId (« nouvelle » pour créer) */
  editTo: string;
  /** Colonnes propres au type, entre le statut et la date de modification */
  columns: ColumnDef<T>[];
  /** Vignette 56 × 40 dans la colonne Titre (icône d'image à défaut) */
  thumbnail?: (row: T) => Media | null | undefined;
  /** Ligne d'informations des cartes (mobile) */
  meta?: (row: T) => Array<string | null | undefined>;
  filters?: FilterDef[];
  defaultSort?: { field: string; order: 'asc' | 'desc' };
  /** « Compact » (40 px, 50 par page) par défaut, pour les documents officiels */
  compactByDefault?: boolean;
  empty: { title: string; text: string };
  /** Adresse du contenu sur le site public (« Voir sur le site ») */
  publicPath?: (row: T) => string;
  /** Crée une copie en brouillon et renvoie son documentId */
  duplicate?: (row: T, client: QueryClient) => Promise<string>;
}

/** État de la liste dans l'adresse : retour arrière, lien partagé, rechargement */
export interface ListSearch {
  q?: string;
  statut?: StatusFilter;
  page?: number;
  tri?: string;
  ordre?: 'asc' | 'desc';
  [filter: string]: string | number | undefined;
}

const STATUSES: StatusFilter[] = ['brouillon', 'publie', 'programme'];

export function listSearch(filters: FilterDef[] = []) {
  return (raw: Record<string, unknown>): ListSearch => {
    const search: ListSearch = {};
    if (typeof raw.q === 'string' && raw.q.trim()) search.q = raw.q;
    if (STATUSES.includes(raw.statut as StatusFilter)) search.statut = raw.statut as StatusFilter;
    const page = Number(raw.page);
    if (Number.isInteger(page) && page > 1) search.page = page;
    if (typeof raw.tri === 'string') search.tri = raw.tri;
    if (raw.ordre === 'asc' || raw.ordre === 'desc') search.ordre = raw.ordre;
    for (const filter of filters) {
      const value = raw[filter.key];
      if (typeof value === 'string' && filter.options.some((option) => option.value === value)) search[filter.key] = value;
    }
    return search;
  };
}

/** Accords : « sélectionnée », « programmés »… */
export function agree(noun: Noun, word: string, count: number) {
  return `${word}${noun.feminine ? 'e' : ''}${count > 1 ? 's' : ''}`;
}

export const countOf = (noun: Noun, count: number) => `${count} ${count > 1 ? noun.many : noun.one}`;
export const indefinite = (noun: Noun) => `${noun.feminine ? 'une' : 'un'} ${noun.one}`;

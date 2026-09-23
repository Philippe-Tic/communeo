/**
 * Menu du site en cours d'édition : la configuration de @communeo/core (Site.navigation_config),
 * avec une clé stable par entrée (listes React, glisser-déposer). Fonctions pures : chaque
 * opération renvoie un nouvel état, ou `null` quand une limite l'interdit.
 */
import { NAVIGATION_LIMITS, SECTIONS, type NavigationConfig, type SectionKey } from '@communeo/core';

export type LinkEntry =
  | { key: string; type: 'page'; pageDocumentId: string; label: string }
  | { key: string; type: 'section'; section: SectionKey; label: string }
  | { key: string; type: 'external'; url: string; label: string };
export type GroupEntry = { key: string; type: 'group'; label: string; children: LinkEntry[] };
export type MenuEntry = LinkEntry | GroupEntry;

export interface MenuState {
  main: MenuEntry[];
  footer: LinkEntry[];
}

/** Liste modifiable : le menu principal, un sous-menu (clé du groupe) ou le pied de page */
export type ListId = 'main' | 'footer' | { group: string };

export const LIMITS = NAVIGATION_LIMITS;

let counter = 0;
export const newKey = () => `entree-${++counter}-${Math.random().toString(36).slice(2, 7)}`;

type LinkConfig = NavigationConfig['footer'][number];

function linkFromConfig(item: LinkConfig): LinkEntry {
  const label = item.label ?? '';
  if (item.type === 'page') return { key: newKey(), type: 'page', pageDocumentId: item.pageDocumentId, label };
  if (item.type === 'section') return { key: newKey(), type: 'section', section: item.section, label };
  return { key: newKey(), type: 'external', url: item.url, label };
}

export function fromConfig(config: Partial<NavigationConfig> | null | undefined): MenuState {
  return {
    main: (config?.main ?? []).map((item) =>
      item.type === 'group' ? { key: newKey(), type: 'group', label: item.label, children: item.children.map(linkFromConfig) } : linkFromConfig(item),
    ),
    footer: (config?.footer ?? []).map(linkFromConfig),
  };
}

function linkToConfig(entry: LinkEntry): LinkConfig {
  const label = entry.label.trim() || null;
  if (entry.type === 'page') return { type: 'page', pageDocumentId: entry.pageDocumentId, label };
  if (entry.type === 'section') return { type: 'section', section: entry.section, label };
  return { type: 'external', url: entry.url.trim(), label: entry.label.trim() };
}

export function toConfig(state: MenuState): NavigationConfig {
  return {
    main: state.main.map((entry) => (entry.type === 'group' ? { type: 'group', label: entry.label.trim(), children: entry.children.map(linkToConfig) } : linkToConfig(entry))),
    footer: state.footer.map(linkToConfig),
  };
}

export function listOf(state: MenuState, list: ListId): MenuEntry[] {
  if (list === 'main') return state.main;
  if (list === 'footer') return state.footer;
  const group = state.main.find((entry) => entry.key === list.group);
  return group?.type === 'group' ? group.children : [];
}

function withList(state: MenuState, list: ListId, entries: MenuEntry[]): MenuState {
  if (list === 'main') return { ...state, main: entries };
  if (list === 'footer') return { ...state, footer: entries as LinkEntry[] };
  return { ...state, main: state.main.map((entry) => (entry.key === list.group && entry.type === 'group' ? { ...entry, children: entries as LinkEntry[] } : entry)) };
}

export const limitOf = (list: ListId) => (list === 'main' ? LIMITS.main : list === 'footer' ? LIMITS.footer : LIMITS.children);

/** Déplace une entrée à une autre position de la même liste */
export function move(state: MenuState, list: ListId, from: number, to: number): MenuState {
  const entries = [...listOf(state, list)];
  if (to < 0 || to >= entries.length || from === to) return state;
  const [entry] = entries.splice(from, 1);
  entries.splice(to, 0, entry!);
  return withList(state, list, entries);
}

export function add(state: MenuState, list: ListId, entry: MenuEntry): MenuState | null {
  const entries = listOf(state, list);
  if (entries.length >= limitOf(list)) return null;
  return withList(state, list, [...entries, entry]);
}

export function replace(state: MenuState, list: ListId, entry: MenuEntry): MenuState {
  return withList(
    state,
    list,
    listOf(state, list).map((current) => (current.key === entry.key ? (current.type === 'group' && entry.type === 'group' ? { ...entry, children: current.children } : entry) : current)),
  );
}

export function remove(state: MenuState, list: ListId, key: string): MenuState {
  return withList(
    state,
    list,
    listOf(state, list).filter((entry) => entry.key !== key),
  );
}

/**
 * Indenter : l'entrée passe à la fin du groupe placé juste au-dessus. C'est le seul moyen de créer
 * un sous-menu ; impossible pour un groupe (un seul niveau) ou sans groupe au-dessus.
 */
export function indentBlocker(state: MenuState, index: number): string | null {
  const entry = state.main[index];
  const above = state.main[index - 1];
  if (!entry) return 'Entrée introuvable';
  if (entry.type === 'group') return 'Un groupe ne peut pas entrer dans un autre groupe : un seul niveau de sous-menu.';
  if (above?.type !== 'group') return 'Pour indenter, placez cette entrée juste sous un groupe.';
  if (above.children.length >= LIMITS.children) return `Le groupe « ${above.label} » est plein (${LIMITS.children} liens sur ${LIMITS.children}).`;
  return null;
}

export function indent(state: MenuState, index: number): MenuState | null {
  if (indentBlocker(state, index)) return null;
  const entry = state.main[index] as LinkEntry;
  const group = state.main[index - 1] as GroupEntry;
  const main = state.main.filter((_, position) => position !== index).map((item) => (item.key === group.key ? { ...group, children: [...group.children, entry] } : item));
  return { ...state, main };
}

export function outdentBlocker(state: MenuState): string | null {
  return state.main.length >= LIMITS.main ? `Le menu est plein (${LIMITS.main} entrées sur ${LIMITS.main}) : retirez d'abord une entrée.` : null;
}

/** Désindenter : l'entrée quitte le groupe et se place juste après lui */
export function outdent(state: MenuState, groupKey: string, childIndex: number): MenuState | null {
  if (outdentBlocker(state)) return null;
  const index = state.main.findIndex((entry) => entry.key === groupKey);
  const group = state.main[index];
  if (group?.type !== 'group') return null;
  const child = group.children[childIndex];
  if (!child) return null;
  const main = [...state.main];
  main[index] = { ...group, children: group.children.filter((_, position) => position !== childIndex) };
  main.splice(index + 1, 0, child);
  return { ...state, main };
}

// --- Pages dans le menu (interrupteur « Afficher dans le menu » de l'éditeur de page) -------------

export function pageIdsInMenu(config: Partial<NavigationConfig> | null | undefined): Set<string> {
  const ids = new Set<string>();
  const visit = (item: { type: string; pageDocumentId?: string; children?: unknown[] }) => {
    if (item.type === 'page' && item.pageDocumentId) ids.add(item.pageDocumentId);
    (item.children as Array<typeof item> | undefined)?.forEach(visit);
  };
  (config?.main ?? []).forEach(visit);
  return ids;
}

/** Ajoute la page en dernière entrée du menu principal ; `null` si le menu est plein */
export function addPageToConfig(config: Partial<NavigationConfig> | null | undefined, pageDocumentId: string): NavigationConfig | null {
  const main = config?.main ?? [];
  if (main.length >= LIMITS.main) return null;
  return { main: [...main, { type: 'page', pageDocumentId, label: null }], footer: config?.footer ?? [] };
}

/** Retire la page du menu principal, où qu'elle soit (entrée ou sous-menu) */
export function removePageFromConfig(config: Partial<NavigationConfig> | null | undefined, pageDocumentId: string): NavigationConfig {
  const keep = (item: { type: string; pageDocumentId?: string }) => !(item.type === 'page' && item.pageDocumentId === pageDocumentId);
  return {
    main: (config?.main ?? []).filter(keep).map((item) => (item.type === 'group' ? { ...item, children: item.children.filter(keep) } : item)),
    footer: config?.footer ?? [],
  };
}

export const SECTION_OPTIONS = (Object.entries(SECTIONS) as Array<[SectionKey, { path: string; label: string }]>).map(([key, section]) => ({ key, ...section }));

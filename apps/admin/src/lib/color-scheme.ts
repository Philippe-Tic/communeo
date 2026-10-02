/**
 * Mode clair / sombre : suit le système par défaut. La préférence (clair, sombre ou système) se choisit
 * dans le menu du compte et dans « Mon compte » ; sur ordinateur, la bascule de l'en-tête passe
 * directement de l'un à l'autre. Mémorisée dans ce navigateur (« système » : rien n'est gardé).
 */
import { useSyncExternalStore } from 'react';

export type ColorScheme = 'light' | 'dark';
export type ColorSchemePreference = ColorScheme | 'system';
const KEY = 'communeo.color-scheme';
const listeners = new Set<() => void>();

function saved(): ColorScheme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

const system = (): ColorScheme => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const current = (): ColorScheme => saved() ?? system();
const preference = (): ColorSchemePreference => saved() ?? 'system';

function apply() {
  document.documentElement.classList.toggle('dark', current() === 'dark');
  listeners.forEach((listener) => listener());
}

export function setColorScheme(scheme: ColorSchemePreference) {
  try {
    if (scheme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, scheme);
  } catch {
    /* non mémorisé */
  }
  apply();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', apply);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', apply);
  };
}

/** Mode affiché */
export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, current, () => 'light');
}

/** Préférence choisie : clair, sombre ou celle du système */
export function useColorSchemePreference(): ColorSchemePreference {
  return useSyncExternalStore(subscribe, preference, () => 'system');
}

export const COLOR_SCHEME_OPTIONS: Array<{ value: ColorSchemePreference; label: string }> = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Comme le système' },
];

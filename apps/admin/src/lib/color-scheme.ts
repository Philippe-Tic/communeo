/**
 * Mode clair / sombre : suit le système, la bascule de l'en-tête le remplace et se mémorise.
 */
import { useSyncExternalStore } from 'react';

export type ColorScheme = 'light' | 'dark';
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

function apply() {
  document.documentElement.classList.toggle('dark', current() === 'dark');
  listeners.forEach((listener) => listener());
}

export function setColorScheme(scheme: ColorScheme) {
  try {
    localStorage.setItem(KEY, scheme);
  } catch {
    /* non mémorisé */
  }
  apply();
}

export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      const media = matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', apply);
      return () => {
        listeners.delete(listener);
        media.removeEventListener('change', apply);
      };
    },
    current,
    () => 'light',
  );
}

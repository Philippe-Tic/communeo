/** Thèmes à tester : tous les packages de themes/ (ou la liste de E2E_THEMES, séparée par des virgules). */
import { existsSync, readdirSync } from 'node:fs';

const themesDir = new URL('../../../themes/', import.meta.url);

export const themes = (process.env.E2E_THEMES?.split(',').filter(Boolean) ??
  readdirSync(themesDir).filter((name) => existsSync(new URL(`${name}/package.json`, themesDir)))).sort();

export const outDir = (theme) => new URL(`../.e2e/${theme}/`, import.meta.url);
export const PORT_BASE = 4500;

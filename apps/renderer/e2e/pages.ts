import { readFileSync } from 'node:fs';
import { outDir, themes } from './themes.mjs';

/** Les routes sont celles du renderer : identiques pour tous les thèmes. */
export const PAGES: string[] = JSON.parse(readFileSync(new URL('pages.json', outDir(themes[0]!)), 'utf8'));

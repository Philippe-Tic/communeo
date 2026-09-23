#!/usr/bin/env node
/**
 * Indexe le site statique avec Pagefind : la recherche du site tourne ensuite entièrement
 * dans le navigateur, sans serveur. À lancer après `astro build` (mode statique uniquement).
 *
 *   node scripts/pagefind.mjs [dossier]
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';

const dir = process.argv[2] ?? process.env.OUT_DIR ?? fileURLToPath(new URL('../dist/', import.meta.url));
if (!existsSync(dir)) {
  console.error(`Pagefind : dossier introuvable (${dir})`);
  process.exit(1);
}

const { index, errors } = await pagefind.createIndex({ forceLanguage: 'fr' });
if (!index) throw new Error(errors.join('\n'));
const { page_count: pages, errors: indexErrors } = await index.addDirectory({ path: dir });
if (indexErrors?.length) throw new Error(indexErrors.join('\n'));
await index.writeFiles({ outputPath: `${dir.replace(/\/$/, '')}/pagefind` });
await pagefind.close();
console.log(`  index de recherche : ${pages} pages`);

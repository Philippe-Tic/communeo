#!/usr/bin/env node
/**
 * Contenus encore à fournir avant la mise en ligne du site (marqués par <AFournir>) : liste par page,
 * d'après le build (dist/). Code de sortie 1 s'il en reste.
 *
 *   pnpm --filter @communeo/site build && pnpm --filter @communeo/site a-fournir
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const seen = new Map();

for (const file of readdirSync(dist).filter((name) => name.endsWith('.html')).sort()) {
  const html = readFileSync(`${dist}${file}`, 'utf8');
  for (const [, content] of html.matchAll(/<(?:span|div)[^>]*data-a-fournir[^>]*>([\s\S]*?)<\/(?:span|div)>/g)) {
    const item = text(content);
    if (!seen.has(item)) seen.set(item, new Set());
    seen.get(item).add(`/${file.replace(/\.html$/, '').replace(/^index$/, '')}`);
  }
}

if (!seen.size) {
  console.log('Rien à fournir : le site est complet.');
  process.exit(0);
}
console.log(`${seen.size} contenu${seen.size > 1 ? 's' : ''} à fournir :\n`);
for (const [item, pages] of seen) console.log(`- ${item}\n  ${[...pages].join(', ')}`);
process.exit(1);

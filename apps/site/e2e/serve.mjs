#!/usr/bin/env node
/**
 * Serveur statique minimal pour les tests : sert dist/ comme Netlify (`/tarifs` sert `tarifs.html`, un
 * dossier son `index.html`, page introuvable en 404), avec les politiques de sécurité et en-têtes de
 * netlify.toml (la règle `/*`, remplacée sous `/demo/` par la sienne : un script bloqué fait échouer les
 * tests) et ses redirections de `/demo`.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const port = Number(process.argv[2] ?? 4600);
const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');

/** En-têtes d'une règle `[[headers]]` de netlify.toml */
function headersFor(pattern) {
  const block = toml.split('[[headers]]').find((part) => part.includes(`for = "${pattern}"`));
  if (!block) throw new Error(`netlify.toml : règle ${pattern} introuvable`);
  return Object.fromEntries([...block.matchAll(/^\s+([\w-]+) = "([^"]+)"$/gm)].filter(([, name]) => name !== 'for').map(([, name, value]) => [name, value]));
}
const general = headersFor('/*');
const demo = { ...general, ...headersFor('/demo/*') };

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/demo' || path === '/demo/') {
    res.writeHead(302, { Location: '/demo/institutionnel/' });
    return res.end();
  }
  const headers = path.startsWith('/demo/') ? demo : general;
  const isFile = (candidate) => existsSync(candidate) && statSync(candidate).isFile();
  let file = join(root, path === '/' ? 'index.html' : path);
  if (!isFile(file) && isFile(`${file}.html`)) file = `${file}.html`;
  else if (!isFile(file) && isFile(join(file, 'index.html'))) file = join(file, 'index.html');
  if (!isFile(file)) {
    res.writeHead(404, { ...headers, 'Content-Type': TYPES['.html'] });
    return res.end(readFileSync(join(root, '404.html')));
  }
  res.writeHead(200, { ...headers, 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, '127.0.0.1');

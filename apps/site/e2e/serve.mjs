#!/usr/bin/env node
/**
 * Serveur statique minimal pour les tests : sert dist/ comme Netlify (`/tarifs` sert `tarifs.html`,
 * page introuvable en 404), avec la politique de sécurité de netlify.toml (un script bloqué fait échouer
 * les tests).
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const port = Number(process.argv[2] ?? 4600);
const csp = /Content-Security-Policy = "([^"]+)"/.exec(readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8'))[1];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const isFile = (candidate) => existsSync(candidate) && statSync(candidate).isFile();
  let file = join(root, path === '/' ? 'index.html' : path);
  if (!isFile(file) && isFile(`${file}.html`)) file = `${file}.html`;
  if (!isFile(file)) {
    res.writeHead(404, { 'Content-Type': TYPES['.html'], 'Content-Security-Policy': csp });
    return res.end(readFileSync(join(root, '404.html')));
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Content-Security-Policy': csp });
  res.end(readFileSync(file));
}).listen(port, '127.0.0.1');

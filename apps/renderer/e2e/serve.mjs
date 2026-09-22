#!/usr/bin/env node
/** Serveur statique minimal pour les tests : sert .e2e/<thème> comme un hébergeur (index.html, 404.html). */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outDir } from './themes.mjs';

const [theme, port] = process.argv.slice(2);
const root = fileURLToPath(outDir(theme));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.ics': 'text/calendar', '.json': 'application/json', '.xml': 'application/xml' };

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(root, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    return res.end(readFileSync(join(root, '404.html')));
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(Number(port), '127.0.0.1');

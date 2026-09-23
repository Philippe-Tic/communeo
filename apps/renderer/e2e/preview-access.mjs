#!/usr/bin/env node
/**
 * Accès au serveur de preview (mode serveur, données Strapi) : sans jeton valide, 401 ; un jeton dans
 * l'adresse est rangé en cookie HttpOnly puis retiré de l'adresse. Pas besoin de Strapi : ces décisions
 * sont prises avant tout chargement de contenu.
 */
import { execSync, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { signPreviewToken } from '@communeo/core';

const dir = fileURLToPath(new URL('../.e2e/preview-access/', import.meta.url));
const secret = 'secret-e2e';
const port = 4690;
const base = `http://127.0.0.1:${port}`;

rmSync(dir, { recursive: true, force: true });
execSync('pnpm astro build', { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, RENDER_MODE: 'server', DATA_SOURCE: 'strapi', OUT_DIR: dir } });
const server = spawn('node', [`${dir}server/entry.mjs`], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), RENDER_MODE: 'server', DATA_SOURCE: 'strapi', CONTENT_STATUS: 'draft', PREVIEW_SECRET: secret, PREVIEW_FRAME_ANCESTORS: 'https://admin.test', STRAPI_URL: 'http://127.0.0.1:9', STRAPI_TOKEN: 'x' },
  stdio: 'ignore',
});
for (let i = 0; i < 50; i += 1) {
  if (await fetch(base).then(() => true).catch(() => false)) break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ` ${detail}`}`);
  if (!ok) failures += 1;
};
const get = (path, headers = {}) => fetch(`${base}${path}`, { headers, redirect: 'manual' });

try {
  const anonymous = await get('/actualites');
  check('sans jeton : 401', anonymous.status === 401, `(${anonymous.status})`);
  check('401 jamais indexée ni mise en cache', anonymous.headers.get('x-robots-tag')?.includes('noindex') && anonymous.headers.get('cache-control')?.includes('no-store'));

  check('jeton invalide : 401', (await get('/?token=abc.def')).status === 401);
  const { token } = await signPreviewToken({ site: 'site-a' }, 'autre-secret');
  check('jeton signé avec un autre secret : 401', (await get(`/?token=${token}`)).status === 401);

  const valid = (await signPreviewToken({ site: 'site-a' }, secret)).token;
  const entry = await get(`/actualites/brocante?token=${valid}`);
  const setCookie = entry.headers.get('set-cookie') ?? '';
  check('jeton valide : redirection sans le jeton', entry.status === 302 && entry.headers.get('location') === '/actualites/brocante', `(${entry.status} ${entry.headers.get('location')})`);
  check('jeton rangé dans un cookie HttpOnly', /communeo_preview=[^;]+;.*HttpOnly/.test(setCookie), setCookie);

  check("affichable seulement dans l'administration (frame-ancestors)", (anonymous.headers.get('content-security-policy') ?? '').includes("frame-ancestors 'self' https://admin.test"), anonymous.headers.get('content-security-policy') ?? '');

  const withCookie = await get('/', { cookie: `communeo_preview=${encodeURIComponent(valid)}` });
  check('avec le cookie : accès accordé (le contenu vient ensuite de Strapi)', withCookie.status !== 401, `(${withCookie.status})`);

  // Réglages non enregistrés envoyés par l'admin (autre origine) : jeton obligatoire dans le formulaire
  const post = (fields, headers = {}) =>
    fetch(`${base}/`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://admin.test', ...headers }, body: new URLSearchParams(fields) });
  const settings = JSON.stringify({ navigation_config: { main: [{ type: 'section', section: 'agenda' }], footer: [] } });
  check('POST de réglages sans jeton : 401, même avec le cookie', (await post({ settings }, { cookie: `communeo_preview=${encodeURIComponent(valid)}` })).status === 401);
  check('POST de réglages hors liste : 400', (await post({ token: valid, settings: JSON.stringify({ name: 'x' }) })).status === 400);
  const accepted = await post({ token: valid, settings });
  check("POST de réglages depuis l'admin : accepté (pas de blocage d'origine)", ![401, 403, 400].includes(accepted.status), `(${accepted.status})`);
} finally {
  server.kill();
}

process.exit(failures ? 1 : 0);

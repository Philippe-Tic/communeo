#!/usr/bin/env node
/**
 * Lance la commune de démonstration dans un thème, sans Strapi.
 *
 *   pnpm theme:dev institutionnel
 *   pnpm theme:dev institutionnel --variant minimal --logo blason
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { variant: { type: 'string', default: 'complete' }, logo: { type: 'string', default: 'horizontal' }, port: { type: 'string', default: '4321' } },
});
const theme = positionals[0] ?? 'starter';
if (!existsSync(new URL(`../themes/${theme}/package.json`, import.meta.url))) {
  console.error(`Thème introuvable : themes/${theme}`);
  process.exit(1);
}
if (!['complete', 'minimal', 'empty'].includes(values.variant)) {
  console.error('Variante : complete, minimal ou empty');
  process.exit(1);
}

const child = spawn('pnpm', ['--filter', '@communeo/renderer', 'exec', 'astro', 'dev', '--port', values.port], {
  stdio: 'inherit',
  env: { ...process.env, THEME: theme, DATA_SOURCE: 'fixtures', FIXTURE_VARIANT: values.variant, FIXTURE_LOGO: values.logo },
});
child.on('exit', (code) => process.exit(code ?? 0));

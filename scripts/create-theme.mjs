#!/usr/bin/env node
/**
 * Crée un thème à partir du thème de départ.
 *
 *   pnpm create-theme institutionnel --name "Institutionnel"
 *
 * Copie themes/starter vers themes/<id>, renomme le package et le manifest, déclare le thème
 * comme dépendance du renderer puis lance pnpm install.
 */
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { positionals, values } = parseArgs({ allowPositionals: true, options: { name: { type: 'string' } } });
const id = positionals[0];
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('Usage : pnpm create-theme <id> [--name "Nom affiché"]   (id : minuscules, chiffres, tirets)');
  process.exit(1);
}

const root = new URL('..', import.meta.url).pathname;
const target = join(root, 'themes', id);
if (existsSync(target)) {
  console.error(`Le thème « ${id} » existe déjà : ${target}`);
  process.exit(1);
}

const name = values.name ?? id.charAt(0).toUpperCase() + id.slice(1);
cpSync(join(root, 'themes', 'starter'), target, {
  recursive: true,
  // Ni dépendances ni caches ; les composants .astro sont bien copiés
  filter: (source) => !/(^|\/)(node_modules|\.astro|\.turbo|dist)(\/|$)/.test(source),
});

const edit = (file, transform) => writeFileSync(file, transform(readFileSync(file, 'utf8')));

edit(join(target, 'package.json'), (text) => {
  const pkg = JSON.parse(text);
  pkg.name = `@communeo/theme-${id}`;
  pkg.description = `Thème ${name} des sites Communeo.`;
  return `${JSON.stringify(pkg, null, 2)}\n`;
});

edit(join(target, 'src', 'index.ts'), (text) =>
  text
    .replace(/\/\*\*[\s\S]*?\*\/\n/, `/** Thème ${name}. */\n`)
    .replace("id: 'starter'", `id: '${id}'`)
    .replace("name: 'Départ'", `name: '${name.replace(/'/g, "\\'")}'`)
    .replace("description: 'Thème de départ sans design, pour créer un nouveau thème.'", "description: 'À compléter.'"),
);

edit(join(root, 'apps', 'renderer', 'package.json'), (text) => {
  const pkg = JSON.parse(text);
  pkg.dependencies[`@communeo/theme-${id}`] = 'workspace:*';
  pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)));
  return `${JSON.stringify(pkg, null, 2)}\n`;
});

execSync('pnpm install', { cwd: root, stdio: 'inherit' });

const registry = readFileSync(join(root, 'packages', 'core', 'src', 'site', 'themes.ts'), 'utf8');
console.log(`\nThème créé : themes/${id} (@communeo/theme-${id})`);
console.log(`  pnpm theme:dev ${id}          # commune de démonstration dans ce thème`);
if (!registry.includes(`id: '${id}'`)) {
  console.log(`\nPour qu'une commune puisse le choisir, ajoutez « ${id} » :`);
  console.log('  - au registre THEMES de packages/core/src/site/themes.ts ;');
  console.log('  - à l\'énumération « theme » de apps/backend/src/api/site/content-types/site/schema.json ;');
  console.log('  puis lancez pnpm gen:types (un test vérifie que les deux listes sont identiques).');
}

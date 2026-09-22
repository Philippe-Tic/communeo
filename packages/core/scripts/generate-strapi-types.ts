/**
 * Génère les types TypeScript des réponses de l'API Strapi à partir des schémas du backend.
 *
 * Source : apps/backend/src/{api,components,extensions}/**\/*.json
 * Sortie : packages/core/src/generated/strapi.ts (ne pas modifier à la main)
 *
 * Conventions :
 * - un champ non requis vaut `T | null` (Strapi renvoie null quand il est vide) ;
 * - relations, médias, composants et dynamic zones ne sont présents que s'ils sont peuplés
 *   (`populate`) : ils sont donc optionnels ;
 * - les champs privés et les mots de passe ne sont jamais renvoyés par l'API : ils sont omis.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Attribute = {
  type: string;
  required?: boolean;
  private?: boolean;
  enum?: string[];
  multiple?: boolean;
  relation?: string;
  target?: string;
  component?: string;
  components?: string[];
  repeatable?: boolean;
};

type Schema = {
  info: { singularName?: string; pluralName?: string; displayName?: string; description?: string };
  options?: { draftAndPublish?: boolean };
  attributes: Record<string, Attribute>;
};

const here = dirname(fileURLToPath(import.meta.url));
const backendSrc = resolve(here, '../../../apps/backend/src');
const outFile = resolve(here, '../src/generated/strapi.ts');

const pascal = (value: string) =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

// --- Collecte des content-types et composants -------------------------------------------------

type ContentType = { uid: string; name: string; schema: Schema };
const contentTypes: ContentType[] = [];

const apiDir = join(backendSrc, 'api');
for (const api of readdirSync(apiDir).sort()) {
  const ctDir = join(apiDir, api, 'content-types');
  if (!existsSync(ctDir)) continue;
  for (const ct of readdirSync(ctDir).sort()) {
    const file = join(ctDir, ct, 'schema.json');
    if (!existsSync(file)) continue;
    contentTypes.push({ uid: `api::${api}.${ct}`, name: pascal(ct), schema: readJson<Schema>(file) });
  }
}

const userSchemaFile = join(backendSrc, 'extensions/users-permissions/content-types/user/schema.json');
if (existsSync(userSchemaFile)) {
  contentTypes.push({ uid: 'plugin::users-permissions.user', name: 'User', schema: readJson<Schema>(userSchemaFile) });
}

type Component = { uid: string; name: string; schema: Schema };
const components: Component[] = [];
const componentsDir = join(backendSrc, 'components');
if (existsSync(componentsDir)) {
  for (const category of readdirSync(componentsDir).sort()) {
    for (const file of readdirSync(join(componentsDir, category)).sort()) {
      if (!file.endsWith('.json')) continue;
      const name = file.replace(/\.json$/, '');
      components.push({
        uid: `${category}.${name}`,
        name: pascal(`${category}-${name}`),
        schema: readJson<Schema>(join(componentsDir, category, file)),
      });
    }
  }
}

const typeNameByUid = new Map<string, string>([
  ...contentTypes.map((ct) => [ct.uid, ct.name] as const),
  ...components.map((c) => [c.uid, c.name] as const),
  ['plugin::upload.file', 'Media'],
  ['plugin::users-permissions.role', 'Role'],
]);

const typeName = (uid: string) => {
  const name = typeNameByUid.get(uid);
  if (!name) throw new Error(`Type inconnu pour la cible « ${uid} »`);
  return name;
};

// --- Traduction des attributs -------------------------------------------------------------------

const enums: string[] = [];

function scalarType(owner: string, field: string, attr: Attribute): string {
  switch (attr.type) {
    case 'string':
    case 'text':
    case 'richtext':
    case 'email':
    case 'uid':
    case 'date':
    case 'datetime':
    case 'time':
    case 'biginteger':
    case 'decimal':
      return 'string';
    case 'integer':
    case 'float':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'json':
    case 'blocks':
      return 'JsonValue';
    case 'enumeration': {
      const name = `${owner}${pascal(field)}`;
      const values = attr.enum ?? [];
      enums.push(
        `export const ${name[0]!.toLowerCase()}${name.slice(1)}Values = [${values.map((v) => `'${v}'`).join(', ')}] as const;\n` +
          `export type ${name} = (typeof ${name[0]!.toLowerCase()}${name.slice(1)}Values)[number];`,
      );
      return name;
    }
    default:
      throw new Error(`Type d'attribut non géré : ${attr.type} (${owner}.${field})`);
  }
}

function fieldLine(owner: string, field: string, attr: Attribute): string | null {
  if (attr.private || attr.type === 'password') return null;
  const key = /^[a-zA-Z_$][\w$]*$/.test(field) ? field : `'${field}'`;

  if (attr.type === 'relation') {
    const target = typeName(attr.target!);
    const many = attr.relation === 'oneToMany' || attr.relation === 'manyToMany';
    return `  ${key}?: ${many ? `${target}[]` : `${target} | null`};`;
  }
  if (attr.type === 'media') {
    return `  ${key}?: ${attr.multiple ? 'Media[]' : 'Media | null'};`;
  }
  if (attr.type === 'component') {
    const target = typeName(attr.component!);
    return `  ${key}?: ${attr.repeatable ? `${target}[]` : `${target} | null`};`;
  }
  if (attr.type === 'dynamiczone') {
    const union = (attr.components ?? []).map((uid) => `DynamicZoneEntry<'${uid}', ${typeName(uid)}>`).join(' | ');
    return `  ${key}?: Array<${union || 'never'}>;`;
  }
  const type = scalarType(owner, field, attr);
  return `  ${key}: ${attr.required ? type : `${type} | null`};`;
}

function interfaceFor(name: string, schema: Schema, base: string, doc: string): string {
  const lines = Object.entries(schema.attributes)
    .map(([field, attr]) => fieldLine(name, field, attr))
    .filter((line): line is string => line !== null);
  return `/** ${doc} */\nexport interface ${name} extends ${base} {\n${lines.join('\n')}\n}`;
}

// --- Écriture ------------------------------------------------------------------------------------

const componentInterfaces = components.map((c) =>
  interfaceFor(c.name, c.schema, 'StrapiComponent', `Composant \`${c.uid}\``),
);
const contentTypeInterfaces = contentTypes.map((ct) =>
  interfaceFor(
    ct.name,
    ct.schema,
    ct.schema.options?.draftAndPublish ? 'StrapiPublishableDocument' : 'StrapiDocument',
    `Content-type \`${ct.uid}\`${ct.schema.info.description ? ` — ${ct.schema.info.description}` : ''}`,
  ),
);

const pluralNames = contentTypes
  .filter((ct) => ct.uid.startsWith('api::') && ct.schema.info.pluralName)
  .map((ct) => `  '${ct.uid}': '${ct.schema.info.pluralName}',`);

const output = `// Fichier généré par packages/core/scripts/generate-strapi-types.ts — ne pas modifier à la main.
// Régénérer avec : pnpm gen:types

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface StrapiDocument {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrapiPublishableDocument extends StrapiDocument {
  publishedAt: string | null;
}

export interface StrapiComponent {
  id: number;
}

export type DynamicZoneEntry<Uid extends string, T> = T & { __component: Uid };

export interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  url: string;
}

/** Fichier de la médiathèque (\`plugin::upload.file\`) */
export interface Media extends StrapiDocument {
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  formats: Record<string, MediaFormat> | null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
}

/** Rôle users-permissions (\`plugin::users-permissions.role\`) */
export interface Role extends StrapiDocument {
  name: string;
  description: string | null;
  type: string;
}

// --- Énumérations ---

${enums.join('\n\n')}

// --- Composants ---

${componentInterfaces.join('\n\n')}

// --- Content-types ---

${contentTypeInterfaces.join('\n\n')}

/** Nom pluriel de chaque content-type, utilisé dans les routes REST (\`/api/<pluralName>\`) */
export const pluralNames = {
${pluralNames.join('\n')}
} as const;

export type ContentTypeUid = keyof typeof pluralNames;

export interface ContentTypes {
${contentTypes.map((ct) => `  '${ct.uid}': ${ct.name};`).join('\n')}
}

export interface Components {
${components.map((c) => `  '${c.uid}': ${c.name};`).join('\n')}
}
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, output);
console.log(`Types Strapi générés : ${contentTypes.length} content-types, ${components.length} composants → ${outFile}`);

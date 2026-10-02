/**
 * Export des données d'une commune (#343, réversibilité) : une archive ZIP que les administrateurs de la
 * commune (ou l'équipe Communeo) téléchargent depuis l'administration, en cours d'abonnement comme
 * après la fin de l'essai. Préparée en arrière-plan par Strapi, gardée `DATA_EXPORT_KEEP_DAYS` jours.
 *
 * Ici, ce qui ne dépend pas de Strapi : l'état d'un export, le statut de publication d'un contenu, le
 * rendu HTML du texte riche et des blocs (contenus lisibles sans Communeo), les CSV et le LISEZMOI.
 */
import type { RichTextDocument, RichTextInline, RichTextList } from '../blocks/rich-text';
import { escapeHtml } from '../demarches/render';
import { formatDate } from '../format';
import { addDays } from './trial';

/** Durée pendant laquelle l'archive prête reste téléchargeable */
export const DATA_EXPORT_KEEP_DAYS = 7;

export const DATA_EXPORT_STATUSES = ['queued', 'running', 'ready', 'failed'] as const;
export type DataExportStatus = (typeof DATA_EXPORT_STATUSES)[number];

/** État de l'export d'une commune, vu par l'administration */
export interface DataExportState {
  status: DataExportStatus | null;
  requestedAt: string | null;
  requestedBy: string | null;
  finishedAt: string | null;
  /** Fin de disponibilité de l'archive prête */
  expiresAt: string | null;
  /** Taille de l'archive, en octets */
  size: number | null;
  /** Échec : message à afficher */
  error: string | null;
}

export const dataExportExpiry = (finishedAt: Date | string) => addDays(finishedAt, DATA_EXPORT_KEEP_DAYS);

/** Un export en préparation : pas de nouvelle demande */
export const dataExportInProgress = (status: DataExportStatus | null | undefined) => status === 'queued' || status === 'running';

/** Nom de l'archive proposé au téléchargement : `communeo-export-saint-aubin-2026-10-02.zip` */
export const dataExportFileName = (slug: string, finishedAt: Date | string) =>
  `communeo-export-${slug}-${new Date(finishedAt).toISOString().slice(0, 10)}.zip`;

// Statut de publication

export type PublicationLabel = 'brouillon' | 'publié' | 'publié, modifications en brouillon';

/**
 * Statut d'un contenu à brouillon et publication, à partir de ses deux versions (même règle que les
 * listes de l'administration) : jamais publié, publié, ou publié avec des modifications plus récentes.
 */
export function publicationLabel(draft: { updatedAt?: string | Date | null } | null, published: { updatedAt?: string | Date | null } | null): PublicationLabel {
  if (!published) return 'brouillon';
  if (draft?.updatedAt && published.updatedAt && new Date(draft.updatedAt).getTime() > new Date(published.updatedAt).getTime()) {
    return 'publié, modifications en brouillon';
  }
  return 'publié';
}

// HTML

function inlineToHtml(nodes: RichTextInline[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === 'hardBreak') return '<br>';
      let html = escapeHtml(node.text);
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') html = `<strong>${html}</strong>`;
        else if (mark.type === 'italic') html = `<em>${html}</em>`;
        else if (mark.type === 'link') html = `<a href="${escapeHtml(mark.attrs.href)}">${html}</a>`;
      }
      return html;
    })
    .join('');
}

function listToHtml(list: RichTextList): string {
  const tag = list.type === 'orderedList' ? 'ol' : 'ul';
  const start = list.type === 'orderedList' && list.attrs?.start && list.attrs.start !== 1 ? ` start="${list.attrs.start}"` : '';
  const items = list.content
    .map((item) => `<li>${item.content.map((child) => (child.type === 'paragraph' ? inlineToHtml(child.content) : listToHtml(child))).join('')}</li>`)
    .join('');
  return `<${tag}${start}>${items}</${tag}>`;
}

/** Texte riche (JSON TipTap restreint) → HTML ; une valeur qui n'en est pas un donne une chaîne vide */
export function richTextToHtml(value: unknown): string {
  const doc = value as RichTextDocument | null;
  if (!doc || doc.type !== 'doc' || !Array.isArray(doc.content)) return '';
  return doc.content
    .map((node) => {
      if (node.type === 'paragraph') return `<p>${inlineToHtml(node.content)}</p>`;
      if (node.type === 'heading') return `<h${node.attrs.level}>${inlineToHtml(node.content)}</h${node.attrs.level}>`;
      if (node.type === 'bulletList' || node.type === 'orderedList') return listToHtml(node);
      return '';
    })
    .join('\n');
}

/** Fichier tel que l'archive le référence (chemin relatif au fichier HTML) */
export interface ExportedMedia {
  href: string;
  name: string;
  alt: string | null;
  mime: string | null;
}

type Block = Record<string, any> & { __component?: string };

const CALLOUT_LABELS: Record<string, string> = { info: 'Information', warning: 'Attention', important: 'Important', tip: 'Conseil' };

/**
 * Blocs d'une page, d'une actualité ou d'un événement → HTML simple et sémantique.
 * `media` traduit un fichier peuplé par Strapi en lien dans l'archive (null : fichier absent).
 */
export function blocksToHtml(blocks: unknown, media: (file: unknown) => ExportedMedia | null): string {
  if (!Array.isArray(blocks)) return '';
  const image = (file: unknown, caption?: string | null) => {
    const found = media(file);
    if (!found) return '';
    const img = `<img src="${escapeHtml(found.href)}" alt="${escapeHtml(found.alt ?? '')}">`;
    return caption ? `<figure>${img}<figcaption>${escapeHtml(caption)}</figcaption></figure>` : `<figure>${img}</figure>`;
  };
  const title = (text: unknown) => (typeof text === 'string' && text.trim() ? `<h2>${escapeHtml(text)}</h2>` : '');
  return (blocks as Block[])
    .map((block) => {
      switch (block.__component) {
        case 'blocks.text':
          return richTextToHtml(block.body);
        case 'blocks.image':
          return image(block.image, block.caption);
        case 'blocks.buttons':
          return `<p>${(block.buttons ?? [])
            .filter((button: Block) => button?.url)
            .map((button: Block) => `<a href="${escapeHtml(button.url)}">${escapeHtml(button.label ?? button.url)}</a>`)
            .join(' · ')}</p>`;
        case 'blocks.callout':
          return `<aside><p><strong>${escapeHtml(block.title || CALLOUT_LABELS[block.variant] || 'Information')}</strong></p>${richTextToHtml(block.body)}</aside>`;
        case 'blocks.documents': {
          const items = (block.files ?? [])
            .map((file: unknown) => media(file))
            .filter((found: ExportedMedia | null): found is ExportedMedia => !!found)
            .map((found: ExportedMedia) => `<li><a href="${escapeHtml(found.href)}">${escapeHtml(found.name)}</a></li>`)
            .join('');
          return `${title(block.title)}<ul>${items}</ul>`;
        }
        case 'blocks.gallery':
          return `${title(block.title)}${(block.images ?? []).map((file: unknown) => image(file)).join('')}`;
        case 'blocks.faq':
          return `${title(block.title)}${(block.items ?? [])
            .map((item: Block) => `<details><summary>${escapeHtml(item.question ?? '')}</summary>${richTextToHtml(item.answer)}</details>`)
            .join('')}`;
        case 'blocks.contact': {
          const lines = [block.address, block.phone, block.email, block.hours].filter((line) => typeof line === 'string' && line.trim());
          return `<address><strong>${escapeHtml(block.name ?? '')}</strong>${lines.map((line: string) => `<br>${escapeHtml(line)}`).join('')}</address>`;
        }
        case 'blocks.video':
          return `<p><a href="${escapeHtml(block.url ?? '')}">${escapeHtml(block.title || 'Vidéo')}</a></p>${
            block.transcript ? `<details><summary>Transcription</summary><p>${escapeHtml(block.transcript)}</p></details>` : ''
          }`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

/** Page HTML autonome d'un contenu exporté */
export function exportHtmlDocument(input: { title: string; communeName: string; details?: string[]; lead?: string | null; body: string }): string {
  const details = (input.details ?? []).filter(Boolean);
  return [
    '<!doctype html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapeHtml(input.title)} — ${escapeHtml(input.communeName)}</title>`,
    '<style>body{font-family:system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.5}img{max-width:100%;height:auto}aside{border-left:4px solid #888;padding-left:1rem}</style>',
    '</head>',
    '<body>',
    `<h1>${escapeHtml(input.title)}</h1>`,
    details.length ? `<p><small>${details.map(escapeHtml).join(' · ')}</small></p>` : '',
    input.lead ? `<p><strong>${escapeHtml(input.lead)}</strong></p>` : '',
    input.body,
    '</body>',
    '</html>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

// CSV

export interface CsvColumn<T> {
  label: string;
  value: (row: T) => unknown;
}

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * CSV lisible par un tableur français : séparateur `;`, UTF-8 avec BOM (accents dans Excel), lignes CRLF.
 */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines = [columns.map((column) => csvCell(column.label)), ...rows.map((row) => columns.map((column) => csvCell(column.value(row))))];
  return `﻿${lines.map((cells) => cells.join(';')).join('\r\n')}\r\n`;
}

// LISEZMOI

export interface ExportReadmeInput {
  communeName: string;
  generatedAt: Date | string;
  /** Le site publié est dans l'archive (hébergement Communeo) ; sinon, la raison */
  publishedSite: { included: true } | { included: false; reason: string };
  counts: Record<string, number>;
  /** Fichiers de la médiathèque introuvables sur le serveur */
  missingFiles: number;
}

/** Fichier LISEZMOI.md de l'archive : ce qu'elle contient et comment la lire */
export function exportReadme(input: ExportReadmeInput): string {
  const count = (key: string) => input.counts[key] ?? 0;
  return [
    `# Données de la commune ${input.communeName}`,
    '',
    `Archive préparée par Communeo le ${formatDate(input.generatedAt)}. Elle contient tout ce que la commune a enregistré dans Communeo, dans des formats ouverts, lisibles sans Communeo.`,
    '',
    '## Contenu',
    '',
    input.publishedSite.included
      ? '- `site-publie/` : le site tel qu’il est en ligne (pages HTML, styles, images). Ouvrez `site-publie/index.html` dans un navigateur ; certaines adresses s’écrivent `actualites.html` au lieu de `/actualites`.'
      : `- Le site publié n’est pas inclus : ${input.publishedSite.reason}`,
    `- \`contenus/\` : les contenus en JSON (format ouvert), avec leurs dates et leur statut (brouillon, publié, publication programmée) :`,
    `  - \`pages.json\` (${count('pages')}), \`actualites.json\` (${count('articles')}), \`evenements.json\` (${count('events')}) : avec, dans les dossiers du même nom, une page HTML par contenu pour les lire dans un navigateur ;`,
    `  - \`documents-officiels.json\` (${count('documents')}), \`alertes.json\` (${count('alerts')}), \`equipe-municipale.json\` (${count('team')}), \`associations.json\` (${count('associations')}), \`menus-cantine.json\` (${count('canteen')}), \`collectes.json\` (${count('waste')}), \`redirections.json\` (${count('redirects')}) ;`,
    '  - `reglages-du-site.json` : nom, coordonnées, horaires, page d’accueil, menu, mentions légales et autres réglages.',
    `- \`fichiers/\` : les ${count('files')} fichiers d’origine de la médiathèque (images, PDF…). \`fichiers/index.csv\` donne pour chacun son nom, son dossier, son texte alternatif et sa légende.${
      input.missingFiles ? ` ${input.missingFiles} fichier(s) introuvable(s) sur le serveur, signalé(s) dans l’index.` : ''
    }`,
    '- `donnees-personnelles/` : les données personnelles confiées par les habitants, en CSV (séparateur `;`, ouvrable dans un tableur) :',
    `  - \`messages.csv\` (${count('messages')}) : messages du formulaire de contact, avec la réponse de la mairie et l’historique ; leurs pièces jointes dans \`messages-pieces-jointes/\` ;`,
    `  - \`abonnes-lettre.csv\` (${count('subscribers')}) : inscrits à la lettre d’information ;`,
    `  - \`associations.csv\` (${count('associations')}) : fiches des associations et de leurs contacts.`,
    '',
    '## Formats',
    '',
    '- Les dates sont au format ISO 8601, en temps universel (UTC) : `2026-10-02T08:30:00.000Z`.',
    '- Le texte riche (corps des pages, réponses aux messages…) est en JSON (format TipTap) ; les pages HTML le donnent mis en forme.',
    '- Dans les JSON, un fichier est décrit par son chemin dans l’archive (`fichier`), son nom, son texte alternatif et son type.',
    '',
    '## Données personnelles',
    '',
    'Le dossier `donnees-personnelles/` contient des données personnelles d’habitants (noms, adresses e-mail, messages). La commune en est responsable (RGPD) : conservez l’archive en lieu sûr et supprimez-la quand elle n’est plus utile.',
    '',
  ].join('\n');
}

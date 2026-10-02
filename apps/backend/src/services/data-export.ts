/**
 * Export des données d'une commune (#343, réversibilité) : une archive ZIP préparée en arrière-plan par
 * Strapi, téléchargeable `DATA_EXPORT_KEEP_DAYS` jours depuis l'administration (administrateurs de la
 * commune, équipe Communeo), puis effacée.
 *
 * Strapi la prépare lui-même plutôt que le worker : contenus, fichiers d'origine (volume `uploads`) et
 * site publié (volume `sites`) sont déjà chez lui, sans route interne ni copie par le réseau. L'archive
 * s'écrit en continu dans un fichier (`createZipWriter`), un fichier après l'autre : un gros export ne
 * charge pas la mémoire de Strapi. Un export à la fois ; l'état est sur le Site (`data_export`, champ
 * technique) : `queued` → `running` → `ready` | `failed`. La demande lance la préparation tout de suite ;
 * la tâche de chaque minute reprend ce qui attend (redémarrage de Strapi) et efface les archives périmées.
 *
 * Contenu : voir `exportReadme` (@communeo/core) — site publié, contenus en JSON (+ une page HTML par
 * page, actualité et événement), fichiers de la médiathèque avec leur texte alternatif, données
 * personnelles en CSV (messages et pièces jointes, abonnés à la lettre, associations), LISEZMOI.md.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  blocksToHtml,
  dataExportExpiry,
  dataExportInProgress,
  exportHtmlDocument,
  exportReadme,
  formatDate,
  publicationLabel,
  toCsv,
  type DataExportState,
  type DataExportStatus,
  type ExportedMedia,
} from '@communeo/core';
import { createZipWriter, publishedSiteDir, type ZipWriter } from '@communeo/pipeline';
import { exportDir, exportPath, removeExportFile } from '../utils/export-dir';
import { log } from '../utils/logger';
import { recordActivity } from './activity-log';
import { notifyTeam } from './team-notifications';
import { notifyAdmins } from './trial';

const SITE = 'api::site.site';
const DAY = 86_400_000;
/** Préparation interrompue (Strapi arrêté) : reprise après ce délai sans nouvelles */
const STALE_RUNNING_MS = 2 * 60 * 60 * 1000;
const DOWNLOAD = { label: "Télécharger l'export", path: '/mon-site/export' };

/** État gardé sur le Site (`data_export`) */
export interface StoredExport {
  status: DataExportStatus;
  requestedAt: string;
  requestedBy: string;
  /** Adresse de la personne qui l'a demandé (prévenue quand l'archive est prête) */
  requestedByEmail?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  /** Nom de l'archive dans le dossier des exports */
  file?: string | null;
  size?: number | null;
  error?: string | null;
}

const stored = (site: any): StoredExport | null => (site?.data_export && typeof site.data_export === 'object' ? site.data_export : null);

export function exportStateOf(site: any): DataExportState {
  const value = stored(site);
  return {
    status: value?.status ?? null,
    requestedAt: value?.requestedAt ?? null,
    requestedBy: value?.requestedBy ?? null,
    finishedAt: value?.finishedAt ?? null,
    expiresAt: value?.status === 'ready' && value.finishedAt ? dataExportExpiry(value.finishedAt).toISOString() : null,
    size: value?.size ?? null,
    error: value?.error ?? null,
  };
}

async function save(site: any, value: StoredExport | null) {
  return strapi.db.query(SITE).update({ where: { documentId: site.documentId }, data: { data_export: value } });
}

const targetOf = (site: any) => ({ type: 'site', id: site.documentId, label: site.name });

/**
 * Demande d'export : la précédente archive est effacée, la préparation commence. Une préparation en
 * cours est gardée telle quelle.
 */
export async function requestExport(site: any, requestedBy: { name: string; email?: string | null }, now: Date = new Date()) {
  const current = stored(site);
  if (dataExportInProgress(current?.status)) return site;
  await removeExportFile(current?.file);
  const updated = await save(site, { status: 'queued', requestedAt: now.toISOString(), requestedBy: requestedBy.name, requestedByEmail: requestedBy.email ?? null });
  await recordActivity({ action: 'data_export', siteDocumentId: site.documentId, target: targetOf(site) });
  log.info(`[EXPORT] ${site.slug} : export demandé par ${requestedBy.name}`);
  startExports();
  return updated;
}

/** Archive prête et pas encore périmée : son chemin sur le disque, sinon null */
export function readyExportFile(site: any, now: Date = new Date()): string | null {
  const value = stored(site);
  if (value?.status !== 'ready' || !value.file || !value.finishedAt) return null;
  if (dataExportExpiry(value.finishedAt).getTime() <= now.getTime()) return null;
  const file = exportPath(value.file);
  return fs.existsSync(file) ? file : null;
}

// Préparation

let running: Promise<void> | null = null;

/** Lance la préparation des exports en attente, sans attendre (une seule boucle à la fois) */
export function startExports(): Promise<void> {
  running ??= processExports().finally(() => {
    running = null;
  });
  return running;
}

/** Au démarrage : une préparation « en cours » a été interrompue par l'arrêt de Strapi, elle repart */
export async function requeueInterruptedExports(): Promise<void> {
  const sites = (await strapi.db.query(SITE).findMany({ where: { data_export: { $notNull: true } } })) as any[];
  for (const site of sites) {
    const value = stored(site);
    if (value?.status !== 'running') continue;
    await removeExportFile(value.file);
    await save(site, { ...value, status: 'queued', startedAt: null });
    log.info(`[EXPORT] ${site.slug} : préparation interrompue, reprise`);
  }
}

/** Exports en attente (et préparations interrompues), un par un */
export async function processExports(now: () => Date = () => new Date()): Promise<void> {
  for (;;) {
    const sites = (await strapi.db.query(SITE).findMany({ where: { data_export: { $notNull: true } } })) as any[];
    const next = sites
      .filter((site) => {
        const value = stored(site);
        if (value?.status === 'queued') return true;
        // Strapi arrêté pendant une préparation : reprise
        return value?.status === 'running' && (!value.startedAt || now().getTime() - new Date(value.startedAt).getTime() > STALE_RUNNING_MS);
      })
      .sort((a, b) => String(stored(a)!.requestedAt).localeCompare(String(stored(b)!.requestedAt)))[0];
    if (!next) return;
    await prepare(next, now());
  }
}

async function prepare(site: any, now: Date) {
  const value = stored(site)!;
  const file = `${site.documentId}-${now.getTime()}.zip`;
  await save(site, { ...value, status: 'running', startedAt: now.toISOString(), file: null, size: null, error: null });
  await fsp.mkdir(exportDir(), { recursive: true });
  const partial = `${exportPath(file)}.partiel`;
  try {
    const started = Date.now();
    const size = await writeArchive(site, partial, now);
    await fsp.rename(partial, exportPath(file));
    const finishedAt = new Date();
    await save(site, { ...value, status: 'ready', startedAt: now.toISOString(), finishedAt: finishedAt.toISOString(), file, size, error: null });
    log.info(`[EXPORT] ${site.slug} : archive prête (${(size / 1024 / 1024).toFixed(1)} Mo en ${Math.round((Date.now() - started) / 1000)} s)`);
    await notifyReady(site, value, finishedAt);
  } catch (error) {
    await fsp.rm(partial, { force: true });
    log.error(`[EXPORT] ${site.slug} : échec de la préparation :`, error);
    await save(site, { ...value, status: 'failed', startedAt: now.toISOString(), finishedAt: new Date().toISOString(), file: null, size: null, error: "L'export n'a pas pu être préparé. Réessayez ; si l'erreur revient, contactez l'équipe Communeo." });
    await notifyTeam(`Export des données en échec : ${site.name}`, `La préparation de l'export des données de ${site.name} a échoué : ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function notifyReady(site: any, value: StoredExport, finishedAt: Date) {
  const until = formatDate(dataExportExpiry(finishedAt));
  const paragraphs = [
    `L'export des données de ${site.name}, demandé par ${value.requestedBy}, est prêt : contenus, fichiers de la médiathèque, données personnelles et site publié, dans une archive ZIP.`,
    `Téléchargez-le depuis l'administration (Mon site › Exporter les données), jusqu'au ${until}. Il contient des données personnelles d'habitants : conservez-le en lieu sûr.`,
  ];
  await notifyAdmins(site, `Export des données de ${site.name} prêt — Communeo`, paragraphs, DOWNLOAD);
  // Demandé par l'équipe Communeo : la personne est prévenue aussi
  const admins = (await strapi.db.query('plugin::users-permissions.user').findMany({
    where: { site: { documentId: site.documentId }, municipality_role: 'admin', active: { $ne: false } },
    select: ['email'],
  })) as any[];
  if (value.requestedByEmail && !admins.some((admin) => admin.email === value.requestedByEmail)) {
    try {
      await strapi.plugin('email').service('email').send({
        to: value.requestedByEmail,
        subject: `Export des données de ${site.name} prêt — Communeo`,
        text: ['Bonjour,', ...paragraphs, "L'équipe Communeo"].join('\n\n'),
      });
    } catch (error) {
      log.error(`[EXPORT] E-mail non envoyé à ${value.requestedByEmail} :`, error);
    }
  }
}

/** Archives périmées effacées ; fichiers orphelins (export abandonné, commune supprimée) aussi */
export async function purgeExports(now: Date = new Date()): Promise<void> {
  const sites = (await strapi.db.query(SITE).findMany({ where: { data_export: { $notNull: true } } })) as any[];
  const kept = new Set<string>();
  for (const site of sites) {
    const value = stored(site);
    if (value?.status === 'ready' && value.finishedAt && dataExportExpiry(value.finishedAt).getTime() <= now.getTime()) {
      await removeExportFile(value.file);
      await save(site, null);
      log.info(`[EXPORT] ${site.slug} : archive effacée (délai de téléchargement passé)`);
      continue;
    }
    if (value?.file) kept.add(value.file);
    // Préparation en cours : sa version partielle est gardée
    if (dataExportInProgress(value?.status)) kept.add(`${site.documentId}-`);
  }
  const names = await fsp.readdir(exportDir()).catch(() => [] as string[]);
  for (const name of names) {
    if (kept.has(name) || [...kept].some((prefix) => prefix.endsWith('-') && name.startsWith(prefix))) continue;
    const stat = await fsp.stat(path.join(exportDir(), name)).catch(() => null);
    if (stat && now.getTime() - stat.mtimeMs > DAY) await fsp.rm(path.join(exportDir(), name), { force: true });
  }
}


// Archive

const SITE_POPULATE = {
  logo: true,
  favicon: true,
  mentions_legales: true,
  rgpd: true,
  accessibilite: true,
  infos_pratiques: true,
  social_links: true,
  homepage: {
    populate: {
      hero: { populate: ['image'] },
      quick_links: { populate: ['items'] },
      featured_news: true,
      agenda: true,
      mayor_word: { populate: ['photo'] },
      key_figures: { populate: ['items'] },
      practical_info: true,
      weather: true,
      waste_collection: true,
      disruptions: true,
      canteen: true,
      associations: true,
      partners: { populate: { items: { populate: ['logo'] } } },
      newsletter: true,
      free_content: true,
    },
  },
};

/** Champs du Site qui ne sont pas des données de la commune (technique, hébergeur, facturation) */
const SITE_TECHNICAL = new Set([
  'id',
  'netlify_site_id',
  'data_export',
  'deletion_scheduled_at',
  'deletion_requested_by',
  'deletion_reminded',
  'billing_renewal',
  'trial_notice',
  'live_requested_by',
  'signup_approval',
  'suspended',
  'onboarding',
  'seo_checklist',
  'createdBy',
  'updatedBy',
  'localizations',
  'locale',
]);

/** Clés techniques retirées partout (identifiants internes, relations, auteurs Strapi) */
const DROPPED = new Set(['id', 'site', 'createdBy', 'updatedBy', 'localizations', 'locale', 'unsubscribe_token']);

const isMedia = (value: any) => value && typeof value === 'object' && typeof value.url === 'string' && typeof value.mime === 'string' && 'hash' in value;

const safeName = (name: string) =>
  name
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'fichier';

/** Fichiers de la commune rangés dans `fichiers/` : un chemin par fichier, quel que soit le nombre d'usages */
class MediaRegistry {
  readonly entries = new Map<number, { file: any; archivePath: string; folder: string | null; uploadedBy: string | null; addedAt: string | null; found: boolean }>();

  constructor(private readonly root: string) {}

  register(file: any, extra: { folder?: string | null; uploadedBy?: string | null; addedAt?: string | null } = {}) {
    if (!isMedia(file)) return null;
    let entry = this.entries.get(file.id);
    if (!entry) {
      const found = !!diskPath(file, this.root) && fs.existsSync(diskPath(file, this.root)!);
      entry = { file, archivePath: `fichiers/${file.id}-${safeName(file.name ?? `${file.hash}${file.ext ?? ''}`)}`, folder: extra.folder ?? null, uploadedBy: extra.uploadedBy ?? null, addedAt: extra.addedAt ?? file.createdAt ?? null, found };
      this.entries.set(file.id, entry);
    }
    return entry;
  }

  /** Description d'un fichier dans les JSON */
  describe(file: any) {
    const entry = this.register(file);
    if (!entry) return null;
    return {
      fichier: entry.found ? entry.archivePath : null,
      nom: file.name ?? null,
      texteAlternatif: file.alternativeText ?? null,
      legende: file.caption ?? null,
      type: file.mime ?? null,
      taille: file.size != null ? Math.round(Number(file.size) * 1024) : null,
    };
  }

  /** Lien vers le fichier depuis une page HTML de `contenus/<dossier>/` */
  html(file: any): ExportedMedia | null {
    const entry = this.register(file);
    if (!entry || !entry.found) return null;
    return { href: `../../${entry.archivePath}`, name: file.name ?? entry.archivePath, alt: file.alternativeText ?? null, mime: file.mime ?? null };
  }
}

/** Fichier local du fournisseur d'upload (`/uploads/x.jpg` → public/uploads/x.jpg) */
function diskPath(file: any, root: string): string | null {
  if (typeof file?.url !== 'string' || !file.url.startsWith('/uploads/')) return null;
  const resolved = path.join(root, file.url);
  return resolved.startsWith(path.join(root, 'uploads')) ? resolved : null;
}

/** Document Strapi → JSON de l'archive : identifiants internes retirés, fichiers décrits */
function clean(value: any, media: MediaRegistry): any {
  if (Array.isArray(value)) return value.map((item) => clean(item, media));
  if (isMedia(value)) return media.describe(value);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  const out: Record<string, any> = {};
  for (const [key, child] of Object.entries(value)) {
    if (DROPPED.has(key)) continue;
    out[key] = clean(child, media);
  }
  return out;
}

const bySite = (site: any) => ({ site: { documentId: { $eq: site.documentId } } });

/** Toutes les entrées d'un type pour la commune (par paquets de 200) */
async function all(uid: string, site: any, params: Record<string, unknown> = {}): Promise<any[]> {
  const items: any[] = [];
  for (let start = 0; ; start += 200) {
    const page = await strapi.documents(uid as any).findMany({ ...params, filters: { ...bySite(site), ...((params.filters as object) ?? {}) }, start, limit: 200 } as any);
    items.push(...(page as any[]));
    if ((page as any[]).length < 200) return items;
  }
}

/** Contenus à brouillon et publication : la dernière version, son statut, et la version en ligne si elle diffère */
async function withPublication(uid: string, site: any, populate: unknown, media: MediaRegistry) {
  const drafts = await all(uid, site, { status: 'draft', populate });
  const published = new Map((await all(uid, site, { status: 'published', populate })).map((doc) => [doc.documentId, doc]));
  return drafts.map((draft) => {
    const online = published.get(draft.documentId) ?? null;
    const statut = publicationLabel(draft, online);
    return {
      draft,
      json: {
        ...clean(draft, media),
        publishedAt: online?.publishedAt ?? null,
        statut,
        publicationProgrammee: draft.scheduled_at ?? null,
        ...(statut === 'publié, modifications en brouillon' ? { versionEnLigne: clean(online, media) } : {}),
      },
    };
  });
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Page HTML par contenu (`contenus/pages/<slug>.html`) */
function addHtmlPages(zip: ZipWriter, folder: string, site: any, items: Array<{ draft: any; json: any }>, media: MediaRegistry, describe: (doc: any) => { lead?: string | null; details: string[] }) {
  const used = new Set<string>();
  for (const { draft, json: entry } of items) {
    let name = safeName(draft.slug || draft.documentId).replace(/\s/g, '-');
    if (used.has(name)) name = `${name}-${draft.documentId}`;
    used.add(name);
    const { lead, details } = describe(draft);
    zip.addText(
      `contenus/${folder}/${name}.html`,
      exportHtmlDocument({ title: draft.title ?? name, communeName: site.name, lead, details: [`Statut : ${entry.statut}`, ...details], body: blocksToHtml(draft.blocks, (file) => media.html(file)) }),
    );
  }
}

const dateLabel = (value: unknown) => (value ? formatDate(value as string) : '');

/** Écrit l'archive de la commune dans `file` ; renvoie sa taille en octets */
export async function writeArchive(site: any, file: string, now: Date = new Date()): Promise<number> {
  const root = strapi.dirs.static.public;
  const media = new MediaRegistry(root);
  const zip = createZipWriter(file);
  try {
    // Médiathèque d'abord : son dossier et la personne qui a ajouté chaque fichier
    const library = await all('api::media-item.media-item', site, { populate: ['file'] });
    for (const item of library) {
      media.register(item.file, { folder: item.folder ?? null, uploadedBy: item.uploaded_by_name ?? null, addedAt: item.createdAt ?? null });
    }

    const settings = await strapi.documents(SITE).findOne({ documentId: site.documentId, populate: SITE_POPULATE as any });
    const siteJson = Object.fromEntries(Object.entries(clean(settings ?? {}, media)).filter(([key]) => !SITE_TECHNICAL.has(key)));
    zip.addText('contenus/reglages-du-site.json', json(siteJson));

    const blocks = { blocks: { populate: '*' } };
    const pages = await withPublication('api::page.page', site, { featured_image: true, ...blocks }, media);
    const articles = await withPublication('api::article.article', site, { image: true, ...blocks }, media);
    const events = await withPublication('api::evenement.evenement', site, { image: true, ...blocks }, media);
    const documents = await withPublication('api::official-document.official-document', site, ['file', 'additional_files'], media);
    zip.addText('contenus/pages.json', json(pages.map((item) => item.json)));
    zip.addText('contenus/actualites.json', json(articles.map((item) => item.json)));
    zip.addText('contenus/evenements.json', json(events.map((item) => item.json)));
    zip.addText('contenus/documents-officiels.json', json(documents.map((item) => item.json)));
    addHtmlPages(zip, 'pages', site, pages, media, (doc) => ({ lead: doc.lead, details: [] }));
    addHtmlPages(zip, 'actualites', site, articles, media, (doc) => ({ lead: doc.summary, details: [dateLabel(doc.publication_date)] }));
    addHtmlPages(zip, 'evenements', site, events, media, (doc) => ({ details: [dateLabel(doc.start_date), doc.location ?? ''] }));

    const alerts = await all('api::alerte.alerte', site);
    const team = await all('api::team-member.team-member', site, { populate: ['photo'] });
    const associations = await all('api::association.association', site, { populate: ['logo'] });
    const canteen = await all('api::school-menu.school-menu', site, { populate: ['meals', 'menu_image', 'menu_pdf'] });
    const waste = await all('api::waste-schedule.waste-schedule', site);
    const redirects = await all('api::redirect.redirect', site);
    zip.addText('contenus/alertes.json', json(clean(alerts, media)));
    zip.addText('contenus/equipe-municipale.json', json(clean(team, media)));
    zip.addText('contenus/associations.json', json(clean(associations, media)));
    zip.addText('contenus/menus-cantine.json', json(clean(canteen, media)));
    zip.addText('contenus/collectes.json', json(clean(waste, media)));
    zip.addText('contenus/redirections.json', json(clean(redirects, media)));

    // Données personnelles
    const messages = await all('api::contact-submission.contact-submission', site, { populate: ['attachments'], sort: ['createdAt:asc'] });
    const attachmentPaths = new Map<string, string[]>();
    for (const message of messages) {
      const paths: string[] = [];
      for (const attachment of message.attachments ?? []) {
        const source = diskPath(attachment, root);
        if (!source || !fs.existsSync(source)) continue;
        const name = `donnees-personnelles/messages-pieces-jointes/${safeName(message.reference_number || message.documentId)}/${attachment.id}-${safeName(attachment.name ?? 'piece-jointe')}`;
        zip.addFile(name, source);
        paths.push(name);
      }
      attachmentPaths.set(message.documentId, paths);
    }
    zip.addText(
      'donnees-personnelles/messages.csv',
      toCsv(
        [
          { label: 'Référence', value: (m: any) => m.reference_number },
          { label: 'Reçu le', value: (m: any) => m.createdAt },
          { label: 'Prénom', value: (m: any) => m.first_name },
          { label: 'Nom', value: (m: any) => m.last_name },
          { label: 'E-mail', value: (m: any) => m.email },
          { label: 'Téléphone', value: (m: any) => m.phone },
          { label: 'Catégorie', value: (m: any) => m.category },
          { label: 'Objet', value: (m: any) => m.subject },
          { label: 'Message', value: (m: any) => m.message },
          { label: 'Statut', value: (m: any) => m.status },
          { label: 'Ouvert le', value: (m: any) => m.opened_at },
          { label: 'Réponse', value: (m: any) => m.response },
          { label: 'Répondu le', value: (m: any) => m.responded_at },
          { label: 'Pièces jointes', value: (m: any) => (attachmentPaths.get(m.documentId) ?? []).join(' | ') },
          { label: 'Historique', value: (m: any) => m.history },
        ],
        messages,
      ),
    );
    const subscribers = await all('api::newsletter-subscriber.newsletter-subscriber', site, { sort: ['subscribed_at:asc'] });
    zip.addText(
      'donnees-personnelles/abonnes-lettre.csv',
      toCsv(
        [
          { label: 'E-mail', value: (s: any) => s.email },
          { label: 'Prénom', value: (s: any) => s.first_name },
          { label: 'Nom', value: (s: any) => s.last_name },
          { label: 'Inscrit le', value: (s: any) => s.subscribed_at },
          { label: 'Actif', value: (s: any) => (s.active === false ? 'non' : 'oui') },
          { label: 'Désinscrit le', value: (s: any) => s.unsubscribed_at },
        ],
        subscribers,
      ),
    );
    zip.addText(
      'donnees-personnelles/associations.csv',
      toCsv(
        [
          { label: 'Nom', value: (a: any) => a.name },
          { label: 'Catégorie', value: (a: any) => a.category },
          { label: 'Description', value: (a: any) => a.description },
          { label: 'Contact', value: (a: any) => a.contact_name },
          { label: 'E-mail', value: (a: any) => a.contact_email },
          { label: 'Téléphone', value: (a: any) => a.contact_phone },
          { label: 'Site internet', value: (a: any) => a.website },
          { label: 'Adresse', value: (a: any) => a.address },
          { label: 'Statut', value: (a: any) => a.status },
          { label: 'Proposée par', value: (a: any) => a.submission_source },
          { label: 'Nom du déposant', value: (a: any) => a.submitted_by_name },
          { label: 'E-mail du déposant', value: (a: any) => a.submitted_by_email },
          { label: 'Examinée le', value: (a: any) => a.reviewed_at },
          { label: 'Motif du refus', value: (a: any) => a.rejection_reason },
          { label: 'Créée le', value: (a: any) => a.createdAt },
        ],
        associations,
      ),
    );

    // Fichiers : ceux de la médiathèque et tous ceux que les contenus citent
    let missing = 0;
    for (const entry of media.entries.values()) {
      if (entry.found) zip.addFile(entry.archivePath, diskPath(entry.file, root)!);
      else missing += 1;
    }
    zip.addText(
      'fichiers/index.csv',
      toCsv(
        [
          { label: 'Fichier', value: (e: any) => (e.found ? e.archivePath : 'introuvable sur le serveur') },
          { label: 'Nom', value: (e: any) => e.file.name },
          { label: 'Dossier', value: (e: any) => e.folder },
          { label: 'Texte alternatif', value: (e: any) => e.file.alternativeText },
          { label: 'Légende', value: (e: any) => e.file.caption },
          { label: 'Type', value: (e: any) => e.file.mime },
          { label: 'Taille (octets)', value: (e: any) => (e.file.size != null ? Math.round(Number(e.file.size) * 1024) : null) },
          { label: 'Ajouté le', value: (e: any) => e.addedAt },
          { label: 'Ajouté par', value: (e: any) => e.uploadedBy },
        ],
        [...media.entries.values()],
      ),
    );

    // Site publié : servi depuis le volume `sites` (Bunny, Caddy) ; chez Netlify, rien sur le serveur
    const siteDir = publishedSiteDir(site.slug);
    const realSiteDir = siteDir ? await fsp.realpath(siteDir).catch(() => null) : null;
    const hasSite = !!realSiteDir && fs.existsSync(path.join(realSiteDir, 'index.html'));
    if (hasSite) zip.addDirectory(realSiteDir!, 'site-publie', (name) => name === '.regles' || name.startsWith('.regles/'));

    zip.addText(
      'LISEZMOI.md',
      exportReadme({
        communeName: site.name,
        generatedAt: now,
        publishedSite: hasSite
          ? { included: true }
          : { included: false, reason: siteDir ? "le site n'a pas encore été mis en ligne." : "il est hébergé chez un prestataire extérieur ; l'équipe Communeo peut vous le fournir sur demande." },
        counts: {
          pages: pages.length,
          articles: articles.length,
          events: events.length,
          documents: documents.length,
          alerts: alerts.length,
          team: team.length,
          associations: associations.length,
          canteen: canteen.length,
          waste: waste.length,
          redirects: redirects.length,
          files: media.entries.size - missing,
          messages: messages.length,
          subscribers: subscribers.length,
        },
        missingFiles: missing,
      }),
    );
    return await zip.finalize();
  } catch (error) {
    zip.abort();
    throw error;
  }
}

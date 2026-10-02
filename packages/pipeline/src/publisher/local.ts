/**
 * Publication dans un dossier local (`PUBLISH_DIR/<slug>/`) : développement sans hébergeur, tests de la
 * stack, et origine des sites servie par Caddy sur le serveur (#381, volume `sites`). Chaque site reçoit
 * ses règles (`.regles/site.caddy` : redirections, noindex, voir `caddy.ts`) ; avec `caddyAdminUrl`,
 * Caddy est rechargé après la publication. Pas de domaine personnalisé.
 *
 * Remplacement sans trou (#387) : `<slug>` est un lien symbolique vers une version complète du site
 * (`.versions/<slug>-<horodatage>`). Une publication écrit la nouvelle version à côté, puis remplace le
 * lien d'un seul `rename` (atomique) : chaque requête voit l'ancienne version ou la nouvelle, jamais un
 * dossier absent (deux renommages de dossiers laissaient quelques millisecondes de 404 entre eux).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { consoleLogger, type Logger } from '../logger';
import { CADDY_RULES_DIR, CADDY_RULES_FILE, caddySiteRules, reloadCaddy } from './caddy';
import type { DeployStatus, HostSite, PublisherSite, PublishResult, SitePublisher } from './types';

/** Versions des sites (celle du lien `<slug>` est servie), hors des adresses des sites (`hide` dans Caddy) */
export const VERSIONS_DIR = '.versions';
/** Copies des publications d'avant #387 : leurs restes sont effacés à la publication suivante du site */
const LEGACY_STAGING_DIR = '.staging';

export interface LocalPublisherOptions {
  /** Dossier racine des sites publiés */
  root: string;
  /** Adresse http(s) sous laquelle `root` est servi (défaut : http://localhost:8080) */
  baseUrl?: string;
  /** API d'administration de Caddy (ex. http://caddy:2019) : rechargé après chaque publication */
  caddyAdminUrl?: string;
  fetch?: typeof fetch;
  logger?: Logger;
}

export class LocalPublisher implements SitePublisher {
  readonly id = 'local';
  readonly configured = true;
  private readonly log: Logger;

  constructor(private readonly options: LocalPublisherOptions) {
    this.log = options.logger ?? consoleLogger;
  }

  async ensureSite(site: PublisherSite): Promise<HostSite> {
    await fs.mkdir(this.dir(site), { recursive: true });
    return this.hostSite(site);
  }

  async publish(site: PublisherSite, dir: string, options: { onUploaded?: () => Promise<void> | void } = {}): Promise<PublishResult> {
    const host = this.hostSite(site);
    const target = this.dir(site);
    const versions = path.join(this.options.root, VERSIONS_DIR);
    await fs.mkdir(versions, { recursive: true });
    const live = await liveVersion(target);
    // Restes d'une publication interrompue (worker arrêté en cours de copie), jamais la version servie
    await this.removeVersions(site.slug, (name) => name !== live);

    let stamp = Date.now();
    // Deux publications dans la même milliseconde (tests) : jamais le nom de la version servie
    if (`${site.slug}-${stamp}` === live) stamp += 1;
    const name = `${site.slug}-${stamp}`;
    const next = path.join(versions, name);
    // Copie complète avec ses règles, puis remplacement du lien : le site précédent reste servi jusque-là
    await fs.cp(dir, next, { recursive: true });
    const rules = caddySiteRules({
      slug: site.slug,
      noindex: site.noindex,
      redirects: site.redirects,
      files: new Set(await listFiles(next)),
    });
    if (rules.skipped.length) {
      this.log.warn(`[PUBLICATION] ${site.slug} : ${rules.skipped.length} redirection(s) écartée(s), caractères non pris en charge :`, rules.skipped.map((rule) => rule.from));
    }
    await fs.mkdir(path.join(next, CADDY_RULES_DIR), { recursive: true });
    await fs.writeFile(path.join(next, CADDY_RULES_DIR, CADDY_RULES_FILE), rules.content, 'utf8');

    // Site publié avant #387 (ou créé vide par ensureSite) : un vrai dossier, qu'un lien ne remplace pas
    // d'un coup. Mis de côté juste avant de poser le lien, une seule fois par site.
    const folder = live === null && (await isDirectory(target)) ? path.join(versions, `${name}-precedent`) : null;
    if (folder) await fs.rename(target, folder);
    await pointTo(target, name);
    try {
      await this.reload();
    } catch (error) {
      // Règles refusées ou Caddy injoignable : la version précédente est remise en place
      if (live) await pointTo(target, live);
      else {
        await fs.rm(target, { force: true });
        if (folder) await fs.rename(folder, target);
      }
      await fs.rm(next, { recursive: true, force: true });
      await this.reload().catch(() => undefined);
      throw error;
    }
    if (live) await fs.rm(path.join(versions, live), { recursive: true, force: true });
    if (folder) await fs.rm(folder, { recursive: true, force: true });
    await options.onUploaded?.();
    return { ...host, deployId: `local-${stamp}`, state: 'ready' };
  }

  async status(): Promise<DeployStatus> {
    return { state: 'ready' };
  }

  async deleteSite(site: PublisherSite): Promise<void> {
    // Le lien (ou le dossier d'avant #387), puis toutes les versions du site
    await fs.rm(this.dir(site), { recursive: true, force: true });
    await this.removeVersions(site.slug);
    // Les règles du site disparaissent au prochain rechargement : un échec ici n'empêche pas la suppression
    await this.reload().catch((error) => this.log.warn(`[PUBLICATION] Caddy non rechargé après la suppression de ${site.slug} :`, error));
  }

  configureDomain = unsupported;
  dnsInstructions = unsupported;
  verifyDomain = unsupported;
  removeDomain = unsupported;

  async certificateStatus(): Promise<null> {
    return null;
  }

  private hostSite(site: PublisherSite): HostSite {
    // Adresse http(s) obligatoire : c'est l'adresse canonique du site construit
    const base = (this.options.baseUrl || 'http://localhost:8080').replace(/\/$/, '');
    return { hostId: site.slug, defaultUrl: `${base}/${site.slug}` };
  }

  /** Versions du site (et restes de l'ancien dossier `.staging`), sauf celles que `remove` écarte */
  private async removeVersions(slug: string, remove: (name: string) => boolean = () => true): Promise<void> {
    const own = new RegExp(`^${slug}-\\d+(-precedent|\\.lien)?$`);
    for (const parent of [VERSIONS_DIR, LEGACY_STAGING_DIR]) {
      const dir = path.join(this.options.root, parent);
      for (const name of await fs.readdir(dir).catch(() => [] as string[])) {
        if (own.test(name) && remove(name)) await fs.rm(path.join(dir, name), { recursive: true, force: true });
      }
    }
  }

  private async reload(): Promise<void> {
    if (this.options.caddyAdminUrl) await reloadCaddy(this.options.caddyAdminUrl, { fetch: this.options.fetch });
  }

  private dir(site: PublisherSite): string {
    if (!/^[a-z0-9-]+$/.test(site.slug)) throw new Error(`Slug invalide : ${site.slug}`);
    return path.join(this.options.root, site.slug);
  }
}

/**
 * Fait pointer `target` vers la version `name` d'un seul `rename` : le nouveau lien est créé dans
 * `.versions` puis déplacé sur l'ancien. Chemin relatif : le même lien sert au worker, à Strapi et à
 * Caddy, quel que soit l'endroit où ils montent le volume.
 */
async function pointTo(target: string, name: string): Promise<void> {
  const link = path.join(path.dirname(target), VERSIONS_DIR, `${name}.lien`);
  await fs.rm(link, { force: true });
  await fs.symlink(path.join(VERSIONS_DIR, name), link);
  await fs.rename(link, target);
}

/** Version servie (son nom dans `.versions`) quand `target` est un lien, sinon null */
async function liveVersion(target: string): Promise<string | null> {
  const link = await fs.readlink(target).catch(() => null);
  return link === null ? null : path.basename(link);
}

async function isDirectory(target: string): Promise<boolean> {
  return fs.lstat(target).then(
    (stat) => stat.isDirectory(),
    () => false,
  );
}

async function unsupported(): Promise<never> {
  throw new Error("Les domaines personnalisés ne sont pas gérés par la publication locale");
}

/** Fichiers d'un dossier, chemins relatifs avec des `/` */
async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
}

/**
 * Publication dans un dossier local (`PUBLISH_DIR/<slug>/`) : développement sans hébergeur, tests de la
 * stack, et origine des sites servie par Caddy sur le serveur (#381, volume `sites`). Chaque site reçoit
 * ses règles (`.regles/site.caddy` : redirections, noindex, voir `caddy.ts`) ; avec `caddyAdminUrl`,
 * Caddy est rechargé après la publication. Pas de domaine personnalisé.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { consoleLogger, type Logger } from '../logger';
import { CADDY_RULES_DIR, CADDY_RULES_FILE, caddySiteRules, reloadCaddy } from './caddy';
import type { DeployStatus, HostSite, PublisherSite, PublishResult, SitePublisher } from './types';

/** Dossier des copies en cours et des versions remplacées, hors des dossiers des sites (`hide` dans Caddy) */
export const STAGING_DIR = '.staging';

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
    // Adresse http(s) obligatoire : c'est l'adresse canonique du site construit
    const base = (this.options.baseUrl || 'http://localhost:8080').replace(/\/$/, '');
    return { hostId: site.slug, defaultUrl: `${base}/${site.slug}` };
  }

  async publish(site: PublisherSite, dir: string, options: { onUploaded?: () => Promise<void> | void } = {}): Promise<PublishResult> {
    const host = await this.ensureSite(site);
    const target = this.dir(site);
    const staging = path.join(this.options.root, STAGING_DIR);
    await fs.mkdir(staging, { recursive: true });
    // Restes d'une publication interrompue (worker arrêté en cours de copie)
    const leftover = new RegExp(`^${site.slug}-\\d+(-precedent)?$`);
    for (const name of await fs.readdir(staging)) {
      if (leftover.test(name)) await fs.rm(path.join(staging, name), { recursive: true, force: true });
    }
    const stamp = Date.now();
    const next = path.join(staging, `${site.slug}-${stamp}`);
    const previous = path.join(staging, `${site.slug}-${stamp}-precedent`);

    // Copie complète avec ses règles, puis échange : le site précédent reste servi jusque-là
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

    const replaced = await fs.rename(target, previous).then(
      () => true,
      () => false,
    );
    await fs.rename(next, target);
    try {
      await this.reload();
    } catch (error) {
      // Règles refusées ou Caddy injoignable : la version précédente est remise en place
      await fs.rm(target, { recursive: true, force: true });
      if (replaced) await fs.rename(previous, target);
      await this.reload().catch(() => undefined);
      throw error;
    }
    await fs.rm(previous, { recursive: true, force: true });
    await options.onUploaded?.();
    return { ...host, deployId: `local-${stamp}`, state: 'ready' };
  }

  async status(): Promise<DeployStatus> {
    return { state: 'ready' };
  }

  async deleteSite(site: PublisherSite): Promise<void> {
    await fs.rm(this.dir(site), { recursive: true, force: true });
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

  private async reload(): Promise<void> {
    if (this.options.caddyAdminUrl) await reloadCaddy(this.options.caddyAdminUrl, { fetch: this.options.fetch });
  }

  private dir(site: PublisherSite): string {
    if (!/^[a-z0-9-]+$/.test(site.slug)) throw new Error(`Slug invalide : ${site.slug}`);
    return path.join(this.options.root, site.slug);
  }
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

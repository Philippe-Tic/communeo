/**
 * Publication dans un dossier local (`PUBLISH_DIR/<slug>/`) : développement sans hébergeur,
 * et base d'un futur adaptateur « VPS + serveur web ». Pas de domaine personnalisé.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { DeployStatus, HostSite, PublisherSite, PublishResult, SitePublisher } from './types';

export interface LocalPublisherOptions {
  /** Dossier racine des sites publiés */
  root: string;
  /** Adresse http(s) sous laquelle `root` est servi (défaut : http://localhost:8080) */
  baseUrl?: string;
}

export class LocalPublisher implements SitePublisher {
  readonly id = 'local';
  readonly configured = true;

  constructor(private readonly options: LocalPublisherOptions) {}

  async ensureSite(site: PublisherSite): Promise<HostSite> {
    await fs.mkdir(this.dir(site), { recursive: true });
    // Adresse http(s) obligatoire : c'est l'adresse canonique du site construit
    const base = (this.options.baseUrl || 'http://localhost:8080').replace(/\/$/, '');
    return { hostId: site.slug, defaultUrl: `${base}/${site.slug}` };
  }

  async publish(site: PublisherSite, dir: string): Promise<PublishResult> {
    const host = await this.ensureSite(site);
    // Remplacement en deux temps : le site précédent reste en place jusqu'à la copie complète
    const target = this.dir(site);
    const next = `${target}.next-${Date.now()}`;
    await fs.cp(dir, next, { recursive: true });
    await fs.rm(target, { recursive: true, force: true });
    await fs.rename(next, target);
    return { ...host, deployId: `local-${Date.now()}`, state: 'ready' };
  }

  async status(): Promise<DeployStatus> {
    return { state: 'ready' };
  }

  async deleteSite(site: PublisherSite): Promise<void> {
    await fs.rm(this.dir(site), { recursive: true, force: true });
  }

  configureDomain = unsupported;
  dnsInstructions = unsupported;
  verifyDomain = unsupported;
  removeDomain = unsupported;

  async certificateStatus(): Promise<null> {
    return null;
  }

  private dir(site: PublisherSite): string {
    if (!/^[a-z0-9-]+$/.test(site.slug)) throw new Error(`Slug invalide : ${site.slug}`);
    return path.join(this.options.root, site.slug);
  }
}

async function unsupported(): Promise<never> {
  throw new Error("Les domaines personnalisés ne sont pas gérés par la publication locale");
}

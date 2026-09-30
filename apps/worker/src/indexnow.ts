/**
 * IndexNow (#336) : à chaque mise en ligne réussie, les adresses nouvelles, modifiées ou retirées du
 * site sont signalées aux moteurs qui l'acceptent (Bing, Yandex, Seznam… ; Google n'utilise pas
 * IndexNow). Rien à configurer : la clé est dérivée du secret du worker, et son fichier (`<clé>.txt`)
 * est déposé à la racine de chaque site avec les pages.
 *
 * Adresses changées : plan du site construit comparé à celui en ligne avant la publication (nouvelles
 * adresses, `lastmod` différent, adresses disparues) ; l'accueil suit dès qu'une page a changé. Jamais
 * pour un site en préparation, ni sur une adresse technique (netlify.app, localhost). Un échec est
 * consigné, il n'arrête jamais la mise en ligne.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from '@communeo/pipeline';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10_000;
const TIMEOUT_MS = 10_000;

export interface IndexNow {
  key: string;
  /** Avant la publication : dépose le fichier de la clé, lit le plan du site en ligne */
  prepare(outDir: string, siteUrl: string, noindex: boolean): Promise<Prepared | null>;
  /** Après la publication réussie : signale les adresses changées */
  submit(prepared: Prepared): Promise<void>;
}

export interface Prepared {
  siteUrl: string;
  urls: string[];
}

/** Clé IndexNow (32 caractères hexadécimaux), la même pour tous les sites, sans rien révéler du secret */
export const indexNowKey = (secret: string) => crypto.createHash('sha256').update(`${secret}:indexnow`).digest('hex').slice(0, 32);

/** Entrées d'un plan du site : adresse → date de modification (vide si absente) */
export function sitemapEntries(xml: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(block!)?.[1];
    if (loc) entries.set(loc.replace(/&amp;/g, '&'), /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i.exec(block!)?.[1] ?? '');
  }
  return entries;
}

/** Adresses à signaler : nouvelles, modifiées ou retirées ; l'accueil dès qu'une a changé */
export function changedUrls(previous: Map<string, string> | null, next: Map<string, string>, home: string): string[] {
  if (!previous) return [...next.keys()];
  const changed = new Set<string>();
  for (const [url, lastmod] of next) if (!previous.has(url) || previous.get(url) !== lastmod) changed.add(url);
  for (const url of previous.keys()) if (!next.has(url)) changed.add(url);
  if (changed.size && next.has(home)) changed.add(home);
  return [...changed];
}

/** Adresse technique ou locale : rien à signaler aux moteurs */
const technicalHost = (host: string) => /(^|\.)(netlify\.app|localhost|test|invalid|local)$/.test(host) || /^[\d.:]+$/.test(host);

export function createIndexNow(options: { secret: string; logger: Logger; fetch?: typeof fetch }): IndexNow {
  const key = indexNowKey(options.secret);
  const request = options.fetch ?? fetch;
  const log = options.logger;

  return {
    key,

    async prepare(outDir, siteUrl, noindex) {
      let host: string;
      try {
        host = new URL(siteUrl).hostname;
      } catch {
        return null;
      }
      if (noindex || technicalHost(host)) return null;
      await fs.writeFile(path.join(outDir, `${key}.txt`), key, 'utf8');
      const next = sitemapEntries(await fs.readFile(path.join(outDir, 'sitemap.xml'), 'utf8').catch(() => ''));
      // Plan du site encore en ligne : la version d'avant cette publication (absent la première fois)
      const previous = await request(`${siteUrl}/sitemap.xml`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        .then(async (response) => (response.ok ? sitemapEntries(await response.text()) : null))
        .catch(() => null);
      const urls = changedUrls(previous && previous.size ? previous : null, next, `${siteUrl}/`).slice(0, MAX_URLS);
      return urls.length ? { siteUrl, urls } : null;
    },

    async submit({ siteUrl, urls }) {
      try {
        const response = await request(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ host: new URL(siteUrl).hostname, key, keyLocation: `${siteUrl}/${key}.txt`, urlList: urls }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.ok) log.info(`[INDEXNOW] ${urls.length} adresse${urls.length > 1 ? 's' : ''} signalée${urls.length > 1 ? 's' : ''} pour ${siteUrl}`);
        else log.warn(`[INDEXNOW] ${siteUrl} : réponse ${response.status}`);
      } catch (error) {
        log.warn(`[INDEXNOW] ${siteUrl} : non signalé (${error instanceof Error ? error.message : String(error)})`);
      }
    },
  };
}

/**
 * IndexNow : clé dérivée du secret, adresses changées d'après les plans du site, envoi après une
 * publication réussie seulement, jamais pour un site en préparation ni une adresse technique.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BuildJob, SitePublisher } from '@communeo/pipeline';
import { processBuild } from '../src/build';
import { changedUrls, createIndexNow, indexNowKey, sitemapEntries } from '../src/indexnow';

const silent = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const sitemap = (entries: Array<[string, string?]>) =>
  `<urlset>${entries.map(([loc, lastmod]) => `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('')}</urlset>`;

describe('adresses changées', () => {
  it('nouvelles, modifiées, retirées ; l’accueil suit', () => {
    const before = sitemapEntries(sitemap([['https://x.fr/'], ['https://x.fr/a', '2026-09-01'], ['https://x.fr/b', '2026-09-01'], ['https://x.fr/old']]));
    const after = sitemapEntries(sitemap([['https://x.fr/'], ['https://x.fr/a', '2026-09-01'], ['https://x.fr/b', '2026-09-29'], ['https://x.fr/new']]));
    expect(changedUrls(before, after, 'https://x.fr/').sort()).toEqual(['https://x.fr/', 'https://x.fr/b', 'https://x.fr/new', 'https://x.fr/old']);
    expect(changedUrls(after, after, 'https://x.fr/')).toEqual([]);
    expect(changedUrls(null, after, 'https://x.fr/')).toHaveLength(4);
  });

  it('clé : 32 caractères hexadécimaux, stable', () => {
    expect(indexNowKey('secret')).toMatch(/^[0-9a-f]{32}$/);
    expect(indexNowKey('secret')).toBe(indexNowKey('secret'));
  });
});

describe('dans une mise en ligne', () => {
  let workDir: string;
  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indexnow-'));
  });
  afterEach(() => fs.rmSync(workDir, { recursive: true, force: true }));

  function run(site: { customDomain: string | null; noindex?: boolean }, state: 'ready' | 'building' = 'ready') {
    const calls: Array<{ url: string; body?: unknown }> = [];
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.endsWith('/sitemap.xml')) return new Response(sitemap([['https://mairie-lyon.fr/'], ['https://mairie-lyon.fr/contact', '2026-09-01']]));
      return new Response(null, { status: 202 });
    }) as unknown as typeof globalThis.fetch;
    let published: string[] = [];
    const publisher = {
      ensureSite: async () => ({ hostId: 'h', defaultUrl: 'https://lyon-mairie.netlify.app' }),
      publish: async (_site: unknown, dir: string) => {
        published = fs.readdirSync(dir);
        return { hostId: 'h', defaultUrl: 'https://lyon-mairie.netlify.app', deployId: 'd', state };
      },
    } as unknown as SitePublisher;
    const job = { id: 'j', data: { siteDocumentId: 's', triggeredBy: null, reason: 'manual' }, signal: new AbortController().signal, retryCount: 0, retryLimit: 0 } as unknown as BuildJob;
    const done = processBuild(job, {
      strapi: {
        start: async () => ({ deploymentId: 'dep', site: { documentId: 's', slug: 'lyon', name: 'Lyon', theme: 'institutionnel', hostId: 'h', ...site } }),
        progress: async () => {},
        finish: async () => {},
      },
      renderer: {
        build: async ({ outDir }) => {
          fs.writeFileSync(path.join(outDir, 'index.html'), '<h1>Lyon</h1>');
          fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap([['https://mairie-lyon.fr/'], ['https://mairie-lyon.fr/contact', '2026-09-29'], ['https://mairie-lyon.fr/agenda']]));
        },
      },
      publisher,
      workDir,
      timeoutSeconds: 60,
      logger: silent,
      indexNow: createIndexNow({ secret: 'secret', logger: silent, fetch }),
    });
    return { done, calls, published: () => published };
  }

  it('dépose la clé avec les pages, puis signale les adresses changées au domaine de la commune', async () => {
    const { done, calls, published } = run({ customDomain: 'mairie-lyon.fr' });
    await done;
    const key = indexNowKey('secret');
    expect(published()).toContain(`${key}.txt`);
    const submitted = calls.find((call) => call.url === 'https://api.indexnow.org/indexnow');
    expect(submitted?.body).toEqual({
      host: 'mairie-lyon.fr',
      key,
      keyLocation: `https://mairie-lyon.fr/${key}.txt`,
      urlList: expect.arrayContaining(['https://mairie-lyon.fr/contact', 'https://mairie-lyon.fr/agenda', 'https://mairie-lyon.fr/']),
    });
  });

  it('rien pour un site en préparation, une adresse netlify.app ou une publication pas encore prête', async () => {
    for (const [site, state] of [
      [{ customDomain: 'mairie-lyon.fr', noindex: true }, 'ready'],
      [{ customDomain: null }, 'ready'],
      [{ customDomain: 'mairie-lyon.fr' }, 'building'],
    ] as const) {
      const { done, calls } = run(site, state);
      await done;
      expect(calls.some((call) => call.url.includes('indexnow')), JSON.stringify(site)).toBe(false);
    }
  });
});

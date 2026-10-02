import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublisher, LocalPublisher, publishedSiteDir } from '../src';

let root: string;
let build: string;
const site = { documentId: 'doc-1', slug: 'lyon', name: 'Lyon' };
const quiet = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'local-publisher-'));
  build = fs.mkdtempSync(path.join(os.tmpdir(), 'local-build-'));
  fs.mkdirSync(path.join(build, 'actualites'));
  fs.writeFileSync(path.join(build, 'index.html'), '<h1>v2</h1>');
  fs.writeFileSync(path.join(build, 'actualites', 'index.html'), '<h1>Actualités</h1>');
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(build, { recursive: true, force: true });
});

/** Versions présentes dans .versions */
const versions = () => fs.readdirSync(path.join(root, '.versions')).sort();
const lyon = () => path.join(root, 'lyon');

describe('LocalPublisher', () => {
  it('remplace le site publié par le nouveau build : un lien relatif vers sa version, la précédente effacée', async () => {
    const publisher = new LocalPublisher({ root, baseUrl: 'http://localhost:8080/' });
    expect(await publisher.publish(site, build)).toMatchObject({ hostId: 'lyon', defaultUrl: 'http://localhost:8080/lyon', state: 'ready' });
    const first = fs.readlinkSync(lyon());
    expect(first).toMatch(/^\.versions\/lyon-\d+$/);

    fs.writeFileSync(path.join(build, 'index.html'), '<h1>v3</h1>');
    fs.rmSync(path.join(build, 'actualites'), { recursive: true });
    await new Promise((resolve) => setTimeout(resolve, 2));
    await publisher.publish(site, build);
    expect(fs.readlinkSync(lyon())).not.toBe(first);
    expect(fs.readdirSync(lyon()).sort()).toEqual(['.regles', 'index.html']);
    expect(fs.readFileSync(path.join(lyon(), 'index.html'), 'utf8')).toBe('<h1>v3</h1>');
    // Seule la version servie reste
    expect(fs.readdirSync(root).sort()).toEqual(['.versions', 'lyon']);
    expect(versions()).toEqual([path.basename(fs.readlinkSync(lyon()))]);
  });

  it("remplace une première fois le dossier d'un site publié avant les liens (#387)", async () => {
    fs.mkdirSync(lyon());
    fs.writeFileSync(path.join(lyon(), 'ancienne-page.html'), 'v1');
    await new LocalPublisher({ root }).publish(site, build);
    expect(fs.lstatSync(lyon()).isSymbolicLink()).toBe(true);
    expect(fs.readdirSync(lyon()).sort()).toEqual(['.regles', 'actualites', 'index.html']);
    expect(versions()).toHaveLength(1);
  });

  // Linux seulement (serveur, CI) : sur macOS, APFS laisse parfois un chemin introuvable pendant un rename qui
  // remplace un lien, ce que Linux ne fait jamais (#387 : 0 absence sur 225 000 lectures sous Linux)
  it.runIf(process.platform === 'linux')('ne laisse jamais le site absent pendant le remplacement (aucune 404 entre deux versions)', async () => {
    const publisher = new LocalPublisher({ root });
    await publisher.publish(site, build);
    // Contrôle à chaque tour de la boucle d'événements, entre toutes les étapes asynchrones de la publication
    let missing = 0;
    let running = true;
    const check = () => {
      if (!fs.existsSync(path.join(lyon(), 'index.html'))) missing += 1;
      if (running) setImmediate(check);
    };
    setImmediate(check);
    for (let i = 0; i < 10; i++) await publisher.publish(site, build);
    running = false;
    expect(missing).toBe(0);
  });

  it('écrit les règles du site (noindex, redirections) dans .regles/site.caddy', async () => {
    await new LocalPublisher({ root }).publish(
      { ...site, noindex: true, redirects: [{ from: '/horaires.html', to: '/contact' }, { from: '/actualites', to: '/agenda' }] },
      build,
    );
    const rules = fs.readFileSync(path.join(lyon(), '.regles', 'site.caddy'), 'utf8');
    expect(rules).toContain('header @site-lyon X-Robots-Tag "noindex, nofollow"');
    expect(rules).toContain('redir @site-lyon-1 "/contact" 301');
    // /actualites existe dans le site publié : jamais masquée par une redirection
    expect(rules).not.toContain('/sites/lyon/actualites');
  });

  it('recharge Caddy après la publication, quand son API est configurée', async () => {
    const fetch = vi.fn(async () => {
      // Caddy relit les règles une fois le nouveau site en place
      expect(fs.readFileSync(path.join(lyon(), 'index.html'), 'utf8')).toBe('<h1>v2</h1>');
      return new Response('');
    });
    await new LocalPublisher({ root, caddyAdminUrl: 'http://caddy:2019', fetch }).publish(site, build);
    expect(fetch).toHaveBeenCalledWith('http://caddy:2019/load', expect.objectContaining({ method: 'POST' }));
  });

  it('remet la version précédente quand Caddy refuse les règles', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('')).mockResolvedValueOnce(new Response('règle invalide', { status: 400 })).mockResolvedValue(new Response(''));
    const publisher = new LocalPublisher({ root, caddyAdminUrl: 'http://caddy:2019', fetch, logger: quiet });
    await publisher.publish(site, build);
    const live = fs.readlinkSync(lyon());
    fs.writeFileSync(path.join(build, 'index.html'), '<h1>v3</h1>');
    await expect(publisher.publish(site, build)).rejects.toThrow('Caddy a refusé la configuration (400)');
    expect(fs.readlinkSync(lyon())).toBe(live);
    expect(fs.readFileSync(path.join(lyon(), 'index.html'), 'utf8')).toBe('<h1>v2</h1>');
    expect(versions()).toEqual([path.basename(live)]);
    // Caddy rechargé avec les règles de la version remise en place
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("remet le dossier d'avant les liens quand Caddy refuse les règles", async () => {
    fs.mkdirSync(lyon());
    fs.writeFileSync(path.join(lyon(), 'index.html'), 'v1');
    const fetch = vi.fn().mockResolvedValueOnce(new Response('règle invalide', { status: 400 })).mockResolvedValue(new Response(''));
    const publisher = new LocalPublisher({ root, caddyAdminUrl: 'http://caddy:2019', fetch, logger: quiet });
    await expect(publisher.publish(site, build)).rejects.toThrow('Caddy a refusé la configuration (400)');
    expect(fs.lstatSync(lyon()).isDirectory()).toBe(true);
    expect(fs.readFileSync(path.join(lyon(), 'index.html'), 'utf8')).toBe('v1');
    expect(versions()).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("efface les restes d'une publication interrompue de ce site, pas ceux des autres ni la version servie", async () => {
    const publisher = new LocalPublisher({ root });
    await publisher.publish(site, build);
    const live = path.basename(fs.readlinkSync(lyon()));
    for (const name of ['lyon-123', 'lyon-123.lien', 'lyon-sud-123']) fs.mkdirSync(path.join(root, '.versions', name));
    fs.mkdirSync(path.join(root, '.staging', 'lyon-123-precedent'), { recursive: true });
    fs.mkdirSync(path.join(root, '.staging', 'lyon-sud-123'));
    // La version servie est encore là quand les restes sont effacés, puis remplacée par la nouvelle
    const fetch = vi.fn(async () => {
      expect(versions()).toContain(live);
      return new Response('');
    });
    await new LocalPublisher({ root, caddyAdminUrl: 'http://caddy:2019', fetch }).publish(site, build);
    expect(versions()).toEqual([path.basename(fs.readlinkSync(lyon())), 'lyon-sud-123'].sort());
    expect(fs.readdirSync(path.join(root, '.staging'))).toEqual(['lyon-sud-123']);
  });

  it('supprime le site, toutes ses versions, et recharge Caddy', async () => {
    const fetch = vi.fn(async () => new Response(''));
    const publisher = new LocalPublisher({ root, caddyAdminUrl: 'http://caddy:2019', fetch });
    await publisher.publish(site, build);
    fs.mkdirSync(path.join(root, '.versions', 'lyon-sud-123'));
    await publisher.deleteSite(site);
    expect(fs.existsSync(lyon())).toBe(false);
    expect(versions()).toEqual(['lyon-sud-123']);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("supprime le dossier d'un site publié avant les liens", async () => {
    fs.mkdirSync(lyon());
    fs.writeFileSync(path.join(lyon(), 'index.html'), 'v1');
    await new LocalPublisher({ root }).deleteSite(site);
    expect(fs.existsSync(lyon())).toBe(false);
  });

  it('donne par défaut une adresse http, utilisable comme adresse canonique', async () => {
    expect((await new LocalPublisher({ root }).ensureSite(site)).defaultUrl).toBe('http://localhost:8080/lyon');
  });

  it('refuse un slug qui sortirait du dossier', async () => {
    await expect(new LocalPublisher({ root }).publish({ ...site, slug: '../x' }, build)).rejects.toThrow('Slug invalide');
  });

  it('est choisi par getPublisher quand PUBLISH_DIR est défini sans jeton Netlify', () => {
    expect(getPublisher({ PUBLISH_DIR: root }).id).toBe('local');
    expect(getPublisher({ PUBLISH_DIR: root, NETLIFY_TOKEN: 't' }).id).toBe('netlify');
    expect(getPublisher({ PUBLISH_DIR: root, CADDY_ADMIN_URL: 'http://caddy:2019' }).id).toBe('local');
  });
});

describe('publishedSiteDir (export des données, #343)', () => {
  it('dossier du site quand les sites sont servis depuis le serveur, null chez Netlify', () => {
    expect(publishedSiteDir('lyon', { SITES_PUBLISHER: 'bunny' })).toBe('/srv/sites/lyon');
    expect(publishedSiteDir('lyon', { SITES_PUBLISHER: 'bunny', PUBLISH_DIR: '/data/sites', NETLIFY_TOKEN: 't' })).toBe('/data/sites/lyon');
    expect(publishedSiteDir('lyon', { PUBLISH_DIR: '/data/sites' })).toBe('/data/sites/lyon');
    expect(publishedSiteDir('lyon', { PUBLISH_DIR: '/data/sites', NETLIFY_TOKEN: 't' })).toBeNull();
    expect(publishedSiteDir('lyon', {})).toBeNull();
    // Strapi : le volume monté sans publier lui-même
    expect(publishedSiteDir('lyon', { SITES_DIR: '/srv/sites' })).toBe('/srv/sites/lyon');
    expect(publishedSiteDir('lyon', { SITES_DIR: '/srv/sites', NETLIFY_TOKEN: 't' })).toBeNull();
  });
});

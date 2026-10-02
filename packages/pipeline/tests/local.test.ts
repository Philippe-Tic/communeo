import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublisher, LocalPublisher } from '../src';

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

describe('LocalPublisher', () => {
  it('remplace le site publié par le nouveau build', async () => {
    fs.mkdirSync(path.join(root, 'lyon'));
    fs.writeFileSync(path.join(root, 'lyon', 'ancienne-page.html'), 'v1');

    const publisher = new LocalPublisher({ root, baseUrl: 'http://localhost:8080/' });
    expect(await publisher.publish(site, build)).toMatchObject({ hostId: 'lyon', defaultUrl: 'http://localhost:8080/lyon', state: 'ready' });
    expect(fs.readdirSync(path.join(root, 'lyon')).sort()).toEqual(['.regles', 'actualites', 'index.html']);
    // Copie en cours et version remplacée dans .staging, vidé après la publication
    expect(fs.readdirSync(root).sort()).toEqual(['.staging', 'lyon']);
    expect(fs.readdirSync(path.join(root, '.staging'))).toEqual([]);
  });

  it('écrit les règles du site (noindex, redirections) dans .regles/site.caddy', async () => {
    await new LocalPublisher({ root }).publish(
      { ...site, noindex: true, redirects: [{ from: '/horaires.html', to: '/contact' }, { from: '/actualites', to: '/agenda' }] },
      build,
    );
    const rules = fs.readFileSync(path.join(root, 'lyon', '.regles', 'site.caddy'), 'utf8');
    expect(rules).toContain('header @site-lyon X-Robots-Tag "noindex, nofollow"');
    expect(rules).toContain('redir @site-lyon-1 "/contact" 301');
    // /actualites existe dans le site publié : jamais masquée par une redirection
    expect(rules).not.toContain('/sites/lyon/actualites');
  });

  it('recharge Caddy après la publication, quand son API est configurée', async () => {
    const fetch = vi.fn(async () => {
      // Caddy relit les règles une fois le nouveau site en place
      expect(fs.readFileSync(path.join(root, 'lyon', 'index.html'), 'utf8')).toBe('<h1>v2</h1>');
      return new Response('');
    });
    await new LocalPublisher({ root, caddyAdminUrl: 'http://caddy:2019', fetch }).publish(site, build);
    expect(fetch).toHaveBeenCalledWith('http://caddy:2019/load', expect.objectContaining({ method: 'POST' }));
  });

  it('remet la version précédente quand Caddy refuse les règles', async () => {
    fs.mkdirSync(path.join(root, 'lyon'));
    fs.writeFileSync(path.join(root, 'lyon', 'index.html'), 'v1');
    const fetch = vi.fn().mockResolvedValueOnce(new Response('règle invalide', { status: 400 })).mockResolvedValue(new Response(''));
    const publisher = new LocalPublisher({ root, caddyAdminUrl: 'http://caddy:2019', fetch, logger: quiet });
    await expect(publisher.publish(site, build)).rejects.toThrow('Caddy a refusé la configuration (400)');
    expect(fs.readFileSync(path.join(root, 'lyon', 'index.html'), 'utf8')).toBe('v1');
    expect(fs.readdirSync(path.join(root, '.staging'))).toEqual([]);
    // Caddy rechargé avec les règles de la version remise en place
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("efface les restes d'une publication interrompue de ce site, pas ceux des autres", async () => {
    fs.mkdirSync(path.join(root, '.staging', 'lyon-123-precedent'), { recursive: true });
    fs.mkdirSync(path.join(root, '.staging', 'lyon-sud-123'));
    await new LocalPublisher({ root }).publish(site, build);
    expect(fs.readdirSync(path.join(root, '.staging'))).toEqual(['lyon-sud-123']);
  });

  it('supprime le site et recharge Caddy', async () => {
    const fetch = vi.fn(async () => new Response(''));
    const publisher = new LocalPublisher({ root, caddyAdminUrl: 'http://caddy:2019', fetch });
    await publisher.publish(site, build);
    await publisher.deleteSite(site);
    expect(fs.existsSync(path.join(root, 'lyon'))).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
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

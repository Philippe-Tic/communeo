import { describe, expect, it, vi } from 'vitest';
import { caddySiteRules, reloadCaddy } from '../src';

const lines = (content: string) => content.trimEnd().split('\n').slice(1);

describe('caddySiteRules', () => {
  it("n'écrit rien d'autre que l'en-tête pour un site sans règle", () => {
    const { content, skipped } = caddySiteRules({ slug: 'lyon' });
    expect(content).toBe('# Règles du site « lyon » (Communeo), réécrites à chaque publication : ne pas modifier\n');
    expect(skipped).toEqual([]);
  });

  it("ajoute X-Robots-Tag sur toutes les adresses d'un site en essai", () => {
    expect(lines(caddySiteRules({ slug: 'lyon', noindex: true }).content)).toEqual([
      '@site-lyon path /sites/lyon /sites/lyon/*',
      'header @site-lyon X-Robots-Tag "noindex, nofollow"',
    ]);
  });

  it("redirige les autres adresses du site vers l'adresse canonique, chemin et requête gardés", () => {
    expect(lines(caddySiteRules({ slug: 'saint-aubin', canonicalHost: 'Mairie-Saint-Aubin.fr' }).content)).toEqual([
      '@site-saint-aubin-canonique {',
      '\tpath /sites/saint-aubin /sites/saint-aubin/*',
      '\theader X-Forwarded-Host *',
      '\tnot header X-Forwarded-Host mairie-saint-aubin.fr',
      '\tpath_regexp site_saint_aubin_chemin ^/sites/saint-aubin/?(.*)$',
      '}',
      'redir @site-saint-aubin-canonique https://mairie-saint-aubin.fr/{re.site_saint_aubin_chemin.1}{?query} 301',
    ]);
  });

  it("écrit les redirections de l'ancien site, avec ou sans barre finale, et les conditions de requête", () => {
    const { content } = caddySiteRules({
      slug: 'lyon',
      redirects: [
        { from: '/horaires.html', to: '/contact' },
        { from: '/index.php?page=etat civil&id=2', to: '/demarches' },
        { from: '/?p=12', to: '/actualites/fete' },
      ],
    });
    expect(lines(content)).toEqual([
      '@site-lyon-1 path "/sites/lyon/horaires.html" "/sites/lyon/horaires.html/"',
      'redir @site-lyon-1 "/contact" 301',
      '@site-lyon-2 {',
      '\tpath "/sites/lyon/index.php" "/sites/lyon/index.php/"',
      '\tquery "page=etat civil" "id=2"',
      '}',
      'redir @site-lyon-2 "/demarches" 301',
      '@site-lyon-3 {',
      '\tpath "/sites/lyon/"',
      '\tquery "p=12"',
      '}',
      'redir @site-lyon-3 "/actualites/fete" 301',
    ]);
  });

  it('place le noindex et la redirection canonique avant les redirections', () => {
    const { content } = caddySiteRules({ slug: 'lyon', noindex: true, canonicalHost: 'lyon.fr', redirects: [{ from: '/a', to: '/b' }] });
    const order = lines(content).map((line) => line.split(' ')[0]);
    expect(order.indexOf('header')).toBeLessThan(order.indexOf('@site-lyon-canonique'));
    expect(order.lastIndexOf('redir')).toBe(order.length - 1);
    expect(content).toContain('redir @site-lyon-1 "/b" 301');
  });

  it("ne masque pas une page du site (comme Netlify), sauf pour une règle avec requête", () => {
    const files = new Set(['index.html', 'contact.html', 'actualites/index.html', 'plan.pdf']);
    const { content } = caddySiteRules({
      slug: 'lyon',
      files,
      redirects: [
        { from: '/contact', to: '/horaires' },
        { from: '/actualites', to: '/agenda' },
        { from: '/plan.pdf', to: '/documents' },
        { from: '/contact?page=2', to: '/agenda' },
        { from: '/ancienne', to: '/agenda' },
      ],
    });
    expect(lines(content)).toEqual([
      '@site-lyon-1 {',
      '\tpath "/sites/lyon/contact" "/sites/lyon/contact/"',
      '\tquery "page=2"',
      '}',
      'redir @site-lyon-1 "/agenda" 301',
      '@site-lyon-2 path "/sites/lyon/ancienne" "/sites/lyon/ancienne/"',
      'redir @site-lyon-2 "/agenda" 301',
    ]);
  });

  it('écarte une redirection vers elle-même', () => {
    expect(lines(caddySiteRules({ slug: 'lyon', redirects: [{ from: '/contact.html', to: '/contact' }] }).content)).toEqual([]);
  });

  it("écarte et signale ce qu'une règle Caddy ne peut pas porter sans risque", () => {
    const unsafe = [
      { from: '/a*b', to: '/contact' },
      { from: '/{http.request.uri}', to: '/contact' },
      { from: '/a', to: '/{env.SECRET}' },
      { from: '/a', to: '/x"y' },
      { from: '/a?q=*', to: '/contact' },
      { from: '/a?q=%22', to: '/contact' },
      { from: '/a?q=%7Bx%7D', to: '/contact' },
      { from: '/a?q=1%0Aredir', to: '/contact' },
      { from: '/a', to: 'https://ailleurs.fr/' },
    ];
    const { content, skipped } = caddySiteRules({ slug: 'lyon', redirects: [...unsafe, { from: '/ok', to: '/contact' }] });
    expect(skipped).toEqual(unsafe);
    expect(lines(content)).toEqual(['@site-lyon-1 path "/sites/lyon/ok" "/sites/lyon/ok/"', 'redir @site-lyon-1 "/contact" 301']);
  });

  it('garde les adresses encodées telles quelles', () => {
    const { content } = caddySiteRules({ slug: 'lyon', redirects: [{ from: '/actualit%C3%A9s.html', to: '/actualites' }] });
    expect(content).toContain('path "/sites/lyon/actualit%C3%A9s.html"');
  });

  it('refuse un slug ou une adresse canonique qui sortirait des règles du site', () => {
    expect(() => caddySiteRules({ slug: '../x' })).toThrow('Slug invalide');
    expect(() => caddySiteRules({ slug: 'lyon', canonicalHost: 'lyon.fr {' })).toThrow('Adresse canonique invalide');
  });
});

describe('reloadCaddy', () => {
  it("demande à Caddy de relire son Caddyfile par l'API d'administration", async () => {
    const fetch = vi.fn(async () => new Response('', { status: 200 }));
    await reloadCaddy('http://caddy:2019/', { fetch });
    expect(fetch).toHaveBeenCalledWith('http://caddy:2019/load', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'text/caddyfile', Origin: 'http://caddy:2019' },
      body: 'import /etc/caddy/Caddyfile\n',
    }));
  });

  it('lève une erreur quand Caddy refuse la configuration', async () => {
    const fetch = vi.fn(async () => new Response('{"error":"unrecognized directive"}', { status: 400 }));
    await expect(reloadCaddy('http://caddy:2019', { fetch })).rejects.toThrow('Caddy a refusé la configuration (400)');
  });
});

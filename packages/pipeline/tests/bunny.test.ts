/**
 * Adaptateur Bunny contre une API simulée (Pull Zones, Edge Rules, Bunny DNS) : aucun appel réseau.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNNY_RULES, BunnyPublisher, getPublisher, PublisherUnavailableError, type BunnyEdgeRule } from '../src';

interface Call {
  method: string;
  path: string;
  body?: any;
  accessKey?: string;
}

interface Zone {
  Id: number;
  Name: string;
  OriginUrl: string;
  Hostnames: Array<{ Id: number; Value: string; IsSystemHostname: boolean; HasCertificate: boolean; ForceSSL: boolean }>;
  EdgeRules: BunnyEdgeRule[];
  CacheControlPublicMaxAgeOverride: number;
  settings: Record<string, unknown>;
}

type Override = (call: Call) => { status: number; body?: unknown; headers?: Record<string, string> } | undefined;

/** Fausse API Bunny avec son état : Pull Zones, règles, zone DNS communeo.fr (id 77) */
function fakeBunny() {
  const calls: Call[] = [];
  const zones = new Map<number, Zone>();
  const records: Array<{ Id: number; Type: number; Name: string; Value: string }> = [{ Id: 1, Type: 0, Name: 'app', Value: '203.0.113.10' }];
  let nextId = 1000;
  let override: Override | undefined;
  /** Adresses dont Let's Encrypt ne peut pas encore vérifier le pointage */
  const unreachable = new Set<string>();
  /** Adresses servies par Bunny sans CNAME visible (Bunny DNS chez la commune, CNAME aplati) */
  const flattened = new Set<string>();

  const json = (body: unknown, status = 200) => ({ status, body });
  const zoneByHost = (host: string) => [...zones.values()].find((zone) => zone.Hostnames.some((entry) => entry.Value === host));

  const handle = (call: Call): { status: number; body?: unknown; headers?: Record<string, string> } => {
    const forced = override?.(call);
    if (forced) return forced;
    const { method, body } = call;
    const [pathname, search = ''] = call.path.split('?');
    const query = new URLSearchParams(search);
    let match: RegExpMatchArray | null;

    if (method === 'POST' && pathname === '/pullzone') {
      if ([...zones.values()].some((zone) => zone.Name === body.Name)) return json({ ErrorKey: 'pullzone.name_taken', Message: 'Name taken' }, 400);
      const zone: Zone = {
        Id: nextId++,
        Name: body.Name,
        OriginUrl: body.OriginUrl,
        Hostnames: [{ Id: nextId++, Value: `${body.Name}.b-cdn.net`, IsSystemHostname: true, HasCertificate: true, ForceSSL: false }],
        EdgeRules: [],
        // -1 : valeur par défaut de Bunny (le navigateur reçoit la durée du cache de Bunny)
        CacheControlPublicMaxAgeOverride: body.CacheControlPublicMaxAgeOverride ?? -1,
        settings: body,
      };
      zones.set(zone.Id, zone);
      return json(zone, 201);
    }
    if (method === 'GET' && pathname === '/pullzone') {
      const items = [...zones.values()].filter((zone) => zone.Name.includes(query.get('search') ?? ''));
      return json({ Items: items, CurrentPage: Number(query.get('page')), TotalItems: items.length, HasMoreItems: false });
    }
    if (method === 'GET' && pathname === '/pullzone/loadFreeCertificate') {
      const host = query.get('hostname')!;
      const zone = zoneByHost(host);
      if (!zone) return json({ Message: 'hostname not found' }, 404);
      if (unreachable.has(host)) return json({ Message: 'Failed to validate DNS' }, 400);
      zone.Hostnames.find((entry) => entry.Value === host)!.HasCertificate = true;
      return json(null, 200);
    }
    if ((match = pathname!.match(/^\/pullzone\/(\d+)(\/.*)?$/))) {
      const zone = zones.get(Number(match[1]));
      if (!zone) return json({ Message: 'Pull Zone not found' }, 404);
      const action = match[2] ?? '';
      if (method === 'GET' && action === '') return json(zone);
      if (method === 'POST' && action === '') {
        Object.assign(zone, body);
        return json(zone);
      }
      if (method === 'DELETE' && action === '') {
        zones.delete(zone.Id);
        return { status: 204 };
      }
      if (method === 'POST' && action === '/addHostname') {
        if (zoneByHost(body.Hostname)) return json({ Message: 'The hostname is already registered' }, 400);
        zone.Hostnames.push({ Id: nextId++, Value: body.Hostname, IsSystemHostname: false, HasCertificate: false, ForceSSL: false });
        return { status: 204 };
      }
      if (method === 'DELETE' && action === '/removeHostname') {
        zone.Hostnames = zone.Hostnames.filter((entry) => entry.Value !== body.Hostname);
        return { status: 204 };
      }
      if (method === 'POST' && action === '/setForceSSL') {
        zone.Hostnames.find((entry) => entry.Value === body.Hostname)!.ForceSSL = body.ForceSSL;
        return { status: 204 };
      }
      if (method === 'POST' && action === '/purgeCache') return { status: 204 };
      if (method === 'POST' && action === '/edgerules/addOrUpdate') {
        const rule = { ...body, Guid: body.Guid ?? `guid-${nextId++}` };
        zone.EdgeRules = [...zone.EdgeRules.filter((existing) => existing.Guid !== rule.Guid), rule];
        return json(rule, 201);
      }
      if ((match = action.match(/^\/edgerules\/(.+)$/)) && method === 'DELETE') {
        zone.EdgeRules = zone.EdgeRules.filter((rule) => rule.Guid !== match![1]);
        return { status: 204 };
      }
    }
    if (method === 'GET' && pathname === '/dnszone/77') return json({ Id: 77, Domain: 'communeo.fr', Records: records });
    if (method === 'PUT' && pathname === '/dnszone/77/records') {
      const record = { Id: nextId++, Type: body.Type, Name: body.Name, Value: body.Value };
      records.push(record);
      return json(record, 201);
    }
    if ((match = pathname!.match(/^\/dnszone\/77\/records\/(\d+)$/))) {
      const index = records.findIndex((record) => record.Id === Number(match![1]));
      if (index < 0) return json({ Message: 'Record not found' }, 404);
      if (method === 'DELETE') records.splice(index, 1);
      else records[index] = { ...records[index]!, Value: body.Value };
      return { status: 204 };
    }
    return json({ Message: 'Not Found' }, 404);
  };

  const fetch = (async (url: string, init: RequestInit = {}) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    // Vérification des domaines par la réponse http (servedByZone)
    if (!url.startsWith('https://api.bunny.net')) {
      const host = new URL(url).hostname;
      const zone = flattened.has(host) ? zoneByHost(host) : undefined;
      return new Response(null, { status: 301, headers: zone ? { 'CDN-PullZone': String(zone.Id), Server: 'BunnyCDN-DE1-123' } : {} });
    }
    const call: Call = {
      method: init.method ?? 'GET',
      path: url.replace('https://api.bunny.net', ''),
      accessKey: headers.AccessKey,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
    };
    calls.push(call);
    const res = handle(call);
    const text = res.body === undefined || res.body === null ? '' : JSON.stringify(res.body);
    return new Response(text || null, { status: res.status, headers: res.headers });
  }) as typeof globalThis.fetch;

  return {
    calls,
    zones,
    records,
    unreachable,
    flattened,
    fetch,
    setOverride: (handler: Override | undefined) => (override = handler),
    zone: (name: string) => [...zones.values()].find((zone) => zone.Name === name)!,
  };
}

const quiet = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const site = { documentId: 'doc-1', slug: 'lyon', name: 'Lyon' };
const SECRET = 'a1b2c3d4e5f6';

let root: string;
let build: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bunny-sites-'));
  build = fs.mkdtempSync(path.join(os.tmpdir(), 'bunny-build-'));
  fs.writeFileSync(path.join(build, 'index.html'), '<h1>Lyon</h1>');
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(build, { recursive: true, force: true });
});

function setup(extra: Partial<ConstructorParameters<typeof BunnyPublisher>[0]> = {}) {
  const api = fakeBunny();
  const sleep = vi.fn(async () => {});
  const dns = {
    cname: new Map<string, string[]>(),
    a: new Map<string, string[]>([['origine.communeo.fr', ['203.0.113.10']]]),
    aaaa: new Map<string, string[]>(),
  };
  const miss = (name: string) => Promise.reject(Object.assign(new Error(`queryX ENOTFOUND ${name}`), { code: 'ENOTFOUND' }));
  const p = new BunnyPublisher({
    apiKey: 'cle-bunny',
    originSecret: SECRET,
    originDomain: 'origine.communeo.fr',
    sitesDomain: 'communeo.fr',
    dnsZoneId: 77,
    sitesDir: root,
    fetch: api.fetch,
    sleep,
    logger: quiet,
    resolveCname: async (name) => dns.cname.get(name) ?? miss(name),
    resolve4: async (name) => dns.a.get(name) ?? miss(name),
    resolve6: async (name) => dns.aaaa.get(name) ?? miss(name),
    ...extra,
  });
  return { api, p, sleep, dns };
}

const rule = (zone: Zone, description: string) => zone.EdgeRules.find((candidate) => candidate.Description === description);

describe('ensureSite : Pull Zone de la commune', () => {
  it("crée la Pull Zone avec l'origine du site, les réglages de cache et les régions", async () => {
    const { api, p } = setup();
    const host = await p.ensureSite(site);
    const zone = api.zone('communeo-lyon');
    expect(host).toEqual({ hostId: String(zone.Id), defaultUrl: 'https://lyon.communeo.fr' });
    expect(zone.settings).toMatchObject({
      Name: 'communeo-lyon',
      OriginUrl: 'https://origine.communeo.fr/sites/lyon/',
      UseStaleWhileOffline: true,
      UseStaleWhileUpdating: true,
      EnableGeoZoneEU: true,
      EnableGeoZoneUS: true,
      EnableGeoZoneASIA: false,
      EnableGeoZoneSA: false,
      EnableGeoZoneAF: false,
      VerifyOriginSSL: true,
      CacheControlMaxAgeOverride: 31_536_000,
      CacheControlPublicMaxAgeOverride: 0,
      CacheErrorResponses: false,
      IgnoreQueryStrings: false,
    });
    expect(api.calls.every((call) => call.accessKey === 'cle-bunny')).toBe(true);
  });

  it("ajoute l'en-tête secret aux requêtes vers l'origine (Edge Rule « Set Request Header »)", async () => {
    const { api, p } = setup();
    await p.ensureSite(site);
    expect(rule(api.zone('communeo-lyon'), BUNNY_RULES.originSecret)).toMatchObject({
      ActionType: 6,
      ActionParameter1: 'X-Communeo-Origine',
      ActionParameter2: SECRET,
      Enabled: true,
      Triggers: [{ Type: 0, PatternMatches: ['*'], PatternMatchingType: 0 }],
    });
    // L'adresse technique reste testable mais n'est jamais indexée
    expect(rule(api.zone('communeo-lyon'), BUNNY_RULES.technicalHost)).toMatchObject({
      ActionType: 5,
      ActionParameter1: 'X-Robots-Tag',
      ActionParameter2: 'noindex, nofollow',
      Triggers: [{ Type: 0, PatternMatches: ['*://communeo-lyon.b-cdn.net/*'], PatternMatchingType: 0 }],
    });
    expect(rule(api.zone('communeo-lyon'), BUNNY_RULES.canonical)).toBeUndefined();
  });

  it("garde les fichiers d'Astro un an dans le navigateur, les pages jamais", async () => {
    const { api, p } = setup();
    await p.ensureSite(site);
    expect(rule(api.zone('communeo-lyon'), BUNNY_RULES.astroAssets)).toMatchObject({
      ActionType: 16,
      ActionParameter1: '31536000',
      Triggers: [{ Type: 0, PatternMatches: ['*/_astro/*'], PatternMatchingType: 0 }],
    });
  });

  it('met à jour le cache navigateur des Pull Zones créées avant (un an pour les pages), et retire la règle d’essai', async () => {
    const { api, p } = setup();
    const { hostId } = await p.ensureSite(site);
    const zone = api.zone('communeo-lyon');
    zone.CacheControlPublicMaxAgeOverride = -1;
    zone.EdgeRules.push({ Guid: 'essai', Description: 'Communeo : essai cache navigateur _astro', ActionType: 16, ActionParameter1: '31536000', Enabled: true, TriggerMatchingType: 0, Triggers: [] });
    await p.ensureSite({ ...site, hostId });
    expect(zone.CacheControlPublicMaxAgeOverride).toBe(0);
    expect(api.calls).toContainEqual(expect.objectContaining({ method: 'POST', path: `/pullzone/${zone.Id}`, body: { CacheControlPublicMaxAgeOverride: 0 } }));
    expect(zone.EdgeRules.map((r) => r.Description)).not.toContain('Communeo : essai cache navigateur _astro');
  });

  it("ajoute l'adresse <slug>.communeo.fr, son CNAME dans Bunny DNS et son certificat", async () => {
    const { api, p } = setup();
    await p.ensureSite(site);
    const zone = api.zone('communeo-lyon');
    expect(zone.Hostnames.find((entry) => entry.Value === 'lyon.communeo.fr')).toMatchObject({ HasCertificate: true, ForceSSL: true });
    expect(api.records).toContainEqual(expect.objectContaining({ Type: 2, Name: 'lyon', Value: 'communeo-lyon.b-cdn.net' }));
    expect(api.calls.map((call) => `${call.method} ${call.path}`)).toContain('GET /pullzone/loadFreeCertificate?hostname=lyon.communeo.fr');
  });

  it("n'est pas bloqué quand le certificat n'est pas encore délivré (DNS pas encore chez Bunny), et le redemande ensuite", async () => {
    const { api, p } = setup();
    api.unreachable.add('lyon.communeo.fr');
    const host = await p.ensureSite(site);
    expect(host.defaultUrl).toBe('https://lyon.communeo.fr');
    const zone = api.zone('communeo-lyon');
    expect(zone.Hostnames.find((entry) => entry.Value === 'lyon.communeo.fr')).toMatchObject({ HasCertificate: false, ForceSSL: false });

    api.unreachable.clear();
    await p.ensureSite({ ...site, hostId: host.hostId });
    expect(zone.Hostnames.find((entry) => entry.Value === 'lyon.communeo.fr')).toMatchObject({ HasCertificate: true, ForceSSL: true });
  });

  it('est idempotent : rien de recréé, aucune règle renvoyée quand rien ne change', async () => {
    const { api, p } = setup();
    const { hostId } = await p.ensureSite(site);
    const before = api.calls.length;
    await p.ensureSite({ ...site, hostId });
    const writes = api.calls.slice(before).filter((call) => call.method !== 'GET');
    expect(writes).toEqual([]);
    expect(api.zones.size).toBe(1);
    expect(api.records.filter((record) => record.Name === 'lyon')).toHaveLength(1);
  });

  it('retrouve la Pull Zone par son nom (identifiant Netlify, ou Pull Zone supprimée chez Bunny)', async () => {
    const { api, p } = setup();
    const { hostId } = await p.ensureSite(site);
    expect((await p.ensureSite({ ...site, hostId: 'netlify-uuid-1234' })).hostId).toBe(hostId);
    expect((await p.ensureSite({ ...site, hostId: '999999' })).hostId).toBe(hostId);
    expect(api.zones.size).toBe(1);
  });

  it('retrouve la Pull Zone créée par une tentative dont la réponse a été perdue', async () => {
    const { api, p } = setup();
    await p.ensureSite(site);
    const id = api.zone('communeo-lyon').Id;
    // Recherche par nom vide la première fois (index de Bunny pas encore à jour), puis le nom est refusé
    let searches = 0;
    api.setOverride((call) => (call.method === 'GET' && call.path.startsWith('/pullzone?') && searches++ === 0 ? { status: 200, body: { Items: [], HasMoreItems: false } } : undefined));
    expect((await p.ensureSite(site)).hostId).toBe(String(id));
  });

  it("préfixe le nom hors production, et se passe de l'adresse Communeo sans SITES_DOMAIN", async () => {
    const { api, p } = setup({ namePrefix: 'dev-', sitesDomain: undefined });
    expect((await p.ensureSite(site)).defaultUrl).toBe('https://dev-communeo-lyon.b-cdn.net');
    expect(api.zone('dev-communeo-lyon').Hostnames).toHaveLength(1);
    expect(api.calls.some((call) => call.path.startsWith('/dnszone'))).toBe(false);
  });

  it("met à jour le CNAME s'il pointe ailleurs, mais ne touche pas à un enregistrement d'un autre type", async () => {
    const { api, p } = setup();
    api.records.push({ Id: 5, Type: 2, Name: 'lyon', Value: 'lyon-mairie.netlify.app' }, { Id: 6, Type: 0, Name: 'paris', Value: '198.51.100.1' });
    await p.ensureSite(site);
    expect(api.records.find((record) => record.Id === 5)?.Value).toBe('communeo-lyon.b-cdn.net');
    await p.ensureSite({ ...site, slug: 'paris' });
    expect(api.records.filter((record) => record.Name === 'paris')).toEqual([{ Id: 6, Type: 0, Name: 'paris', Value: '198.51.100.1' }]);
  });

  it('change la règle quand le secret change (rotation de SITES_ORIGIN_SECRET)', async () => {
    const { api, p } = setup();
    const { hostId } = await p.ensureSite(site);
    const guid = rule(api.zone('communeo-lyon'), BUNNY_RULES.originSecret)!.Guid;
    const rotated = new BunnyPublisher({ apiKey: 'cle-bunny', originSecret: 'nouveau', originDomain: 'origine.communeo.fr', sitesDir: root, fetch: api.fetch, logger: quiet });
    await rotated.ensureSite({ ...site, hostId });
    const updated = rule(api.zone('communeo-lyon'), BUNNY_RULES.originSecret)!;
    expect(updated).toMatchObject({ Guid: guid, ActionParameter2: 'nouveau' });
  });

  it('ne touche jamais aux règles ajoutées à la main', async () => {
    const { api, p } = setup();
    const { hostId } = await p.ensureSite(site);
    const zone = api.zone('communeo-lyon');
    zone.EdgeRules.push({ Guid: 'manuelle', Description: 'Bloquer un robot', ActionType: 4, Triggers: [], TriggerMatchingType: 0, Enabled: true });
    await p.ensureSite({ ...site, hostId, customDomain: 'mairie-lyon.fr' });
    await p.removeDomain({ ...site, hostId }, 'mairie-lyon.fr');
    expect(zone.EdgeRules.some((candidate) => candidate.Guid === 'manuelle')).toBe(true);
  });
});

describe('publish', () => {
  it('écrit le site dans le dossier des sites (règles Caddy comprises) puis vide le cache de la Pull Zone', async () => {
    const { api, p } = setup();
    const onUploaded = vi.fn(() => {
      expect(fs.readFileSync(path.join(root, 'lyon', 'index.html'), 'utf8')).toBe('<h1>Lyon</h1>');
      expect(api.calls.some((call) => call.path.endsWith('/purgeCache'))).toBe(false);
    });
    const result = await p.publish({ ...site, noindex: true, redirects: [{ from: '/horaires.html', to: '/contact' }] }, build, { onUploaded });

    const zone = api.zone('communeo-lyon');
    expect(result).toMatchObject({ hostId: String(zone.Id), defaultUrl: 'https://lyon.communeo.fr', state: 'ready' });
    expect(result.deployId).toMatch(/^bunny-\d+$/);
    expect(onUploaded).toHaveBeenCalledOnce();
    expect(api.calls.at(-1)).toMatchObject({ method: 'POST', path: `/pullzone/${zone.Id}/purgeCache` });
    const rules = fs.readFileSync(path.join(root, 'lyon', '.regles', 'site.caddy'), 'utf8');
    expect(rules).toContain('X-Robots-Tag "noindex, nofollow"');
    expect(rules).toContain('redir @site-lyon-1 "/contact" 301');
    expect(await p.status()).toEqual({ state: 'ready' });
  });

  it("redirige les autres adresses vers le domaine vérifié, par une règle de la Pull Zone (avant son cache)", async () => {
    const { api, p } = setup();
    const { hostId } = await p.ensureSite(site);
    await p.configureDomain({ ...site, hostId }, 'mairie-lyon.fr');
    await p.publish({ ...site, hostId, customDomain: 'mairie-lyon.fr' }, build);

    const zone = api.zone('communeo-lyon');
    expect(rule(zone, BUNNY_RULES.canonical)).toMatchObject({
      ActionType: 1,
      ActionParameter1: 'https://www.mairie-lyon.fr{{path}}',
      ActionParameter2: '301',
      Triggers: [{ Type: 0, PatternMatches: ['*://lyon.communeo.fr/*'], PatternMatchingType: 0 }],
    });
    // Le certificat du domaine est demandé à la publication qui suit la vérification
    expect(zone.Hostnames.find((entry) => entry.Value === 'www.mairie-lyon.fr')).toMatchObject({ HasCertificate: true, ForceSSL: true });
    expect(fs.readFileSync(path.join(root, 'lyon', '.regles', 'site.caddy'), 'utf8')).not.toContain('mairie-lyon');
  });

  it("échoue si le cache n'a pas pu être vidé (le job est relancé) ; 429 et 5xx sont d'abord réessayés", async () => {
    const { api, p, sleep } = setup();
    let failures = 0;
    api.setOverride((call) => (call.path.endsWith('/purgeCache') && failures++ < 2 ? { status: 429, body: 'Too Many Requests', headers: { 'Retry-After': '2' } } : undefined));
    await p.publish(site, build);
    expect(sleep).toHaveBeenCalledWith(2000);

    api.setOverride((call) => (call.path.endsWith('/purgeCache') ? { status: 503, body: 'Service Unavailable' } : undefined));
    await expect(p.publish(site, build)).rejects.toThrow('Bunny API 503');
    expect(api.calls.filter((call) => call.path.endsWith('/purgeCache')).length).toBe(3 + 3);
  });
});

describe('erreurs de l’API', () => {
  it('401 : clé refusée, sans nouvel essai', async () => {
    const { api, p, sleep } = setup();
    api.setOverride(() => ({ status: 401, body: 'Unauthorized' }));
    await expect(p.ensureSite(site)).rejects.toThrow('Bunny API 401 (clé BUNNY_API_KEY refusée)');
    expect(api.calls).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('5xx : réessayé avec un délai croissant, puis erreur', async () => {
    const { api, p, sleep } = setup();
    api.setOverride(() => ({ status: 502, body: 'Bad Gateway' }));
    await expect(p.ensureSite(site)).rejects.toThrow('Bunny API 502 sur GET /pullzone');
    expect(api.calls).toHaveLength(3);
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
  });

  it("ne met jamais la clé d'API ni le secret de l'origine dans les messages d'erreur", async () => {
    const { api, p } = setup();
    api.setOverride(() => ({ status: 400, body: { Message: 'Invalid request' } }));
    const error = await p.ensureSite(site).catch((caught: Error) => caught);
    expect(String(error)).not.toContain('cle-bunny');
    expect(String(error)).not.toContain(SECRET);
  });
});

describe('domaines des communes', () => {
  async function published(setupResult = setup()) {
    const { hostId } = await setupResult.p.ensureSite(site);
    return { ...setupResult, s: { ...site, hostId } };
  }

  it('domaine nu : www sur la Pull Zone (CNAME), domaine nu vers le serveur (A), redirigé vers www par Caddy', async () => {
    const { api, p, s, dns } = await published();
    dns.aaaa.set('origine.communeo.fr', ['2001:db8::10']);
    const instructions = await p.configureDomain(s, 'mairie-lyon.fr');
    expect(api.zone('communeo-lyon').Hostnames.map((entry) => entry.Value)).toEqual(['communeo-lyon.b-cdn.net', 'lyon.communeo.fr', 'www.mairie-lyon.fr']);
    expect(instructions).toMatchObject({ isApex: true, baseDomain: 'mairie-lyon.fr', target: 'communeo-lyon.b-cdn.net' });
    expect(instructions.records.map(({ type, displayName, value }) => [type, displayName, value])).toEqual([
      ['CNAME', 'www', 'communeo-lyon.b-cdn.net'],
      ['A', '@', '203.0.113.10'],
      ['AAAA', '@', '2001:db8::10'],
    ]);
    expect(instructions.records[1]!.description).toContain('vers www.mairie-lyon.fr');
    expect(p.canonicalDomain('mairie-lyon.fr')).toBe('www.mairie-lyon.fr');
  });

  it('sous-domaine : un seul CNAME, servi tel quel', async () => {
    const { p, s } = await published();
    const instructions = await p.configureDomain(s, 'www.ville-lyon.fr');
    expect(instructions.records.map(({ type, displayName, value }) => [type, displayName, value])).toEqual([['CNAME', 'www', 'communeo-lyon.b-cdn.net']]);
    expect(p.canonicalDomain('www.ville-lyon.fr')).toBe('www.ville-lyon.fr');
    expect((await p.dnsInstructions(s, 'www.ville-lyon.fr')).records).toEqual(instructions.records);
  });

  it('refuse un domaine déjà rattaché à une autre Pull Zone', async () => {
    const { p, s } = await published();
    await p.configureDomain(s, 'mairie-lyon.fr');
    const other = await p.ensureSite({ ...site, slug: 'paris', documentId: 'doc-2' });
    await expect(p.configureDomain({ ...site, slug: 'paris', hostId: other.hostId }, 'mairie-lyon.fr')).rejects.toThrow('Bunny a refusé le domaine www.mairie-lyon.fr');
  });

  it("refuse avant la première publication", async () => {
    const { p } = setup();
    await expect(p.configureDomain(site, 'mairie-lyon.fr')).rejects.toThrow('publié au moins une fois');
  });

  it('vérifie le CNAME de www puis le A du domaine nu, et demande le certificat', async () => {
    const { api, p, s, dns } = await published();
    await p.configureDomain(s, 'mairie-lyon.fr');

    let check = await p.verifyDomain(s, 'mairie-lyon.fr');
    expect(check).toMatchObject({ ok: false, mismatch: { type: 'CNAME', name: 'www.mairie-lyon.fr', expected: 'communeo-lyon.b-cdn.net', found: [] } });

    dns.cname.set('www.mairie-lyon.fr', ['communeo-lyon.b-cdn.net.']);
    dns.a.set('mairie-lyon.fr', ['203.0.113.10', '192.0.2.50']);
    check = await p.verifyDomain(s, 'mairie-lyon.fr');
    expect(check).toMatchObject({ ok: false, mismatch: { type: 'A', name: 'mairie-lyon.fr', expected: '203.0.113.10', found: ['203.0.113.10', '192.0.2.50'] } });

    dns.a.set('mairie-lyon.fr', ['203.0.113.10']);
    expect(await p.verifyDomain(s, 'mairie-lyon.fr')).toEqual({ ok: true, errors: [] });
    expect(api.zone('communeo-lyon').Hostnames.find((entry) => entry.Value === 'www.mairie-lyon.fr')).toMatchObject({ HasCertificate: true, ForceSSL: true });
  });

  it("accepte un CNAME aplati (Bunny DNS chez la commune) quand la réponse vient de la Pull Zone", async () => {
    const { api, p, s } = await published();
    await p.configureDomain(s, 'www.ville-lyon.fr');
    expect((await p.verifyDomain(s, 'www.ville-lyon.fr')).ok).toBe(false);
    api.flattened.add('www.ville-lyon.fr');
    expect(await p.verifyDomain(s, 'www.ville-lyon.fr')).toEqual({ ok: true, errors: [] });
  });

  it("le domaine reste vérifié même si le certificat n'est pas encore délivré", async () => {
    const { api, p, s, dns } = await published();
    await p.configureDomain(s, 'www.ville-lyon.fr');
    dns.cname.set('www.ville-lyon.fr', ['communeo-lyon.b-cdn.net']);
    api.unreachable.add('www.ville-lyon.fr');
    expect((await p.verifyDomain(s, 'www.ville-lyon.fr')).ok).toBe(true);
  });

  it("retire le domaine et sa redirection ; l'adresse Communeo redevient l'adresse du site", async () => {
    const { api, p, s } = await published();
    await p.configureDomain(s, 'mairie-lyon.fr');
    await p.publish({ ...s, customDomain: 'mairie-lyon.fr' }, build);
    expect(rule(api.zone('communeo-lyon'), BUNNY_RULES.canonical)).toBeDefined();

    expect(await p.removeDomain(s, 'mairie-lyon.fr')).toEqual({ defaultUrl: 'https://lyon.communeo.fr' });
    const zone = api.zone('communeo-lyon');
    expect(zone.Hostnames.map((entry) => entry.Value)).toEqual(['communeo-lyon.b-cdn.net', 'lyon.communeo.fr']);
    expect(rule(zone, BUNNY_RULES.canonical)).toBeUndefined();
  });

  it('décrit les certificats des adresses du site', async () => {
    const { p, s } = await published();
    expect(await p.certificateStatus(s)).toEqual({ hostnames: [{ hostname: 'lyon.communeo.fr', certificate: true, forceSsl: true }] });
    expect(await p.certificateStatus(site)).toBeNull();
  });
});

describe('deleteSite', () => {
  it('supprime la Pull Zone, le CNAME de la commune et le dossier du site', async () => {
    const { api, p } = setup();
    const { hostId } = await p.ensureSite(site);
    await p.publish({ ...site, hostId }, build);
    expect(fs.existsSync(path.join(root, 'lyon', 'index.html'))).toBe(true);

    await p.deleteSite({ ...site, hostId });
    expect(api.zones.size).toBe(0);
    expect(api.records.map((record) => record.Name)).toEqual(['app']);
    expect(fs.existsSync(path.join(root, 'lyon'))).toBe(false);
  });

  it("retrouve la commune par le nom de sa Pull Zone quand seul l'identifiant est connu (commune supprimée pendant un build)", async () => {
    const { api, p } = setup();
    const { hostId } = await p.ensureSite(site);
    await p.publish({ ...site, hostId }, build);
    await p.deleteSite({ documentId: '', slug: hostId, name: '', hostId });
    expect(api.zones.size).toBe(0);
    expect(fs.existsSync(path.join(root, 'lyon'))).toBe(false);
  });

  it("supprime le reste même si la Pull Zone n'existe plus, puis signale l'erreur d'une étape", async () => {
    const { api, p } = setup();
    const { hostId } = await p.ensureSite(site);
    await p.publish({ ...site, hostId }, build);
    api.zones.clear();
    await p.deleteSite({ ...site, hostId });
    expect(fs.existsSync(path.join(root, 'lyon'))).toBe(false);

    await p.publish(site, build);
    api.setOverride((call) => (call.method === 'DELETE' && /^\/pullzone\/\d+$/.test(call.path) ? { status: 401, body: 'Unauthorized' } : undefined));
    await expect(p.deleteSite(site)).rejects.toThrow('Bunny API 401');
    expect(fs.existsSync(path.join(root, 'lyon'))).toBe(false);
    expect(api.records.map((record) => record.Name)).toEqual(['app']);
  });
});

describe('getPublisher', () => {
  const bunnyEnv = { SITES_PUBLISHER: 'bunny', BUNNY_API_KEY: 'k', SITES_ORIGIN_SECRET: 's', ORIGIN_DOMAIN: 'origine.communeo.fr' };

  it('choisit Bunny seulement avec SITES_PUBLISHER=bunny', () => {
    expect(getPublisher(bunnyEnv).id).toBe('bunny');
    expect(getPublisher({ ...bunnyEnv, NETLIFY_TOKEN: 't', PUBLISH_DIR: '/srv/sites' }).id).toBe('bunny');
    // Au merge, rien ne change : la clé seule ne suffit pas
    expect(getPublisher({ BUNNY_API_KEY: 'k', SITES_ORIGIN_SECRET: 's', NETLIFY_TOKEN: 't' }).id).toBe('netlify');
    expect(getPublisher({ BUNNY_API_KEY: 'k', PUBLISH_DIR: '/srv/sites' }).id).toBe('local');
    expect(getPublisher({ SITES_PUBLISHER: 'netlify', NETLIFY_TOKEN: 't' }).id).toBe('netlify');
  });

  it('indisponible (jamais un autre hébergeur) quand il manque la clé, le secret ou le nom de l’origine', async () => {
    for (const missing of ['BUNNY_API_KEY', 'SITES_ORIGIN_SECRET', 'ORIGIN_DOMAIN'] as const) {
      const publisher = getPublisher({ ...bunnyEnv, [missing]: '', NETLIFY_TOKEN: 't' });
      expect(publisher.configured).toBe(false);
      await expect(publisher.ensureSite(site)).rejects.toThrow(PublisherUnavailableError);
      await expect(publisher.ensureSite(site)).rejects.toThrow(missing);
    }
  });

  it('nouvel adaptateur quand une variable change', () => {
    const first = getPublisher(bunnyEnv);
    expect(getPublisher({ ...bunnyEnv })).toBe(first);
    expect(getPublisher({ ...bunnyEnv, BUNNY_DNS_ZONE_ID: '77' })).not.toBe(first);
  });
});

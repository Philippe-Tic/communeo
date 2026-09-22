/**
 * Adaptateur Netlify contre une API simulée : aucun appel réseau.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPublisher, PublisherUnavailableError } from '../src/publishing';
import { NetlifyPublisher } from '../src/publishing/netlify';

interface Call {
  method: string;
  path: string;
  body?: any;
  contentType?: string;
}

type Handler = (call: Call) => { status?: number; body?: unknown } | undefined;

/** Fausse API Netlify : chaque requête est journalisée puis confiée au handler. */
function fakeNetlify(handler: Handler) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit = {}) => {
    const headers = init.headers as Record<string, string>;
    const call: Call = {
      method: init.method ?? 'GET',
      path: url.replace('https://api.netlify.com/api/v1', ''),
      contentType: headers['Content-Type'],
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
    };
    calls.push(call);
    const res = handler(call) ?? { status: 404, body: 'Not Found' };
    const text = res.body === undefined ? '' : typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    return new Response(text || null, { status: res.status ?? 200 });
  }) as typeof fetch;
  return { calls, fetch };
}

const site = { documentId: 'doc-1', slug: 'lyon', name: 'Lyon' };
const other = (i: number) => ({ id: `other-${i}`, name: `commune-${i}-mairie` });

function publisher(handler: Handler, extra: Partial<ConstructorParameters<typeof NetlifyPublisher>[0]> = {}) {
  const api = fakeNetlify(handler);
  const p = new NetlifyPublisher({ token: 't', fetch: api.fetch, sleep: async () => {}, ...extra });
  return { api, p };
}

describe('ensureSite', () => {
  it('parcourt toutes les pages de sites (plus de 100)', async () => {
    const { api, p } = publisher(({ method, path }) => {
      if (method !== 'GET' || !path.startsWith('/sites?')) return undefined;
      const page = new URLSearchParams(path.split('?')[1]).get('page');
      if (page === '1') return { body: Array.from({ length: 100 }, (_, i) => other(i)) };
      if (page === '2') return { body: [other(100), { id: 'site-lyon', name: 'lyon-mairie' }] };
      return { body: [] };
    });
    expect(await p.ensureSite(site)).toEqual({ hostId: 'site-lyon', defaultUrl: 'https://lyon-mairie.netlify.app' });
    expect(api.calls.filter((c) => c.method === 'POST')).toHaveLength(0);
    expect(api.calls[0].path).toContain('name=lyon-mairie');
  });

  it("crée le site quand il n'existe pas, avec le préfixe d'environnement", async () => {
    const { api, p } = publisher(
      ({ method, path, body }) => {
        if (method === 'GET' && path.startsWith('/sites?')) return { body: [other(1)] };
        if (method === 'POST' && path === '/sites') return { status: 201, body: { id: 'new', name: body.name } };
        return undefined;
      },
      { namePrefix: 'dev-' },
    );
    expect(await p.ensureSite(site)).toEqual({ hostId: 'new', defaultUrl: 'https://dev-lyon-mairie.netlify.app' });
    expect(api.calls.at(-1)?.body).toEqual({ name: 'dev-lyon-mairie' });
  });

  it('retrouve le site par son nom quand son identifiant a disparu chez Netlify', async () => {
    const { p } = publisher(({ method, path }) => {
      if (path === '/sites/gone') return { status: 404, body: 'Not Found' };
      if (method === 'GET' && path.startsWith('/sites?')) return { body: [{ id: 'site-lyon', name: 'lyon-mairie' }] };
      return undefined;
    });
    expect((await p.ensureSite({ ...site, hostId: 'gone' })).hostId).toBe('site-lyon');
  });

  it("propage les autres erreurs de l'API", async () => {
    const { p } = publisher(() => ({ status: 401, body: 'Access Denied' }));
    await expect(p.ensureSite({ ...site, hostId: 'x' })).rejects.toThrow('Netlify API 401');
  });
});

describe('publish', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publisher-'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<h1>Lyon</h1>');
    fs.writeFileSync(path.join(dir, '_redirects'), '/ancienne /nouvelle 301\n');
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const deployApi = (states: string[]): Handler => {
    let poll = 0;
    return ({ method, path }) => {
      if (path === '/sites/site-lyon') return { body: { id: 'site-lyon', name: 'lyon-mairie' } };
      if (method === 'POST' && path === '/sites/site-lyon/deploys') return { body: { id: 'dep-1', state: 'uploaded' } };
      if (path === '/deploys/dep-1') {
        const state = states[Math.min(poll++, states.length - 1)];
        return { body: { id: 'dep-1', state, error_message: state === 'error' ? 'Fichier trop gros' : null } };
      }
      if (method === 'POST' && path === '/sites/site-lyon/deploys/dep-1/restore') return { body: { id: 'dep-1' } };
      return undefined;
    };
  };

  it('dépose un ZIP, attend la mise en ligne et publie en production', async () => {
    const { api, p } = publisher(deployApi(['processing', 'ready']));
    const result = await p.publish({ ...site, hostId: 'site-lyon' }, dir);
    expect(result).toEqual({ hostId: 'site-lyon', defaultUrl: 'https://lyon-mairie.netlify.app', deployId: 'dep-1', state: 'ready' });

    const upload = api.calls.find((c) => c.path === '/sites/site-lyon/deploys')!;
    expect(upload.contentType).toBe('application/zip');
    expect((upload.body as Buffer).subarray(0, 2).toString()).toBe('PK');
    expect(api.calls.at(-1)?.path).toBe('/sites/site-lyon/deploys/dep-1/restore');
    // Pas de domaine personnalisé : les redirections du site restent intactes
    expect(fs.readFileSync(path.join(dir, '_redirects'), 'utf8')).toBe('/ancienne /nouvelle 301\n');
  });

  it("redirige l'adresse netlify.app vers le domaine personnalisé vérifié", async () => {
    const { p } = publisher(deployApi(['ready']));
    await p.publish({ ...site, hostId: 'site-lyon', customDomain: 'mairie-lyon.fr' }, dir);
    expect(fs.readFileSync(path.join(dir, '_redirects'), 'utf8')).toBe(
      'https://lyon-mairie.netlify.app/* https://mairie-lyon.fr/:splat 301!\n/ancienne /nouvelle 301\n',
    );
  });

  it('échoue quand Netlify refuse le dépôt', async () => {
    const { p } = publisher(deployApi(['processing', 'error']));
    await expect(p.publish({ ...site, hostId: 'site-lyon' }, dir)).rejects.toThrow('Fichier trop gros');
  });

  it('rend la main en « building » quand le traitement dépasse le délai', async () => {
    const { p } = publisher(deployApi(['processing']), { deployTimeoutMs: 0 });
    expect((await p.publish({ ...site, hostId: 'site-lyon' }, dir)).state).toBe('building');
  });
});

describe('status', () => {
  it('ramène les états Netlify à building / ready / error', async () => {
    const states: Record<string, string> = { a: 'enqueued', b: 'ready', c: 'rejected' };
    const { p } = publisher(({ path }) => {
      const id = path.split('/').pop()!;
      return { body: { id, state: states[id] } };
    });
    expect(await p.status('a')).toEqual({ state: 'building' });
    expect(await p.status('b')).toEqual({ state: 'ready' });
    expect(await p.status('c')).toEqual({ state: 'error', error: 'Dépôt rejected' });
  });
});

describe('domaines', () => {
  const hosted = { ...site, hostId: 'site-lyon' };

  it('rattache un apex, ajoute www et renvoie les enregistrements DNS', async () => {
    const { api, p } = publisher(({ method, path, body }) => {
      if (method === 'PATCH' && path === '/sites/site-lyon') {
        return { body: { id: 'site-lyon', name: 'lyon-mairie', custom_domain: body.custom_domain ?? 'mairie-lyon.fr', domain_aliases: body.domain_aliases ?? [] } };
      }
      return undefined;
    });
    const dns = await p.configureDomain(hosted, 'mairie-lyon.fr');
    expect(api.calls.map((c) => c.body)).toEqual([{ custom_domain: 'mairie-lyon.fr' }, { domain_aliases: ['www.mairie-lyon.fr'] }]);
    expect(dns.target).toBe('lyon-mairie.netlify.app');
    expect(dns.records.map((r) => [r.type, r.displayName, r.value])).toEqual([
      ['A', '@', '75.2.60.5'],
      ['CNAME', 'www', 'lyon-mairie.netlify.app'],
    ]);
  });

  it('signale un domaine refusé silencieusement par Netlify', async () => {
    const { p } = publisher(() => ({ body: { id: 'site-lyon', name: 'lyon-mairie', custom_domain: null } }));
    await expect(p.configureDomain(hosted, 'www.mairie-lyon.fr')).rejects.toThrow(/refusé le domaine/);
  });

  it("exige une première publication avant d'ajouter un domaine", async () => {
    const { p } = publisher(() => undefined);
    await expect(p.configureDomain(site, 'mairie-lyon.fr')).rejects.toThrow(/publié au moins une fois/);
  });

  it("vérifie le pointage DNS puis demande le certificat HTTPS", async () => {
    const { api, p } = publisher(() => ({ body: {} }), {
      resolve4: async () => ['1.2.3.4'],
      resolveCname: async () => ['lyon-mairie.netlify.app'],
    });
    expect(await p.verifyDomain(hosted, 'mairie-lyon.fr')).toEqual({
      ok: false,
      errors: ['Enregistrement A non configuré ou ne pointe pas vers 75.2.60.5'],
    });
    expect(api.calls).toHaveLength(0);

    expect(await p.verifyDomain(hosted, 'www.mairie-lyon.fr')).toEqual({ ok: true, errors: [] });
    expect(api.calls.map((c) => [c.method, c.path, c.body])).toEqual([
      ['POST', '/sites/site-lyon/ssl', undefined],
      ['PATCH', '/sites/site-lyon', { force_ssl: true }],
    ]);
  });

  it("traite un nom absent du DNS comme non pointé", async () => {
    const notFound = Object.assign(new Error('queryCname ENOTFOUND'), { code: 'ENOTFOUND' });
    const { p } = publisher(() => undefined, { resolveCname: async () => { throw notFound; } });
    expect((await p.verifyDomain(hosted, 'www.mairie-lyon.fr')).ok).toBe(false);
  });

  it("détache le domaine et l'alias www, et renvoie l'adresse par défaut", async () => {
    const { api, p } = publisher(({ body }) => ({
      body: { id: 'site-lyon', name: 'lyon-mairie', custom_domain: null, domain_aliases: body.domain_aliases ?? ['www.mairie-lyon.fr', 'autre.fr'] },
    }));
    expect(await p.removeDomain(hosted, 'mairie-lyon.fr')).toEqual({ defaultUrl: 'https://lyon-mairie.netlify.app' });
    expect(api.calls.map((c) => c.body)).toEqual([{ custom_domain: null }, { domain_aliases: ['autre.fr'] }]);
  });
});

describe('deleteSite', () => {
  it('accepte la réponse 204 sans corps', async () => {
    const { api, p } = publisher(({ method }) => (method === 'DELETE' ? { status: 204 } : undefined));
    await p.deleteSite({ ...site, hostId: 'site-lyon' });
    expect(api.calls).toEqual([expect.objectContaining({ method: 'DELETE', path: '/sites/site-lyon' })]);
  });
});

describe('getPublisher', () => {
  it('sans NETLIFY_TOKEN, renvoie un adaptateur qui refuse chaque action', async () => {
    const p = getPublisher({ NODE_ENV: 'test' });
    expect(p.configured).toBe(false);
    await expect(p.publish(site, '/tmp')).rejects.toBeInstanceOf(PublisherUnavailableError);
    await expect(p.ensureSite(site)).rejects.toThrow("NETLIFY_TOKEN n'est pas défini");
  });

  it('avec NETLIFY_TOKEN, renvoie l\'adaptateur Netlify', () => {
    const p = getPublisher({ NODE_ENV: 'production', NETLIFY_TOKEN: 'secret' });
    expect(p.id).toBe('netlify');
    expect(p.configured).toBe(true);
  });
});

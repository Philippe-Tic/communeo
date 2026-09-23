/**
 * Traitement d'un build avec des doubles (Strapi, renderer, hébergeur) : pas de réseau ni de file.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BuildJob, BuildSite, FinishBuildRequest, SitePublisher } from '@communeo/pipeline';
import { cleanText, cleanWorkDir, processBuild, type BuildDeps } from '../src/build';
import { rendererEnv, run, type RenderRequest } from '../src/renderer';

const site: BuildSite = { documentId: 'doc-lyon', slug: 'lyon', name: 'Lyon', theme: 'institutionnel', hostId: null, customDomain: null };
const silent = { debug() {}, info() {}, warn() {}, error() {} };

function job(overrides: Partial<BuildJob> = {}): BuildJob {
  return {
    id: 'job-1',
    name: 'site-build',
    data: { siteDocumentId: 'doc-lyon', triggeredBy: 'user-1', reason: 'manual' },
    signal: new AbortController().signal,
    retryCount: 0,
    retryLimit: 1,
    ...overrides,
  } as BuildJob;
}

let workDir: string;
let finished: FinishBuildRequest[];
let rendered: RenderRequest[];
let steps: string[];

function deps(overrides: Partial<BuildDeps> = {}, siteOverrides: Partial<BuildSite> = {}): BuildDeps {
  const publisher = {
    ensureSite: vi.fn(async () => ({ hostId: 'host-lyon', defaultUrl: 'https://lyon-mairie.netlify.app' })),
    publish: vi.fn(async (_site, dir: string, options?: { onUploaded?: () => Promise<void> | void }) => {
      await options?.onUploaded?.();
      // Le dossier publié contient bien le site construit
      expect(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')).toContain('Lyon');
      return { hostId: 'host-lyon', defaultUrl: 'https://lyon-mairie.netlify.app', deployId: 'dep-1', state: 'ready' as const };
    }),
  } as unknown as SitePublisher;
  return {
    strapi: {
      start: vi.fn(async () => ({ deploymentId: 'deployment-1', site: { ...site, ...siteOverrides } })),
      progress: vi.fn(async (_jobId: string, step: string) => {
        steps.push(step);
      }),
      finish: vi.fn(async (_jobId: string, request: FinishBuildRequest) => {
        finished.push(request);
      }),
    },
    renderer: {
      build: async (request) => {
        rendered.push(request);
        fs.writeFileSync(path.join(request.outDir, 'index.html'), `<h1>${request.site.name}</h1>`);
      },
    },
    publisher,
    workDir,
    timeoutSeconds: 60,
    logger: silent,
    ...overrides,
  };
}

const buildDirs = () => fs.readdirSync(workDir).filter((name) => name.startsWith('build-'));

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-test-'));
  finished = [];
  rendered = [];
  steps = [];
});
afterEach(() => fs.rmSync(workDir, { recursive: true, force: true }));

describe('processBuild', () => {
  it('construit, publie et rend compte à Strapi, puis supprime le dossier de build', async () => {
    const d = deps();
    await processBuild(job(), d);

    expect(d.strapi.start).toHaveBeenCalledWith('job-1', { siteDocumentId: 'doc-lyon', triggeredBy: 'user-1', reason: 'manual', attempt: 0 });
    expect(steps).toEqual(['rendering', 'publishing', 'cache']);
    expect(rendered[0]?.siteUrl).toBe('https://lyon-mairie.netlify.app');
    expect(finished).toEqual([
      { status: 'ready', buildSeconds: expect.any(Number), deployId: 'dep-1', hostId: 'host-lyon', defaultUrl: 'https://lyon-mairie.netlify.app' },
    ]);
    expect(buildDirs()).toEqual([]);
  });

  it("continue quand l'étape en cours ne peut pas être transmise", async () => {
    const d = deps();
    d.strapi.progress = async () => {
      throw new Error('Strapi 502');
    };
    await processBuild(job(), d);
    expect(finished[0]?.status).toBe('ready');
  });

  it('construit avec le domaine personnalisé vérifié comme adresse canonique', async () => {
    await processBuild(job(), deps({}, { customDomain: 'mairie-lyon.fr', hostId: 'host-lyon' }));
    expect(rendered[0]?.siteUrl).toBe('https://mairie-lyon.fr');
  });

  it("relance sans signaler d'erreur tant qu'il reste une tentative", async () => {
    const d = deps({ renderer: { build: async () => { throw new Error('astro a échoué'); } } });
    await expect(processBuild(job({ retryCount: 0, retryLimit: 1 }), d)).rejects.toThrow('astro a échoué');
    expect(finished).toEqual([]);
    expect(buildDirs()).toEqual([]);
  });

  it('signale une seule erreur à la dernière tentative, avec la cause', async () => {
    const d = deps({ renderer: { build: async () => { throw new Error('astro a échoué (code 1)\nPage introuvable'); } } });
    await expect(processBuild(job({ retryCount: 1, retryLimit: 1 }), d)).rejects.toThrow();
    expect(finished).toEqual([
      { status: 'error', error: 'astro a échoué (code 1)\nPage introuvable', buildSeconds: expect.any(Number), hostId: 'host-lyon' },
    ]);
    expect(buildDirs()).toEqual([]);
  });

  it('interrompt un build trop long', async () => {
    const d = deps({
      timeoutSeconds: 0.05,
      renderer: {
        build: ({ signal }) =>
          new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Build interrompu')))),
      },
    });
    await expect(processBuild(job({ retryCount: 1 }), d)).rejects.toThrow();
    expect(finished[0]?.error).toBe('durée maximale du build dépassée');
    expect(buildDirs()).toEqual([]);
  });

  it('ne crée pas de dossier quand Strapi refuse le début du build', async () => {
    const d = deps();
    d.strapi.start = async () => {
      throw new Error('Strapi 503');
    };
    await expect(processBuild(job(), d)).rejects.toThrow('Strapi 503');
    expect(buildDirs()).toEqual([]);
  });
});

describe('cleanText', () => {
  it('retire les codes de couleur et les caractères refusés par Postgres', () => {
    expect(cleanText('\u001b[31mErreur\u001b[39m depuis "\u0000virtual:communeo/theme"\n\tligne 2')).toBe(
      'Erreur depuis "virtual:communeo/theme"\n\tligne 2',
    );
  });

  it("nettoie l'erreur signalée à Strapi et celle rejetée vers la file", async () => {
    const d = deps({ renderer: { build: async () => { throw new Error('import "\u0000virtual:x" introuvable'); } } });
    const rejected = await processBuild(job({ retryCount: 1 }), d).catch((error: Error) => error);
    expect(rejected?.message).toBe('import "virtual:x" introuvable');
    expect(finished[0]?.error).toBe('import "virtual:x" introuvable');
  });
});

describe('cleanWorkDir', () => {
  it('supprime les dossiers de build laissés par un worker arrêté, et eux seuls', async () => {
    fs.mkdirSync(path.join(workDir, 'build-lyon-abc'));
    fs.writeFileSync(path.join(workDir, 'build-lyon-abc', 'index.html'), '');
    fs.mkdirSync(path.join(workDir, 'autre'));
    await cleanWorkDir(workDir);
    expect(fs.readdirSync(workDir)).toEqual(['autre']);
  });
});

describe('run', () => {
  const opts = (signal = new AbortController().signal) => ({ cwd: workDir, env: { PATH: process.env.PATH }, signal });

  it("rapporte la fin de la sortie d'une commande en échec", async () => {
    const script = "console.log('ligne 1'); console.error('Erreur : thème inconnu'); process.exit(3)";
    await expect(run(process.execPath, ['-e', script], opts())).rejects.toThrow(/code 3\)\n[\s\S]*thème inconnu/);
  });

  it('tue la commande quand le build est interrompu', async () => {
    const controller = new AbortController();
    const pending = run(process.execPath, ['-e', 'setTimeout(() => {}, 60_000)'], opts(controller.signal));
    controller.abort();
    await expect(pending).rejects.toThrow('Build interrompu');
  });
});

describe('rendererEnv', () => {
  it("ne transmet au build que le token en lecture seule, jamais les secrets du worker", () => {
    const env = rendererEnv(
      { rendererDir: '/r', strapiUrl: 'http://strapi:1337', strapiPublicUrl: 'https://cms.test', strapiBuildToken: 'lecture-seule' },
      { site: { ...site, theme: 'starter' }, outDir: '/tmp/out', siteUrl: 'https://lyon.fr' },
      { PATH: '/bin', HOME: '/home/node', NETLIFY_TOKEN: 'secret', WORKER_SECRET: 'secret', QUEUE_DATABASE_URL: 'postgres://secret', DATABASE_PASSWORD: 'secret' },
    );
    expect(env).toEqual({
      NODE_ENV: 'production',
      PATH: '/bin',
      HOME: '/home/node',
      THEME: 'starter',
      RENDER_MODE: 'static',
      DATA_SOURCE: 'strapi',
      OUT_DIR: '/tmp/out',
      SITE_URL: 'https://lyon.fr',
      SITE_DOCUMENT_ID: 'doc-lyon',
      STRAPI_URL: 'http://strapi:1337',
      STRAPI_PUBLIC_URL: 'https://cms.test',
      STRAPI_TOKEN: 'lecture-seule',
    });
  });
});

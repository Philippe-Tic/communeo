/**
 * Build statique d'une commune par le renderer Astro, puis index de recherche Pagefind.
 * Seules les variables utiles au build sont transmises : jamais les secrets du worker
 * (base de la file, jeton de l'hébergeur, secret partagé avec Strapi).
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { BuildSite } from '@communeo/pipeline';

export interface RenderRequest {
  site: BuildSite;
  outDir: string;
  /** Adresse publique du site (liens canoniques, sitemap) */
  siteUrl: string;
  signal: AbortSignal;
}

export interface Renderer {
  build(request: RenderRequest): Promise<void>;
}

export interface AstroRendererOptions {
  rendererDir: string;
  strapiUrl: string;
  strapiPublicUrl: string;
  strapiBuildToken: string;
}

const INHERITED = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'NODE_OPTIONS', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY'];

export function createAstroRenderer(options: AstroRendererOptions): Renderer {
  return {
    async build(request) {
      const { signal } = request;
      const env = rendererEnv(options, request);
      const astro = astroBin(options.rendererDir);
      await run(process.execPath, [astro, 'build'], { cwd: options.rendererDir, env, signal });
      await run(process.execPath, ['scripts/pagefind.mjs', request.outDir], { cwd: options.rendererDir, env, signal });
    },
  };
}

/** Environnement du build : quelques variables système et les données du site, rien d'autre. */
export function rendererEnv(
  options: AstroRendererOptions,
  { site, outDir, siteUrl }: Pick<RenderRequest, 'site' | 'outDir' | 'siteUrl'>,
  parent: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
  for (const key of INHERITED) if (parent[key] !== undefined) env[key] = parent[key];
  return {
    ...env,
    THEME: site.theme,
    RENDER_MODE: 'static',
    DATA_SOURCE: 'strapi',
    OUT_DIR: outDir,
    SITE_URL: siteUrl,
    SITE_DOCUMENT_ID: site.documentId,
    STRAPI_URL: options.strapiUrl,
    STRAPI_PUBLIC_URL: options.strapiPublicUrl,
    STRAPI_TOKEN: options.strapiBuildToken,
  };
}

/** Exécutable d'Astro installé dans le renderer (champ `bin` de son package.json). */
function astroBin(rendererDir: string): string {
  const dir = path.join(rendererDir, 'node_modules', 'astro');
  const { bin } = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as { bin: string | Record<string, string> };
  return path.join(dir, typeof bin === 'string' ? bin : (bin.astro ?? 'bin/astro.mjs'));
}

/** Lance une commande ; en cas d'échec, l'erreur reprend la fin de sa sortie. */
export function run(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; signal: AbortSignal },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'], killSignal: 'SIGKILL' });
    const output: string[] = [];
    const keep = (chunk: Buffer) => {
      output.push(chunk.toString());
      if (output.length > 200) output.splice(0, output.length - 200);
    };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('error', (error) => reject(options.signal.aborted ? abortError(options.signal) : error));
    child.on('close', (code) => {
      if (options.signal.aborted) return reject(abortError(options.signal));
      if (code === 0) return resolve();
      const tail = output.join('').trim().split('\n').slice(-20).join('\n');
      reject(new Error(`${path.basename(args[0] ?? command)} a échoué (code ${code})\n${tail}`));
    });
  });
}

function abortError(signal: AbortSignal): Error {
  const reason = signal.reason;
  return reason instanceof Error && reason.name === 'TimeoutError'
    ? new Error('Build interrompu : durée maximale dépassée')
    : new Error('Build interrompu');
}

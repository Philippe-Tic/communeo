/**
 * Règles d'un site servi par Caddy sur le serveur (#381) : le pendant du `_redirects` et du `_headers`
 * de Netlify, dans un fichier par site importé par le Caddyfile (caddy/Caddyfile, bloc de l'origine).
 *
 * Format (utilisé par l'adaptateur de publication sur le serveur, #382) :
 * - fichier `<PUBLISH_DIR>/<slug>/.regles/site.caddy` (`/srv/sites/<slug>/.regles/site.caddy` dans
 *   Caddy), écrit avec le site à chaque publication, jamais servi (`hide .regles`) ;
 * - directives Caddyfile appliquées dans l'ordre, avant les fichiers du site (dans un `route`), sur les
 *   adresses de l'origine `/sites/<slug>/…` ; noms de matchers préfixés `@site-<slug>` (uniques entre
 *   les sites, tous importés dans le même bloc) ;
 * - dans l'ordre : `X-Robots-Tag: noindex` (site en essai), redirection vers l'adresse canonique
 *   (requête reçue par une autre adresse du site, que le CDN transmet dans `X-Forwarded-Host`), puis
 *   les redirections 301 de l'ancien site (#335). Les destinations sont relatives (`/contact`) : le
 *   navigateur les résout sur l'adresse publique du site, pas sur celle de l'origine ;
 * - pris en compte par un rechargement de Caddy (`reloadCaddy`) : une règle invalide est refusée par
 *   Caddy, qui garde la configuration en cours.
 */

export const CADDY_RULES_DIR = '.regles';
export const CADDY_RULES_FILE = 'site.caddy';
/** Chemin du fichier de règles dans le dossier d'un site */
export const CADDY_RULES_PATH = `${CADDY_RULES_DIR}/${CADDY_RULES_FILE}`;
/** En-tête dans lequel le CDN transmet l'adresse demandée par le visiteur */
export const FORWARDED_HOST_HEADER = 'X-Forwarded-Host';

export interface CaddySiteRulesInput {
  slug: string;
  /** Site en essai : aucune page indexée */
  noindex?: boolean;
  /** Adresse canonique (domaine personnalisé vérifié) : les autres adresses du site y redirigent */
  canonicalHost?: string | null;
  /** Redirections de l'ancien site : ancienne adresse (chemin et requête) → page du site */
  redirects?: Array<{ from: string; to: string }>;
  /**
   * Fichiers du site publié (chemins relatifs, `contact.html`, `actualites/index.html`) : comme chez
   * Netlify, une redirection sans requête ne masque jamais une page réellement présente à cette adresse.
   */
  files?: ReadonlySet<string>;
}

export interface CaddySiteRules {
  /** Contenu du fichier `.regles/site.caddy` */
  content: string;
  /** Redirections écartées : caractères qu'une règle Caddy ne peut pas porter sans risque */
  skipped: Array<{ from: string; to: string }>;
}

const SLUG = /^[a-z0-9-]+$/;
const HOST = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;
/** Caractères d'un chemin admis tels quels dans une règle (ni `*`, ni accolades, ni guillemets, ni espaces) */
const SAFE_PATH = /^\/[A-Za-z0-9\-._~!$&()+,;=:@%/]*$/;
/** Valeur de requête ou destination : ni guillemet, ni barre oblique inverse, ni accolade, ni caractère de contrôle */
// eslint-disable-next-line no-control-regex -- justement les caractères refusés
const UNSAFE_TEXT = /["\\{}\u0000-\u001f\u007f]/;

export function caddySiteRules(input: CaddySiteRulesInput): CaddySiteRules {
  const { slug } = input;
  if (!SLUG.test(slug)) throw new Error(`Slug invalide : ${slug}`);
  const prefix = `/sites/${slug}`;
  const name = `site-${slug}`;
  const lines = [`# Règles du site « ${slug} » (Communeo), réécrites à chaque publication : ne pas modifier`];
  const skipped: CaddySiteRules['skipped'] = [];

  if (input.noindex) lines.push(`@${name} path ${prefix} ${prefix}/*`, `header @${name} X-Robots-Tag "noindex, nofollow"`);

  const canonical = input.canonicalHost?.trim().toLowerCase();
  if (canonical) {
    if (!HOST.test(canonical)) throw new Error(`Adresse canonique invalide : ${canonical}`);
    const capture = `${name.replace(/-/g, '_')}_chemin`;
    lines.push(
      `@${name}-canonique {`,
      `\tpath ${prefix} ${prefix}/*`,
      `\theader ${FORWARDED_HOST_HEADER} *`,
      `\tnot header ${FORWARDED_HOST_HEADER} ${canonical}`,
      `\tpath_regexp ${capture} ^${prefix}/?(.*)$`,
      '}',
      `redir @${name}-canonique https://${canonical}/{re.${capture}.1}{?query} 301`,
    );
  }

  let count = 0;
  for (const redirect of input.redirects ?? []) {
    const rule = redirectRule(redirect, input.files);
    if (rule === null) continue;
    if (rule === 'skipped') {
      skipped.push(redirect);
      continue;
    }
    count += 1;
    const matcher = `@${name}-${count}`;
    const paths = [`"${prefix}${rule.path}"`, ...(rule.path === '/' ? [] : [`"${prefix}${rule.path}/"`])].join(' ');
    if (rule.query.length) lines.push(`${matcher} {`, `\tpath ${paths}`, `\tquery ${rule.query.map((pair) => `"${pair}"`).join(' ')}`, '}');
    else lines.push(`${matcher} path ${paths}`);
    lines.push(`redir ${matcher} "${redirect.to}" 301`);
  }

  return { content: `${lines.join('\n')}\n`, skipped };
}

/**
 * Une redirection en règle Caddy : `null` si elle est inutile (vers elle-même, ou une page du site
 * existe à cette adresse), `'skipped'` si elle contient des caractères qu'on n'écrit pas dans le Caddyfile.
 */
function redirectRule({ from, to }: { from: string; to: string }, files?: ReadonlySet<string>): { path: string; query: string[] } | null | 'skipped' {
  const [pathname = '', query = ''] = from.split('?') as [string, string?];
  if (pathname.replace(/\.html?$/, '') === to.split('?')[0]) return null;
  if (!SAFE_PATH.test(pathname) || !to.startsWith('/') || UNSAFE_TEXT.test(to)) return 'skipped';
  const pairs: string[] = [];
  for (const [key, value] of new URLSearchParams(query)) {
    if (!key || UNSAFE_TEXT.test(key) || UNSAFE_TEXT.test(value) || key.includes('=') || value === '*') return 'skipped';
    pairs.push(`${key}=${value}`);
  }
  // Une règle avec requête (`/?p=12`) vise justement une adresse dont le chemin existe
  if (!pairs.length && files && pageExists(pathname, files)) return null;
  return { path: pathname, query: pairs };
}

/** Une page du site répond-elle à ce chemin ? (`/x` : `x`, `x.html` ou `x/index.html`) */
function pageExists(pathname: string, files: ReadonlySet<string>): boolean {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Adresse mal encodée : prise telle quelle
  }
  const relative = decoded.replace(/^\/+|\/+$/g, '');
  if (!relative) return true;
  return files.has(relative) || files.has(`${relative}.html`) || files.has(`${relative}/index.html`);
}

export interface ReloadCaddyOptions {
  fetch?: typeof fetch;
  /** Caddyfile lu par Caddy (dans son conteneur) */
  caddyfile?: string;
  timeoutMs?: number;
}

/**
 * Recharge Caddy par son API d'administration (réseau interne) : le Caddyfile est relu par Caddy,
 * fichiers de règles des sites compris. Configuration refusée (règle invalide) : Caddy garde celle en
 * cours et l'erreur est levée.
 */
export async function reloadCaddy(adminUrl: string, options: ReloadCaddyOptions = {}): Promise<void> {
  const doFetch = options.fetch ?? globalThis.fetch;
  const base = adminUrl.replace(/\/+$/, '');
  const response = await doFetch(`${base}/load`, {
    method: 'POST',
    // Origin attendu par Caddy (`origins` du Caddyfile) : fetch envoie Sec-Fetch-Mode, traité comme un navigateur
    headers: { 'Content-Type': 'text/caddyfile', Origin: new URL(base).origin },
    body: `import ${options.caddyfile ?? '/etc/caddy/Caddyfile'}\n`,
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
  });
  if (!response.ok) throw new Error(`Caddy a refusé la configuration (${response.status}) : ${(await response.text()).slice(0, 1000)}`);
}

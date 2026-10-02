/**
 * Site servi sous un sous-dossier (`BASE_PATH`, Astro `base`) : la démonstration de communeo.fr sous
 * `/demo/<thème>` (#359). Les sites des communes sont à la racine de leur adresse : `BASE` est vide et
 * tout est sans effet.
 *
 * Les liens des thèmes et des view-models sont écrits depuis la racine (`/actualites`) ; plutôt que de
 * les changer partout, le HTML rendu est réécrit (`rebaseHtml`, middleware en build statique) et les
 * scripts du navigateur passent leurs adresses par `withBase`. Les fichiers d'Astro (`/_astro/…`) ont
 * déjà le préfixe.
 */
export const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

/** Adresse depuis la racine du site → adresse depuis la racine du domaine (`/` → `/demo/x/`) */
export function withBase(path: string, base = BASE): string {
  if (!base || !path.startsWith('/') || path.startsWith('//')) return path;
  if (path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}?`) || path.startsWith(`${base}#`)) return path;
  return path === '/' ? `${base}/` : `${base}${path}`;
}

/** Attributs portant une adresse (liens, images, formulaires, points d'accès des scripts) */
const ATTRIBUTE = /(\s(?:href|src|action|poster|data-[\w-]+)=")(\/[^"]*)"/g;
const SRCSET = /(\ssrcset=")([^"]+)"/g;

/** Préfixe les adresses depuis la racine du HTML (attributs entre guillemets doubles, comme Astro les écrit) */
export function rebaseHtml(html: string, base = BASE): string {
  if (!base) return html;
  return html
    .replace(ATTRIBUTE, (_match, attribute: string, value: string) => `${attribute}${withBase(value, base)}"`)
    .replace(
      SRCSET,
      (_match, attribute: string, value: string) =>
        `${attribute}${value
          .split(',')
          .map((candidate) => candidate.trim().replace(/^\S+/, (url) => withBase(url, base)))
          .join(', ')}"`,
    );
}

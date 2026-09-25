/**
 * Adresses de contenus (slugs) : minuscules, chiffres et tirets, sans accents.
 * Uniques par commune (pas globalement) : deux communes peuvent avoir « fete-de-la-musique ».
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 100;

/** « Fête de la Musique 2026 ! » → « fete-de-la-musique-2026 » */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/['’]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug);
}

/**
 * Adresses de commune réservées : le site d'une commune répond sur `<slug>.communeo.fr` (#311), ces
 * sous-domaines servent déjà ou serviront à la plateforme.
 */
export const RESERVED_SITE_SLUGS = ['www', 'admin', 'api', 'app', 'doc', 'docs', 'demo', 'preview', 'apercu', 'essai', 'mail', 'static', 'cdn', 'status', 'aide'] as const;

export const isReservedSiteSlug = (slug: string) => (RESERVED_SITE_SLUGS as readonly string[]).includes(slug);

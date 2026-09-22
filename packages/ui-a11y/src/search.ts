/**
 * Indexation de la recherche du site (Pagefind, au moment du build).
 *
 * Seul le contenu principal est indexé : les en-têtes, menus et pieds de page communs à toutes
 * les pages pollueraient les résultats. Les pages non indexables (404, page de recherche) sont
 * exclues de l'index comme elles le sont des moteurs de recherche.
 *
 *   <main {...searchAttributes(ctx)} id="contenu" tabindex="-1">
 */
import type { PageContext } from '@communeo/theme-contract';

export const searchAttributes = (ctx: PageContext) =>
  ctx.seo.noindex ? { 'data-pagefind-ignore': true } : { 'data-pagefind-body': true };

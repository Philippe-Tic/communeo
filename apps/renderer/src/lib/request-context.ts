/**
 * Contexte d'une requête de preview (mode serveur) : la commune et le thème à afficher, et la source
 * de contenus de la requête. Posé par le middleware ; en build statique, il n'y en a pas.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { ContentSource } from '@communeo/core';

export interface RequestContext {
  siteDocumentId: string;
  /** Thème à afficher ; à défaut celui de la commune */
  theme?: string;
  /** Source de contenus partagée par toute la requête (chaque type chargé une fois) */
  source?: ContentSource;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const withRequestContext = <T>(context: RequestContext, fn: () => T): T => storage.run(context, fn);
export const requestContext = (): RequestContext | undefined => storage.getStore();
/** Thème de la requête en cours (lu par `virtual:communeo/theme` en mode serveur) */
export const requestTheme = (): string | undefined => storage.getStore()?.theme;

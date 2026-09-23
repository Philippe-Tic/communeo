/**
 * Lien vers le serveur de preview : jeton signé délivré par Strapi pour la commune de l'utilisateur
 * (30 min, renouvelé avant expiration), page d'arrivée = le brouillon édité.
 */
import { queryOptions } from '@tanstack/react-query';
import { api } from './api';

/** Contenu à ouvrir, ou l'accueil du site (écrans de réglages) */
export type PreviewTarget = { type: 'page' | 'article' | 'evenement' | 'official-document'; documentId: string } | { type: 'home' };

/** `slug` : un changement d'adresse demande un nouveau lien (la page d'arrivée change) */
export const previewQuery = (target: PreviewTarget | null, options: { theme?: string; slug?: string } = {}) =>
  queryOptions({
    queryKey: ['preview', target?.type, target && 'documentId' in target ? target.documentId : null, options.theme, options.slug],
    queryFn: () =>
      api<{ url: string; expiresAt: string }>('/api/preview/token', {
        method: 'POST',
        json: { ...(target && 'documentId' in target ? target : {}), ...(options.theme ? { theme: options.theme } : {}) },
      }),
    enabled: !!target,
    staleTime: 20 * 60 * 1000,
    refetchInterval: 20 * 60 * 1000,
    retry: false,
  });

/** Même lien, rechargé : le paramètre `v` change à chaque enregistrement */
export const withVersion = (url: string, version: number) => `${url}${url.includes('?') ? '&' : '?'}v=${version}`;

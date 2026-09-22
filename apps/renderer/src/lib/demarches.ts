/**
 * Démarches Service-Public : l'arborescence est récupérée au build (elle change peu), la fiche
 * est chargée par le navigateur — le corpus de la DILA compte des milliers de fiches, les
 * construire toutes pour chaque commune n'aurait pas de sens.
 */
import { mapThemes, type DemarcheAudience, type DemarcheThemeVM } from '@communeo/core';
import { demarcheThemes } from '@communeo/fixtures';

const env = process.env;

/** URL publique de l'API : le site construit l'interroge depuis le navigateur du visiteur. */
export const publicApiUrl = () => (env.STRAPI_PUBLIC_URL ?? env.STRAPI_URL ?? 'http://localhost:1337').replace(/\/$/, '');

/**
 * Adresse où le navigateur va chercher une fiche : l'API publique du backend, ou la fiche de
 * démonstration quand le site tourne sur les fixtures.
 */
export const ficheEndpoint = () =>
  env.DATA_SOURCE === 'strapi' ? `${publicApiUrl()}/api/comarquage/fiche` : '/fixtures/demarche.json';

const buildApiUrl = () => (env.STRAPI_URL ?? publicApiUrl()).replace(/\/$/, '');

/** Arborescence d'une audience, au build. Une panne du service ne doit pas casser la construction. */
export async function fetchThemes(audience: DemarcheAudience): Promise<DemarcheThemeVM[]> {
  // Commune de démonstration : arborescence réduite, sans backend
  if (env.DATA_SOURCE !== 'strapi') return audience === 'particuliers' ? mapThemes(demarcheThemes()) : [];
  const response = await fetch(`${buildApiUrl()}/api/comarquage/categories/${audience}`, {
    headers: env.STRAPI_TOKEN ? { Authorization: `Bearer ${env.STRAPI_TOKEN}` } : {},
  }).catch(() => null);
  if (!response?.ok) return [];
  const payload = (await response.json().catch(() => null)) as { data?: unknown } | null;
  return mapThemes(payload?.data);
}

/**
 * Données publiques d'une commune pour l'assistant de création (#150) : geo.api.gouv.fr (recherche,
 * population, coordonnées) et l'Annuaire de l'administration (mairie). Lues par le serveur, avec un
 * délai court : si un service ne répond pas, l'assistant laisse saisir à la main.
 * `GEO_API_URL` et `ANNUAIRE_API_URL` changent les adresses (tests).
 */
import { fromGeo, townHallFromAnnuaire, type CommuneDetails, type CommuneMatch } from '@communeo/core';
import { log } from '../utils/logger';

const GEO = () => process.env.GEO_API_URL || 'https://geo.api.gouv.fr';
const ANNUAIRE = () =>
  process.env.ANNUAIRE_API_URL ||
  'https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records';
const TIMEOUT_MS = 6000;
const GEO_FIELDS = 'nom,code,codesPostaux,population,centre,departement';

export class PublicDataUnavailable extends Error {}

async function getJson(url: string): Promise<any> {
  let response: Response;
  try {
    // Réponse non compressée : dans Strapi, l'Annuaire renvoyait du gzip que fetch ne décodait pas
    response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json', 'accept-encoding': 'identity' },
    });
  } catch {
    throw new PublicDataUnavailable('Le service ne répond pas');
  }
  if (!response.ok) throw new PublicDataUnavailable(`Réponse ${response.status}`);
  return response.json();
}

/** Recherche par nom ou par code postal (5 chiffres) */
export async function searchCommunes(query: string): Promise<CommuneMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const search = /^\d{5}$/.test(q)
    ? new URLSearchParams({ codePostal: q, fields: GEO_FIELDS, limit: '10' })
    : new URLSearchParams({ nom: q, fields: GEO_FIELDS, boost: 'population', limit: '10' });
  const records = await getJson(`${GEO()}/communes?${search}`);
  return (Array.isArray(records) ? records : []).map((record) => {
    const { latitude: _lat, longitude: _long, ...match } = fromGeo(record);
    return match;
  });
}

/** Une commune par son code INSEE, avec sa mairie ; l'Annuaire en panne n'empêche pas le reste */
export async function communeDetails(insee: string): Promise<CommuneDetails | null> {
  if (!/^\d[\dAB]\d{3}$/.test(insee)) return null;
  const record = await getJson(`${GEO()}/communes/${insee}?fields=${GEO_FIELDS}`).catch((error) => {
    if (error instanceof PublicDataUnavailable && error.message === 'Réponse 404') return null;
    throw error;
  });
  if (!record) return null;
  let townHall: CommuneDetails['townHall'] = null;
  try {
    const where = `code_insee_commune="${insee}" and pivot like "mairie"`;
    const { results } = await getJson(`${ANNUAIRE()}?${new URLSearchParams({ where, limit: '5' })}`);
    const halls: any[] = Array.isArray(results) ? results : [];
    // La mairie de la commune plutôt qu'une mairie déléguée
    const main = halls.find((hall) => String(hall?.nom ?? '').toLowerCase() === `mairie - ${String(record.nom).toLowerCase()}`) ?? halls[0];
    if (main) townHall = townHallFromAnnuaire(main);
  } catch (error) {
    log.warn(`[ASSISTANT] Annuaire de l'administration indisponible pour ${insee} :`, error);
    townHall = null;
  }
  return { ...fromGeo(record), townHall };
}

/** Population municipale INSEE d'une commune (devis #312) ; `null` : commune inconnue */
export async function communePopulation(insee: string): Promise<number | null> {
  if (!/^\d[\dAB]\d{3}$/.test(insee)) return null;
  const record = await getJson(`${GEO()}/communes/${insee}?fields=population`).catch((error) => {
    if (error instanceof PublicDataUnavailable && error.message === 'Réponse 404') return null;
    throw error;
  });
  return typeof record?.population === 'number' ? record.population : null;
}

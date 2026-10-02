/**
 * Données publiques d'une commune pour l'assistant de création (#150) : geo.api.gouv.fr (recherche,
 * population, coordonnées) et l'Annuaire de l'administration (mairie). Lues par le serveur, avec un
 * délai court : si un service ne répond pas, l'assistant laisse saisir à la main. Emplacement de la
 * commune (#362) : géocodage de la Base adresse nationale, servi par la Géoplateforme de l'IGN
 * (l'ancienne adresse api-adresse.data.gouv.fr est fermée depuis janvier 2026).
 * `GEO_API_URL`, `ANNUAIRE_API_URL` et `GEOCODING_API_URL` changent les adresses (tests).
 */
import {
  fromGeo,
  placesFromGeocoding,
  townHallFromAnnuaire,
  type CommuneDetails,
  type CommuneMatch,
  type PlaceMatch,
} from '@communeo/core';
import { log } from '../utils/logger';

const GEO = () => process.env.GEO_API_URL || 'https://geo.api.gouv.fr';
const GEOCODING = () => process.env.GEOCODING_API_URL || 'https://data.geopf.fr/geocodage';
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

/** Réponses du géocodage gardées une journée (les lieux ne bougent pas ; limite de débit du service) */
const PLACES_TTL_MS = 24 * 60 * 60 * 1000;
const PLACES_MAX = 500;
const placesCache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = placesCache.get(key);
  if (hit && Date.now() - hit.at < PLACES_TTL_MS) return hit.value as T;
  const value = await load();
  placesCache.delete(key);
  placesCache.set(key, { at: Date.now(), value });
  // Le plus ancien sort en premier (ordre d'insertion de la Map)
  if (placesCache.size > PLACES_MAX) placesCache.delete(placesCache.keys().next().value!);
  return value;
}

const coordinate = (value: unknown, max: number) => {
  const number = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(number) && Math.abs(number) <= max ? number : null;
};

/**
 * Recherche d'une ville ou d'une adresse (#362) : emplacement de la commune pour la carte et la météo.
 * Base adresse nationale (`/search`), avec la position actuelle pour favoriser les lieux proches.
 */
export async function searchPlaces(query: string, near?: { lat?: unknown; lon?: unknown }): Promise<PlaceMatch[]> {
  const q = query.trim().slice(0, 200);
  if (q.length < 3) return [];
  const search = new URLSearchParams({ q, limit: '6', autocomplete: '1' });
  const lat = coordinate(near?.lat, 90);
  const lon = coordinate(near?.lon, 180);
  if (lat !== null && lon !== null) {
    search.set('lat', lat.toFixed(4));
    search.set('lon', lon.toFixed(4));
  }
  const url = `${GEOCODING()}/search?${search}`;
  return cached(url, async () => placesFromGeocoding(await getJson(url)));
}

/** La commune où se trouve un point (geo.api.gouv.fr) : pour nommer une position déjà enregistrée */
export async function communeAt(lat: unknown, lon: unknown): Promise<{ name: string; postalCode: string | null } | null> {
  const latitude = coordinate(lat, 90);
  const longitude = coordinate(lon, 180);
  if (latitude === null || longitude === null) return null;
  const url = `${GEO()}/communes?${new URLSearchParams({ lat: String(latitude), lon: String(longitude), fields: 'nom,codesPostaux' })}`;
  return cached(url, async () => {
    const records = await getJson(url);
    const record = Array.isArray(records) ? records[0] : null;
    if (!record?.nom) return null;
    return { name: String(record.nom), postalCode: Array.isArray(record.codesPostaux) ? (record.codesPostaux[0] ?? null) : null };
  });
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

const WIKIDATA = () => process.env.WIKIDATA_SPARQL_URL || 'https://query.wikidata.org/sparql';

/**
 * Référencement (#336) : la fiche de la mairie dans l'Annuaire et les sites qu'elle indique.
 * `null` si la mairie n'y figure pas ; PublicDataUnavailable si l'Annuaire ne répond pas.
 */
export async function townHallListing(insee: string, communeName: string): Promise<{ pageUrl: string | null; websites: string[] } | null> {
  if (!/^\d[\dAB]\d{3}$/.test(insee)) return null;
  const where = `code_insee_commune="${insee}" and pivot like "mairie"`;
  const { results } = await getJson(`${ANNUAIRE()}?${new URLSearchParams({ where, limit: '5' })}`);
  const halls: any[] = Array.isArray(results) ? results : [];
  const main = halls.find((hall) => String(hall?.nom ?? '').toLowerCase() === `mairie - ${communeName.toLowerCase()}`) ?? halls[0];
  if (!main) return null;
  // site_internet : liste (parfois une chaîne JSON) de { valeur }
  let sites: any = main.site_internet;
  if (typeof sites === 'string') {
    try {
      sites = JSON.parse(sites);
    } catch {
      sites = [{ valeur: sites }];
    }
  }
  const websites = (Array.isArray(sites) ? sites : []).map((site: any) => String(site?.valeur ?? '').trim()).filter(Boolean);
  return { pageUrl: typeof main.url_service_public === 'string' ? main.url_service_public : null, websites };
}

/** La commune dans Wikidata (code INSEE, P374) : fiche, article Wikipédia en français, site officiel (P856) */
export async function wikidataCommune(insee: string): Promise<{ itemUrl: string | null; articleUrl: string | null; website: string | null } | null> {
  if (!/^\d[\dAB]\d{3}$/.test(insee)) return null;
  const query = `SELECT ?item ?site ?article WHERE { ?item wdt:P374 "${insee}". OPTIONAL { ?item wdt:P856 ?site } OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://fr.wikipedia.org/> } } LIMIT 5`;
  let response: Response;
  try {
    response = await fetch(`${WIKIDATA()}?${new URLSearchParams({ query })}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Wikidata demande un User-Agent qui identifie le service
      headers: { accept: 'application/sparql-results+json', 'accept-encoding': 'identity', 'user-agent': 'Communeo/1.0 (https://communeo.fr; contact@communeo.fr)' },
    });
  } catch {
    throw new PublicDataUnavailable('Wikidata ne répond pas');
  }
  if (!response.ok) throw new PublicDataUnavailable(`Réponse ${response.status}`);
  const bindings: any[] = ((await response.json()) as any)?.results?.bindings ?? [];
  if (!bindings.length) return null;
  const value = (key: string) => bindings.map((binding) => binding?.[key]?.value).find(Boolean) ?? null;
  const entity = value('item');
  return {
    itemUrl: entity ? entity.replace('http://www.wikidata.org/entity/', 'https://www.wikidata.org/wiki/') : null,
    articleUrl: value('article'),
    website: value('site'),
  };
}

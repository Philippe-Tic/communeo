/**
 * Lecture d'une adresse publique donnée par un utilisateur (plan du site de l'ancien site d'une
 * commune) sans permettre d'atteindre le réseau interne du serveur (SSRF) :
 * - http ou https, ports 80 et 443 seulement ;
 * - chaque adresse IP est vérifiée au moment de la connexion (option `lookup`), ce qui couvre aussi
 *   un nom qui changerait d'adresse entre la vérification et la connexion ;
 * - adresses privées, locales, de lien local, CGNAT, multicast et réservées refusées ;
 * - 3 redirections au plus (chacune revérifiée), 10 s, 5 Mo.
 */
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

export class PublicFetchError extends Error {}

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/** Adresse IP joignable sur Internet (ni privée, ni locale, ni réservée) */
export function isPublicAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number) as [number, number];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    if (a === 169 && b === 254) return false; // lien local (métadonnées des hébergeurs)
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isPublicAddress(mapped[1]!);
    if (lower === '::' || lower === '::1') return false;
    if (/^f[cd]/.test(lower)) return false; // adresses locales uniques
    if (/^fe[89ab]/.test(lower)) return false; // lien local
    if (lower.startsWith('ff')) return false; // multicast
    return true;
  }
  return false;
}

/** Résolution DNS qui refuse toute adresse non publique, utilisée par la connexion elle-même */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, '', 0);
    const list = addresses as dns.LookupAddress[];
    const allowed = list.filter((entry) => isPublicAddress(entry.address));
    if (!allowed.length || allowed.length !== list.length) {
      return callback(new PublicFetchError('Adresse non publique refusée'), '', 0);
    }
    if ((options as dns.LookupOptions).all) return (callback as any)(null, allowed);
    return callback(null, allowed[0]!.address, allowed[0]!.family);
  });
};

function checkUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PublicFetchError('Adresse invalide');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new PublicFetchError('Seules les adresses http et https sont acceptées');
  if (url.port && url.port !== '80' && url.port !== '443') throw new PublicFetchError('Port non autorisé');
  if (url.username || url.password) throw new PublicFetchError('Adresse avec identifiants refusée');
  // Adresse IP écrite telle quelle : vérifiée ici (la résolution DNS ne passe pas par `lookup`)
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && !isPublicAddress(host)) throw new PublicFetchError('Adresse non publique refusée');
  return url;
}

function get(url: URL): Promise<{ status: number; location?: string; body: string }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.get(url, { lookup: safeLookup, timeout: TIMEOUT_MS, headers: { 'User-Agent': 'Communeo (redirections)', Accept: 'application/xml, text/xml, text/plain, */*' } }, (response) => {
      const status = response.statusCode ?? 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        return resolve({ status, location: response.headers.location, body: '' });
      }
      let size = 0;
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          request.destroy(new PublicFetchError('Fichier trop volumineux (5 Mo au plus)'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ status, body: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new PublicFetchError("L'ancien site ne répond pas")));
    request.on('error', (error) => reject(error instanceof PublicFetchError ? error : new PublicFetchError("L'ancien site n'a pas pu être lu")));
  });
}

/** Contenu texte d'une adresse publique ; PublicFetchError avec un message lisible sinon */
export async function fetchPublicText(value: string): Promise<string> {
  let url = checkUrl(value);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await get(url);
    if (response.location) {
      url = checkUrl(new URL(response.location, url).toString());
      continue;
    }
    if (response.status !== 200) throw new PublicFetchError(`L'ancien site répond ${response.status}`);
    return response.body;
  }
  throw new PublicFetchError('Trop de redirections');
}

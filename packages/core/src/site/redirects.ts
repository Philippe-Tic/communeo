/**
 * Redirections depuis l'ancien site de la commune (#335) : quand la commune relie son domaine à
 * Communeo, les adresses de son ancien site (`/horaires.html`, `/index.php?page=etat-civil`) doivent
 * renvoyer vers les nouvelles pages, en 301, pour que les habitants ne tombent pas sur une page
 * introuvable et que Google transfère le référencement acquis.
 *
 * - `normalizeOldAddress` : une adresse collée (complète ou chemin) → chemin et requête ;
 * - `suggestDestination` : la page du nouveau site la plus proche (titre, adresse, mots courants).
 * Les règles de l'hébergeur sont écrites par son adaptateur (`@communeo/pipeline`).
 */
import { normalizeSearchText } from '../demarches/search';

export const REDIRECTS_MAX = 1000;
const MAX_LENGTH = 500;

export interface RedirectRule {
  /** Ancienne adresse : chemin, et requête éventuelle (`/index.php?page=horaires`) */
  from: string;
  /** Page du nouveau site (`/contact`) */
  to: string;
}

export interface RedirectDestination {
  path: string;
  label: string;
  /** Page, Actualité, Rubrique… : pour regrouper la liste de l'admin */
  kind: string;
}

/**
 * Ancienne adresse normalisée : sans domaine, sans ancre, sans barre finale, requête conservée
 * (`/index.php?page=horaires`). `null` : adresse inutilisable (vide, accueil, trop longue).
 */
export function normalizeOldAddress(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > MAX_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(raw, 'https://ancien-site.invalid');
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  let path = url.pathname.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  if (/[\s"'<>`]/.test(path)) return null;
  const query = url.search.length > 1 ? url.search : '';
  // L'accueil existe toujours sur le nouveau site : rien à rediriger
  if (path === '/' && !query) return null;
  return `${path}${query}`;
}

/** Destination acceptée : une adresse du site (`/…`), pas un autre domaine */
export const isValidDestination = (to: string) => /^\/(?!\/)[^\s"'<>`]*$/.test(to) && to.length <= MAX_LENGTH;

/** Même adresse que la destination : la règle ne servirait à rien (ou bouclerait) */
export const isSelfRedirect = ({ from, to }: RedirectRule) => from.split('?')[0]!.replace(/\.html?$/, '') === to.split('?')[0];

// ─── Proposition automatique ─────────────────────────────────────────

/** Mots sans valeur dans une adresse de site de mairie */
const NOISE = new Set([
  'index', 'php', 'html', 'htm', 'asp', 'aspx', 'jsp', 'cfm', 'page', 'pages', 'id', 'www', 'fr', 'com', 'http', 'https', 'spip',
  'article', 'articles', 'rubrique', 'rubriques', 'content', 'contenu', 'view', 'show', 'fiche', 'detail', 'details', 'cat', 'category',
  'categorie', 'tag', 'node', 'post', 'lang', 'option', 'com_content', 'itemid', 'task', 'le', 'la', 'les', 'de', 'des', 'du', 'et', 'en',
  'a', 'au', 'aux', 'un', 'une', 'sur', 'pour', 'notre', 'nos', 'votre', 'vos', 'site', 'mairie', 'commune', 'ville',
]);

/** Mots courants des anciens sites de mairie → rubrique du nouveau site */
const SECTION_WORDS: Array<[string, string[]]> = [
  ['/contact', ['contact', 'contacts', 'contacter', 'horaires', 'horaire', 'coordonnees', 'acces', 'ouverture', 'accueil-mairie', 'secretariat']],
  ['/actualites', ['actualites', 'actualite', 'actus', 'actu', 'news', 'infos', 'informations', 'breves']],
  ['/agenda', ['agenda', 'evenements', 'evenement', 'manifestations', 'animations', 'calendrier', 'sorties']],
  ['/documents', ['documents', 'document', 'deliberations', 'deliberation', 'comptes', 'rendus', 'proces', 'verbaux', 'pv', 'arretes', 'bulletin', 'bulletins', 'budget', 'publications', 'telechargements', 'conseil']],
  ['/equipe-municipale', ['elus', 'equipe', 'municipalite', 'conseillers', 'adjoints', 'maire', 'commissions']],
  ['/associations', ['associations', 'association', 'associatif', 'associative']],
  ['/demarches', ['demarches', 'demarche', 'formalites', 'administratives', 'services-publics']],
  ['/collecte-des-dechets', ['dechets', 'ordures', 'collecte', 'collectes', 'tri', 'poubelles', 'encombrants', 'dechetterie', 'recyclage']],
  ['/cantine', ['cantine', 'restauration', 'menus', 'menu', 'restaurant-scolaire']],
  ['/perturbations', ['travaux', 'perturbations', 'coupures', 'alertes']],
  ['/mentions-legales', ['mentions', 'legales', 'legal']],
  ['/donnees-personnelles', ['confidentialite', 'rgpd', 'donnees', 'personnelles', 'cookies']],
  ['/accessibilite', ['accessibilite']],
  ['/plan-du-site', ['plan-du-site', 'sitemap', 'plan']],
];

const tokens = (value: string) =>
  normalizeSearchText(value)
    .split(' ')
    .filter((word) => word.length > 1 && !/^\d+$/.test(word) && !NOISE.has(word));

/** Mots d'une ancienne adresse : chemin et valeurs de la requête (`?page=etat-civil`) */
function addressWords(from: string): string[] {
  const [path, query = ''] = from.split('?') as [string, string?];
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // Adresse mal encodée : prise telle quelle
  }
  const values = [...new URLSearchParams(query)].map(([, value]) => value);
  return [...tokens(decoded.replace(/\.[a-z0-9]{2,5}$/i, '')), ...values.flatMap(tokens)];
}

export interface RedirectSuggestion {
  from: string;
  /** Page proposée, `null` si rien ne ressemble : la commune choisit */
  to: string | null;
  /** « sure » : titre ou adresse retrouvés ; « probable » : mot courant ou ressemblance partielle */
  confidence: 'sure' | 'probable' | null;
}

export function suggestDestination(from: string, destinations: RedirectDestination[]): RedirectSuggestion {
  const words = addressWords(from);
  if (!words.length) return { from, to: null, confidence: null };
  const wordSet = new Set(words);
  const joined = words.join('-');

  let best: { path: string; score: number } | null = null;
  for (const destination of destinations) {
    const slug = destination.path.split('/').filter(Boolean).pop() ?? '';
    const titleWords = tokens(destination.label);
    const slugWords = tokens(slug.replace(/-/g, ' '));
    const target = new Set([...titleWords, ...slugWords]);
    if (!target.size) continue;
    const shared = [...target].filter((word) => wordSet.has(word)).length;
    let score = shared / Math.max(target.size, 2);
    // Même adresse (sans extension) : la page a simplement changé d'adresse
    if (slug && (joined === slugWords.join('-') || joined.endsWith(slugWords.join('-')))) score += 1;
    if (!best || score > best.score) best = { path: destination.path, score };
  }
  if (best && best.score >= 1) return { from, to: best.path, confidence: 'sure' };

  // Mots courants des anciens sites → rubrique
  const available = new Set(destinations.map((destination) => destination.path));
  for (const [path, keys] of SECTION_WORDS) {
    if (available.has(path) && keys.some((key) => wordSet.has(key) || joined.includes(key))) return { from, to: path, confidence: 'probable' };
  }
  if (best && best.score >= 0.5) return { from, to: best.path, confidence: 'probable' };
  return { from, to: null, confidence: null };
}

/** Adresses d'un plan du site (sitemap.xml) : les balises <loc> */
export const sitemapLocations = (xml: string) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]!.replace(/&amp;/g, '&'));

/**
 * Référencement et partage des sites des communes : ce que la commune n'a pas à configurer.
 * - « Mairie de Saint-Aubin », « Mairie d’Arles », « Mairie du Mans », « Mairie des Andelys » ;
 * - description tirée du contenu quand la commune n'en a pas écrit ;
 * - image de partage : une version redimensionnée (les réseaux sociaux refusent le SVG et les
 *   images trop lourdes), sinon l'image de partage générée pour la commune.
 */
import type { BlockVM, ImageVM } from './types';

/** Longueur au-delà de laquelle Google coupe la description */
export const DESCRIPTION_MAX = 155;

/** Largeur idéale d'une image de partage (1200 × 630) */
export const SHARE_WIDTH = 1200;
export const SHARE_HEIGHT = 630;

const VOWEL = /^[aeiouyàâäéèêëîïôöùûüœæ]/i;

/** « de Saint-Aubin », « d’Arles », « du Mans », « des Andelys » : le nom d'une commune après « de » */
export function ofCommune(name: string): string {
  const trimmed = name.trim();
  const le = /^Le\s+(.+)$/.exec(trimmed);
  if (le) return `du ${le[1]}`;
  const les = /^Les\s+(.+)$/.exec(trimmed);
  if (les) return `des ${les[1]}`;
  return VOWEL.test(trimmed) && !/^(La|L’|L')\b/.test(trimmed) ? `d’${trimmed}` : `de ${trimmed}`;
}

/** « Mairie de Saint-Aubin », « Mairie d’Arles », « Mairie du Mans », « Mairie des Andelys » */
export function mairieOf(name: string): string {
  const trimmed = name.trim();
  if (/^mairie\b/i.test(trimmed)) return trimmed;
  return `Mairie ${ofCommune(trimmed)}`;
}

/** Titre de l'accueil : ce que les habitants cherchent (« mairie de … ») */
export const homeTitle = (name: string) => `${mairieOf(name)} – site officiel`;

/** Coupe au dernier mot entier avant la limite, avec « … » */
export function truncate(value: string, max = DESCRIPTION_MAX): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}

function collectText(node: unknown, parts: string[]) {
  if (!node || typeof node !== 'object') return;
  const value = node as { type?: unknown; text?: unknown; content?: unknown };
  // Les intertitres (« Programme », « Tarifs ») ne font pas une description
  if (value.type === 'heading') return;
  if (typeof value.text === 'string') parts.push(value.text);
  if (Array.isArray(value.content)) {
    for (const child of value.content) collectText(child, parts);
    // Fin de paragraphe : un espace entre deux blocs de texte
    parts.push(' ');
  }
}

/** Premier texte du contenu (blocs texte, encadrés, questions-réponses), pour une description */
export function blocksExcerpt(blocks: BlockVM[], max = DESCRIPTION_MAX): string | null {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === 'text' || block.type === 'callout') collectText(block.body, parts);
    else if (block.type === 'faq') for (const item of block.items) collectText(item.answer, parts);
    if (parts.join('').trim().length >= max) break;
  }
  const text = parts.join('').replace(/\s+/g, ' ').trim();
  return text ? truncate(text, max) : null;
}

/** Première description disponible, coupée à la bonne longueur */
export function describe(...candidates: Array<string | null | undefined>): string | null {
  const found = candidates.map((candidate) => candidate?.replace(/\s+/g, ' ').trim()).find((candidate) => candidate);
  return found ? truncate(found) : null;
}

export interface ShareImageVM {
  src: string;
  width: number | null;
  height: number | null;
  alt: string;
}

/**
 * Image de partage d'une page : la variante redimensionnée la plus proche de 1200 px (l'original
 * peut peser plusieurs Mo), jamais un SVG. `null` : prendre l'image générée de la commune.
 */
export function shareImage(image: ImageVM | null | undefined): ShareImageVM | null {
  if (!image || /\.svg($|\?)/i.test(image.src)) return null;
  const candidates = (image.srcset ?? '')
    .split(',')
    .map((entry) => {
      const [src, descriptor] = entry.trim().split(/\s+/);
      return { src: src ?? '', width: Number(descriptor?.replace(/w$/, '')) || 0 };
    })
    .filter((candidate) => candidate.src && candidate.width && !/\.svg($|\?)/i.test(candidate.src));
  const fitting = candidates.filter((candidate) => candidate.width <= 1600).sort((a, b) => b.width - a.width)[0];
  const chosen = fitting ?? (image.width && image.width <= 1600 ? { src: image.src, width: image.width } : candidates.sort((a, b) => a.width - b.width)[0]);
  if (!chosen) return { src: image.src, width: image.width, height: image.height, alt: image.alt };
  const height = image.width && image.height && chosen.width ? Math.round((image.height * chosen.width) / image.width) : null;
  return { src: chosen.src, width: chosen.width, height, alt: image.alt };
}

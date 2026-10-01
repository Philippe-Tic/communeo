/**
 * Sous-titres WebVTT et transcription, générés depuis le script calé.
 * Règles : 42 caractères par ligne au plus, 2 lignes par sous-titre au plus ; un segment trop long est
 * découpé en plusieurs sous-titres, dont la durée est proportionnelle au nombre de caractères.
 */
import type { SegmentCale } from './script';

export const LIGNE_MAX = 42;
export const LIGNES_MAX = 2;

/** Phrases d'un texte (coupure après . ! ? suivis d'une majuscule) */
export function phrases(texte: string): string[] {
  return texte
    .trim()
    .split(/(?<=[.!?…])\s+(?=[«A-ZÀ-Ý])/u)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Coupe un texte en lignes de `max` caractères au plus, sans couper les mots */
export function lignes(texte: string, max = LIGNE_MAX): string[] {
  const resultat: string[] = [];
  let courante = '';
  for (const mot of texte.split(/\s+/).filter(Boolean)) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (essai.length <= max || !courante) courante = essai;
    else {
      resultat.push(courante);
      courante = mot;
    }
  }
  if (courante) resultat.push(courante);
  return resultat;
}

/** Un morceau de 2 lignes au plus, coupé au plus près du milieu (deux lignes de longueur voisine) */
function equilibre(texte: string): string[] {
  if (texte.length <= LIGNE_MAX) return [texte];
  const mots = texte.split(/\s+/);
  let meilleur: string[] | null = null;
  for (let i = 1; i < mots.length; i += 1) {
    const a = mots.slice(0, i).join(' ');
    const b = mots.slice(i).join(' ');
    if (a.length > LIGNE_MAX || b.length > LIGNE_MAX) continue;
    if (!meilleur || Math.abs(a.length - b.length) < Math.abs(meilleur[0]!.length - meilleur[1]!.length)) meilleur = [a, b];
  }
  return meilleur ?? lignes(texte);
}

/**
 * Sous-titres d'une phrase : elle tient en un sous-titre de 2 lignes si possible ; sinon elle est coupée
 * après une ponctuation (virgule, deux-points), en morceaux de longueur voisine.
 */
export function blocsDePhrase(phrase: string): string[][] {
  const max = LIGNE_MAX * LIGNES_MAX;
  if (phrase.length <= max && equilibre(phrase).length <= LIGNES_MAX) return [equilibre(phrase)];
  const morceaux = phrase.split(/(?<=[,:;])\s+/);
  // Regroupe les morceaux voisins tant qu'ils tiennent en 2 lignes
  const groupes: string[] = [];
  for (const morceau of morceaux) {
    const dernier = groupes.at(-1);
    if (dernier && `${dernier} ${morceau}`.length <= max && equilibre(`${dernier} ${morceau}`).length <= LIGNES_MAX) groupes[groupes.length - 1] = `${dernier} ${morceau}`;
    else groupes.push(morceau);
  }
  // Un morceau encore trop long (sans ponctuation) : coupé en blocs de 2 lignes
  return groupes.flatMap((g) => {
    if (equilibre(g).length <= LIGNES_MAX) return [equilibre(g)];
    const ls = lignes(g);
    const blocs: string[][] = [];
    for (let i = 0; i < ls.length; i += LIGNES_MAX) blocs.push(ls.slice(i, i + LIGNES_MAX));
    return blocs;
  });
}

/** Sous-titres d'un texte : phrase par phrase */
export function blocs(texte: string): string[][] {
  return phrases(texte).flatMap(blocsDePhrase);
}

const horodatage = (secondes: number) => {
  const ms = Math.round(secondes * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const reste = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(reste).padStart(3, '0')}`;
};

/** Répartit des sous-titres sur un intervalle, au prorata de leur longueur */
function repartir(parts: string[][], depart: number, fin: number, cues: string[]) {
  const total = parts.reduce((n, part) => n + part.join(' ').length, 0);
  let debut = depart;
  for (const part of parts) {
    const duree = ((fin - depart) * part.join(' ').length) / total;
    cues.push(`${horodatage(debut)} --> ${horodatage(debut + duree)}\n${part.join('\n')}`);
    debut += duree;
  }
}

export function vtt(segments: SegmentCale[]): string {
  const cues: string[] = [];
  for (const segment of segments) {
    if (!segment.voix.trim()) continue;
    const liste = phrases(segment.voix);
    const heures = segment.parole?.phrases;
    if (heures && heures.length === liste.length) {
      // Chaque phrase sur son passage dans la voix (repéré aux silences)
      liste.forEach((phrase, i) => repartir(blocsDePhrase(phrase), heures[i]!.debut, heures[i]!.fin, cues));
    } else {
      // Sinon, au prorata sur la voix du segment (ou tout le segment)
      const { debut, fin } = segment.parole ?? segment;
      repartir(blocs(segment.voix), debut, fin, cues);
    }
  }
  return `WEBVTT\n\n${cues.map((cue, i) => `${i + 1}\n${cue}`).join('\n\n')}\n`;
}

const minutes = (secondes: number) => `${Math.floor(secondes / 60)}:${String(Math.floor(secondes % 60)).padStart(2, '0')}`;

export function transcription(titre: string, segments: SegmentCale[]): string {
  const corps = segments
    .map((s) => `**${minutes(s.debut)}**. ${s.voix.trim() ? `« ${s.voix.trim()} »` : '(sans parole)'}\n\n_À l'écran : ${s.ecran.trim()}_`)
    .join('\n\n');
  return `# Transcription : ${titre}\n\n${corps}\n`;
}

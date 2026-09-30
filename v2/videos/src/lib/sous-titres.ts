/**
 * Sous-titres WebVTT et transcription, générés depuis le script calé.
 * Règles : 42 caractères par ligne au plus, 2 lignes par sous-titre au plus ; un segment trop long est
 * découpé en plusieurs sous-titres, dont la durée est proportionnelle au nombre de caractères.
 */
import type { SegmentCale } from './script';

export const LIGNE_MAX = 42;
export const LIGNES_MAX = 2;

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

/**
 * Découpe un texte en sous-titres de 2 lignes au plus. On coupe de préférence après une ponctuation,
 * pour que chaque sous-titre se lise seul.
 */
export function blocs(texte: string): string[][] {
  const toutes = lignes(texte);
  const resultat: string[][] = [];
  for (let i = 0; i < toutes.length; ) {
    const une = toutes[i]!;
    const deux = toutes[i + 1];
    // Une phrase qui se termine sur la 1re ligne ne déborde pas sur la 2e si la suite est longue
    if (deux !== undefined && !/[.!?:;]$/.test(une)) {
      resultat.push([une, deux]);
      i += 2;
    } else {
      resultat.push([une]);
      i += 1;
    }
  }
  return resultat;
}

const horodatage = (secondes: number) => {
  const ms = Math.round(secondes * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const reste = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(reste).padStart(3, '0')}`;
};

export function vtt(segments: SegmentCale[]): string {
  const cues: string[] = [];
  for (const segment of segments) {
    if (!segment.voix.trim()) continue;
    const parts = blocs(segment.voix);
    const total = parts.reduce((n, part) => n + part.join(' ').length, 0);
    let debut = segment.debut;
    for (const part of parts) {
      const duree = ((segment.fin - segment.debut) * part.join(' ').length) / total;
      cues.push(`${horodatage(debut)} --> ${horodatage(debut + duree)}\n${part.join('\n')}`);
      debut += duree;
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

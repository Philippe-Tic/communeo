/**
 * Script d'une vidéo, source unique : les segments (voix et écran) fixent le découpage des scènes,
 * les sous-titres (.vtt) et la transcription. `timings.json`, à côté du script, remplace les heures
 * estimées par celles de la voix réelle (scripts/voix.ts ou scripts/recaler.ts).
 */
import { FPS } from './format';

export interface Segment {
  /** Début et fin estimés, en secondes */
  debut: number;
  fin: number;
  /** Texte dit par la voix off (et sous-titré) */
  voix: string;
  /** Texte donné à la synthèse vocale quand l'écrit se prononce mal (« communeo point f r ») */
  prononciation?: string;
  /** Ce qu'on voit à l'écran (transcription) */
  ecran: string;
  /** Entrée de la scène : `fondu` quand elle continue sur le même écran que la précédente (sinon elle glisse) */
  entree?: 'fondu';
}

export interface ScriptVideo {
  /** Identifiant de la composition et nom des fichiers : v1-demo, v2-alerte… */
  id: string;
  titre: string;
  /** Image d'aperçu : une seconde, ou un moment d'une scène (qui suit la voix quand les heures bougent) */
  apercu: number | { segment: number; apres: number };
  /**
   * Tempo de la musique (battements par minute) : chaque scène dure un nombre entier de temps, pour que
   * les changements de scène tombent sur la musique.
   */
  tempo?: number;
  /** Silence après le dernier segment, en secondes */
  finale?: number;
  segments: Segment[];
}

export interface Timings {
  /** D'où viennent les heures : estimées dans le script, voix générée (ElevenLabs, ou provisoire de macOS), piste déposée */
  source: 'estimation' | 'elevenlabs' | 'systeme' | 'piste';
  /** Voix off : un fichier par segment (dans public/), ou une piste entière */
  audio: null | { segments: string[] } | { piste: string };
  /** Heures de chaque segment, et de sa voix (le sous-titre tombe sur la phrase, pas sur toute la scène) */
  segments: Array<{ debut: number; fin: number; parole?: Parole }>;
}

/** Heures de la voix d'un segment, et de chacune de ses phrases quand on les a repérées */
export interface Parole {
  debut: number;
  fin: number;
  phrases?: Array<{ debut: number; fin: number }>;
}

export interface SegmentCale extends Segment {
  index: number;
  /** En images */
  de: number;
  a: number;
  /** Heures de la voix, en secondes (à défaut : tout le segment) */
  parole?: Parole;
}

/** Segments aux heures définitives (celles de timings.json quand elles correspondent au script) */
export function chronologie(script: ScriptVideo, timings?: Timings | null): SegmentCale[] {
  const heures = timings && timings.segments.length === script.segments.length ? timings.segments : script.segments;
  return script.segments.map((segment, index) => {
    const { debut, fin, parole } = heures[index] as Timings['segments'][number];
    return { ...segment, debut, fin, parole, index, de: Math.round(debut * FPS), a: Math.round(fin * FPS) };
  });
}

/** Durée totale de la vidéo, en images */
export function dureeEnImages(script: ScriptVideo, timings?: Timings | null): number {
  const segments = chronologie(script, timings);
  const fin = segments.length ? segments[segments.length - 1]!.fin : 0;
  return Math.max(1, Math.round((fin + (script.finale ?? 0.6)) * FPS));
}

/** Seconde de l'image d'aperçu */
export function secondeApercu(script: ScriptVideo, timings?: Timings | null): number {
  if (typeof script.apercu === 'number') return script.apercu;
  const segment = chronologie(script, timings)[script.apercu.segment];
  if (!segment) throw new Error(`Aperçu : pas de segment ${script.apercu.segment}`);
  return segment.debut + script.apercu.apres;
}

/** Première image d'un segment du script, repérée par un extrait de son texte d'écran */
export function imageDe(segments: SegmentCale[], ecran: string): number {
  const segment = segments.find((s) => s.ecran.includes(ecran));
  if (!segment) throw new Error(`Aucun segment dont l'écran contient « ${ecran} »`);
  return segment.de;
}

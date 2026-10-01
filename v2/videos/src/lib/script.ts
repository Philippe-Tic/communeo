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
  /** Ce qu'on voit à l'écran (transcription) */
  ecran: string;
}

export interface ScriptVideo {
  /** Identifiant de la composition et nom des fichiers : v1-demo, v2-alerte… */
  id: string;
  titre: string;
  /** Seconde de l'image d'aperçu */
  apercu: number;
  /** Silence après le dernier segment, en secondes */
  finale?: number;
  segments: Segment[];
}

export interface Timings {
  /** D'où viennent les heures : estimées dans le script, voix générée, piste déposée */
  source: 'estimation' | 'elevenlabs' | 'piste';
  /** Voix off : un fichier par segment (dans public/), ou une piste entière */
  audio: null | { segments: string[] } | { piste: string };
  segments: Array<{ debut: number; fin: number }>;
}

export interface SegmentCale extends Segment {
  index: number;
  /** En images */
  de: number;
  a: number;
}

/** Segments aux heures définitives (celles de timings.json quand elles correspondent au script) */
export function chronologie(script: ScriptVideo, timings?: Timings | null): SegmentCale[] {
  const heures = timings && timings.segments.length === script.segments.length ? timings.segments : script.segments;
  return script.segments.map((segment, index) => {
    const { debut, fin } = heures[index]!;
    return { ...segment, debut, fin, index, de: Math.round(debut * FPS), a: Math.round(fin * FPS) };
  });
}

/** Durée totale de la vidéo, en images */
export function dureeEnImages(script: ScriptVideo, timings?: Timings | null): number {
  const segments = chronologie(script, timings);
  const fin = segments.length ? segments[segments.length - 1]!.fin : 0;
  return Math.max(1, Math.round((fin + (script.finale ?? 0.6)) * FPS));
}

/** Première image d'un segment du script, repérée par un extrait de son texte d'écran */
export function imageDe(segments: SegmentCale[], ecran: string): number {
  const segment = segments.find((s) => s.ecran.includes(ecran));
  if (!segment) throw new Error(`Aucun segment dont l'écran contient « ${ecran} »`);
  return segment.de;
}

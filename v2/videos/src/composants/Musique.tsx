/**
 * Musique de fond (public/musique/<id>.mp3, `pnpm videos:musique`) : baissée sous la voix off, pleine
 * entre les phrases. Rien si le fichier manque (le studio fonctionne sans).
 */
import { Audio, getStaticFiles, staticFile } from 'remotion';
import { FPS } from '../lib/format';
import type { SegmentCale } from '../lib/script';

/** Niveau de la musique sous la voix (la musique seule est déjà 9 dB sous la voix) */
const SOUS_LA_VOIX = 0.4;
/** Durée des remontées et des baisses, en secondes */
const RAMPE = 0.3;

/** Volume de la musique à la seconde `t` : 1 entre les phrases, SOUS_LA_VOIX pendant */
export function volumeMusique(t: number, segments: SegmentCale[]): number {
  let voix = 0;
  for (const { parole } of segments) {
    if (!parole) continue;
    // La musique baisse juste avant la phrase et remonte après
    const avant = (t - (parole.debut - RAMPE)) / RAMPE;
    const apres = (parole.fin + RAMPE - t) / RAMPE + 1;
    voix = Math.max(voix, Math.min(1, Math.max(0, avant), Math.max(0, apres)));
  }
  return 1 - (1 - SOUS_LA_VOIX) * voix;
}

export function Musique({ id, segments }: { id: string; segments: SegmentCale[] }) {
  const fichier = `musique/${id}.mp3`;
  if (!getStaticFiles().some((f) => f.name === fichier)) return null;
  return <Audio src={staticFile(fichier)} volume={(image) => volumeMusique(image / FPS, segments)} />;
}

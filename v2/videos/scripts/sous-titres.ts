/**
 * Sous-titres et transcription d'une vidéo, depuis son script calé : `pnpm videos:sous-titres <vidéo>`.
 * Écrit <vidéo>.vtt (français, 42 caractères par ligne, 2 lignes au plus) et <vidéo>-transcription.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chronologie } from '../src/lib/script';
import { transcription, vtt } from '../src/lib/sous-titres';
import { charger, dossierSortie, videoDemandee } from './outils';

export async function ecrireSousTitres(id: string): Promise<void> {
  const { script, timings } = await charger(id);
  const segments = chronologie(script, timings);
  const dossier = dossierSortie(id);
  mkdirSync(dossier, { recursive: true });
  writeFileSync(join(dossier, `${id}.vtt`), vtt(segments));
  writeFileSync(join(dossier, `${id}-transcription.md`), transcription(script.titre, segments));
  console.log(`✓ ${id}.vtt et ${id}-transcription.md (heures : ${timings.source === 'estimation' ? 'estimées, pas encore calées sur la voix' : timings.source})`);
}

if (import.meta.url === `file://${process.argv[1]}`) await ecrireSousTitres(videoDemandee());

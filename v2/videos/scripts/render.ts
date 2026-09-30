/**
 * Rendu final d'une vidéo : `pnpm videos:render <vidéo>`.
 *
 * MP4 H.264 1920 × 1080, sous 20 Mo (le CRF monte jusqu'à passer sous la limite), image d'aperçu PNG
 * (`remotion still` sur la seconde `apercu` du script), sous-titres et transcription, dans
 * v2/contenus-site/videos/ avec le nommage du brief (v1-demo.mp4, v1-demo-apercu.png, v1-demo.vtt,
 * v1-demo-transcription.md). La vidéo de test sort dans out/.
 */
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FPS } from '../src/lib/format';
import { ecrireSousTitres } from './sous-titres';
import { charger, dossierSortie, executer, videoDemandee } from './outils';

const LIMITE = 20 * 1024 * 1024;
const id = videoDemandee();
const { script } = await charger(id);
const dossier = dossierSortie(id);
mkdirSync(dossier, { recursive: true });
const video = join(dossier, `${id}.mp4`);

await ecrireSousTitres(id);
let taille = Infinity;
for (const crf of [18, 21, 24, 27, 30]) {
  executer('pnpm', ['exec', 'remotion', 'render', 'src/index.ts', id, video, '--codec=h264', `--crf=${crf}`, '--log=error']);
  taille = statSync(video).size;
  console.log(`CRF ${crf} : ${(taille / 1024 / 1024).toFixed(1)} Mo`);
  if (taille < LIMITE) break;
}
if (taille >= LIMITE) console.warn('⚠ Toujours au-dessus de 20 Mo : raccourcir la vidéo ou simplifier les fonds animés.');
executer('pnpm', ['exec', 'remotion', 'still', 'src/index.ts', id, join(dossier, `${id}-apercu.png`), `--frame=${Math.round(script.apercu * FPS)}`, '--log=error']);
console.log(`✓ ${video}\n✓ ${id}-apercu.png, ${id}.vtt, ${id}-transcription.md`);

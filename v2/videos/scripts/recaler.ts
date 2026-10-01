/**
 * Recale une vidéo sur une voix enregistrée : `pnpm videos:recaler <vidéo> [--seuil -35] [--silence 0.4]`.
 *
 * Lit public/voix/<vidéo>/voix.mp3 (une piste entière, un silence net entre chaque segment), repère les
 * passages parlés (silencedetect de ffmpeg) et les attribue dans l'ordre aux segments du script qui ont
 * une voix ; écrit timings.json puis regénère les sous-titres et la transcription.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { calerSurPiste, passagesParles, type Intervalle } from '../src/lib/calage';
import type { Timings } from '../src/lib/script';
import { ecrireSousTitres } from './sous-titres';
import { charger, dureeAudio, remotionOutil, VIDEOS, videoDemandee } from './outils';

const id = videoDemandee();
const option = (nom: string, defaut: number) => {
  const i = process.argv.indexOf(`--${nom}`);
  return i > 0 ? Number(process.argv[i + 1]) : defaut;
};
const piste = join(VIDEOS, 'public', 'voix', id, 'voix.mp3');
if (!existsSync(piste)) {
  console.error(`Piste absente : ${piste}`);
  process.exit(1);
}

const { stderr } = remotionOutil('ffmpeg', ['-i', piste, '-af', `silencedetect=noise=${option('seuil', -35)}dB:d=${option('silence', 0.4)}`, '-f', 'null', '-']);
const silences: Intervalle[] = [];
let debut: number | null = null;
for (const ligne of stderr.split('\n')) {
  const s = /silence_start: (-?[\d.]+)/.exec(ligne);
  const e = /silence_end: ([\d.]+)/.exec(ligne);
  if (s) debut = Math.max(0, Number(s[1]));
  if (e && debut !== null) {
    silences.push({ debut, fin: Number(e[1]) });
    debut = null;
  }
}
const duree = dureeAudio(piste);
if (debut !== null) silences.push({ debut, fin: duree });

const { script, fichierTimings } = await charger(id);
const passages = passagesParles(silences, duree);
const timings: Timings = { source: 'piste', audio: { piste: `voix/${id}/voix.mp3` }, segments: calerSurPiste(script, passages) };
writeFileSync(fichierTimings, `${JSON.stringify(timings, null, 2)}\n`);
console.log(`✓ ${passages.length} passages parlés, ${script.segments.length} segments recalés : ${timings.segments.at(-1)!.fin.toFixed(1)} s au total`);
await ecrireSousTitres(id);

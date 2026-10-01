/**
 * Voix off générée avec ElevenLabs : `pnpm videos:voix <vidéo>`.
 *
 * Une phrase par segment (voix posée, débit calme), dans public/voix/<vidéo>/<n>.mp3 ; les segments sont
 * ensuite recalés sur la durée réelle de chaque phrase (timings.json), puis les sous-titres regénérés.
 * Variables : ELEVENLABS_API_KEY (obligatoire), ELEVENLABS_VOICE_ID (voix française choisie dans la
 * bibliothèque ElevenLabs), ELEVENLABS_MODEL (défaut eleven_multilingual_v2), lues dans l'environnement ou
 * dans v2/videos/.env (ignoré par git : la clé n'est jamais commitée).
 * Sans clé : déposer une piste public/voix/<vidéo>/voix.mp3 et lancer `pnpm videos:recaler <vidéo>`.
 *
 * `--systeme` : voix PROVISOIRE de macOS (`say`, voix Thomas) pour caler le montage sans ElevenLabs ;
 * à remplacer avant publication (timings.json porte `source: 'systeme'`).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calerSurPhrases, couperEnPhrases, passagesParles, type Intervalle } from '../src/lib/calage';
import { phrases } from '../src/lib/sous-titres';
import type { Timings } from '../src/lib/script';
import { ecrireSousTitres } from './sous-titres';
import { charger, dureeAudio, normaliserVoix, remotionOutil, VIDEOS, videoDemandee } from './outils';

try {
  process.loadEnvFile(join(VIDEOS, '.env'));
} catch {
  // pas de fichier .env : variables d'environnement seules
}

const id = videoDemandee();
const systeme = process.argv.includes('--systeme');
const cle = process.env.ELEVENLABS_API_KEY;
const voix = process.env.ELEVENLABS_VOICE_ID;
if (!systeme && (!cle || !voix)) {
  console.error(
    `ELEVENLABS_API_KEY et ELEVENLABS_VOICE_ID sont nécessaires.\nSans ElevenLabs : déposez la voix enregistrée dans public/voix/${id}/voix.mp3 (un silence net entre chaque segment), puis lancez pnpm videos:recaler ${id} ; ou, pour caler le montage, une voix provisoire : pnpm videos:voix ${id} --systeme.`,
  );
  process.exit(1);
}

const { script, fichierTimings } = await charger(id);
const dossier = join(VIDEOS, 'public', 'voix', id);
mkdirSync(dossier, { recursive: true });

const fichiers: string[] = [];
const durees: Array<number | null> = [];
/** Heures de chaque phrase dans le fichier d'un segment (depuis son début), repérées aux silences */
const heuresDesPhrases: Array<Intervalle[] | null> = [];

function reperer(fichier: string, texte: string, duree: number): Intervalle[] | null {
  const liste = phrases(texte);
  if (liste.length < 2) return [{ debut: 0, fin: duree }];
  const { stderr } = remotionOutil('ffmpeg', ['-i', fichier, '-af', 'silencedetect=noise=-35dB:d=0.2', '-f', 'null', '-']);
  const silences: Intervalle[] = [];
  let debut: number | null = null;
  for (const ligne of stderr.split('\n')) {
    const a = /silence_start: (-?[\d.]+)/.exec(ligne);
    const b = /silence_end: ([\d.]+)/.exec(ligne);
    if (a) debut = Math.max(0, Number(a[1]));
    if (b && debut !== null) {
      silences.push({ debut, fin: Number(b[1]) });
      debut = null;
    }
  }
  if (debut !== null) silences.push({ debut, fin: duree });
  return couperEnPhrases(passagesParles(silences, duree), liste.map((p) => p.length));
}
for (const [i, segment] of script.segments.entries()) {
  if (!segment.voix.trim()) {
    fichiers.push('');
    durees.push(null);
    continue;
  }
  const fichier = join(dossier, `${String(i + 1).padStart(2, '0')}.mp3`);
  const texte = segment.prononciation ?? segment.voix;
  if (systeme) {
    // Synthèse de macOS : WAV (le ffmpeg de Remotion ne lit pas l'AIFF), puis MP3
    const temp = mkdtempSync(join(tmpdir(), 'voix-'));
    const wav = join(temp, 'phrase.wav');
    const say = spawnSync('say', ['-v', 'Thomas', '-r', '165', '--file-format=WAVE', '--data-format=LEI16@44100', '-o', wav, texte]);
    if (say.status !== 0) throw new Error(`say : ${say.stderr}`);
    const mp3 = remotionOutil('ffmpeg', ['-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', fichier]);
    rmSync(temp, { recursive: true, force: true });
    if (mp3.code !== 0) throw new Error(mp3.stderr);
    normaliserVoix(fichier);
    const duree = dureeAudio(fichier);
    fichiers.push(`voix/${id}/${String(i + 1).padStart(2, '0')}.mp3`);
    durees.push(duree);
    heuresDesPhrases[i] = reperer(fichier, segment.voix, duree);
    console.log(`✓ segment ${i + 1} (voix provisoire) : ${duree.toFixed(2)} s${heuresDesPhrases[i] ? '' : ' (phrases non repérées : sous-titres au prorata)'}`);
    continue;
  }
  const reponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voix!}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': cle!, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: texte,
      model_id: process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2',
      language_code: 'fr',
      // Phrases voisines : intonation continue d'un segment à l'autre
      previous_text: script.segments[i - 1]?.voix || undefined,
      next_text: script.segments[i + 1]?.voix || undefined,
      // Voix posée : stable, sans emphase, débit un peu ralenti
      voice_settings: { stability: 0.65, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.92 },
    }),
  });
  if (!reponse.ok) throw new Error(`ElevenLabs, segment ${i + 1} : ${reponse.status} ${await reponse.text()}`);
  writeFileSync(fichier, Buffer.from(await reponse.arrayBuffer()));
  normaliserVoix(fichier);
  const duree = dureeAudio(fichier);
  fichiers.push(`voix/${id}/${String(i + 1).padStart(2, '0')}.mp3`);
  durees.push(duree);
  heuresDesPhrases[i] = reperer(fichier, segment.voix, duree);
  console.log(`✓ segment ${i + 1} : ${duree.toFixed(2)} s${heuresDesPhrases[i] ? '' : ' (phrases non repérées : sous-titres au prorata)'}`);
}

const segments = calerSurPhrases(script, durees).map((heures, i) => {
  const repere = heuresDesPhrases[i];
  if (!heures.parole || !repere) return heures;
  const depart = heures.parole.debut;
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return { ...heures, parole: { ...heures.parole, phrases: repere.map((p) => ({ debut: r(depart + p.debut), fin: r(depart + p.fin) })) } };
});
const timings: Timings = { source: systeme ? 'systeme' : 'elevenlabs', audio: { segments: fichiers }, segments };
writeFileSync(fichierTimings, `${JSON.stringify(timings, null, 2)}\n`);
console.log(`✓ timings.json : ${timings.segments.at(-1)!.fin.toFixed(1)} s au total`);
await ecrireSousTitres(id);

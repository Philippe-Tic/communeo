/**
 * Voix off générée avec ElevenLabs : `pnpm videos:voix <vidéo>`.
 *
 * Une phrase par segment (voix posée, débit calme), dans public/voix/<vidéo>/<n>.mp3 ; les segments sont
 * ensuite recalés sur la durée réelle de chaque phrase (timings.json), puis les sous-titres regénérés.
 * Variables : ELEVENLABS_API_KEY (obligatoire), ELEVENLABS_VOICE_ID (voix française choisie dans la
 * bibliothèque ElevenLabs), ELEVENLABS_MODEL (défaut eleven_multilingual_v2).
 * Sans clé : déposer une piste public/voix/<vidéo>/voix.mp3 et lancer `pnpm videos:recaler <vidéo>`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { calerSurPhrases } from '../src/lib/calage';
import type { Timings } from '../src/lib/script';
import { ecrireSousTitres } from './sous-titres';
import { charger, dureeAudio, VIDEOS, videoDemandee } from './outils';

const id = videoDemandee();
const cle = process.env.ELEVENLABS_API_KEY;
const voix = process.env.ELEVENLABS_VOICE_ID;
if (!cle || !voix) {
  console.error(
    `ELEVENLABS_API_KEY et ELEVENLABS_VOICE_ID sont nécessaires.\nSans ElevenLabs : déposez la voix enregistrée dans public/voix/${id}/voix.mp3 (un silence net entre chaque segment), puis lancez pnpm videos:recaler ${id}.`,
  );
  process.exit(1);
}

const { script, fichierTimings } = await charger(id);
const dossier = join(VIDEOS, 'public', 'voix', id);
mkdirSync(dossier, { recursive: true });

const fichiers: string[] = [];
const durees: Array<number | null> = [];
for (const [i, segment] of script.segments.entries()) {
  if (!segment.voix.trim()) {
    fichiers.push('');
    durees.push(null);
    continue;
  }
  const reponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voix}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': cle, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: segment.voix,
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
  const fichier = join(dossier, `${String(i + 1).padStart(2, '0')}.mp3`);
  writeFileSync(fichier, Buffer.from(await reponse.arrayBuffer()));
  const duree = dureeAudio(fichier);
  fichiers.push(`voix/${id}/${String(i + 1).padStart(2, '0')}.mp3`);
  durees.push(duree);
  console.log(`✓ segment ${i + 1} : ${duree.toFixed(2)} s`);
}

const timings: Timings = { source: 'elevenlabs', audio: { segments: fichiers }, segments: calerSurPhrases(script, durees) };
writeFileSync(fichierTimings, `${JSON.stringify(timings, null, 2)}\n`);
console.log(`✓ timings.json : ${timings.segments.at(-1)!.fin.toFixed(1)} s au total`);
await ecrireSousTitres(id);

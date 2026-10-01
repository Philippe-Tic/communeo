/**
 * Musique de fond d'une vidéo : `pnpm videos:musique <vidéo>` → public/musique/<id>.mp3, et le clic de
 * souris (public/sons/clic.wav).
 *
 * Composée ici, note à note (scripts/synthe.ts) : libre de droits, sans téléchargement. Pop acoustique
 * légère en ré majeur (I–V–vi–IV), au tempo du script. Elle suit le montage : les scènes (timings.json)
 * tombent sur les temps, chaque changement de scène a son souffle, l'arrangement s'étoffe au fil de la
 * vidéo et se résout sur un accord à la carte de fin. Son niveau est réglé sur celui de la voix ; la
 * composition la baisse sous la voix (composants/Musique.tsx).
 *
 * Pour une autre musique (une piste libre de droits choisie ailleurs) : déposer le MP3 à la place de
 * public/musique/<id>.mp3 ; `pnpm videos:render` ne régénère la musique que si le fichier manque.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chronologie, dureeEnImages } from '../src/lib/script';
import { FPS } from '../src/lib/format';
import { charger, remotionOutil, VIDEOS, videoDemandee } from './outils';
import { basse, caisse, charleston, clochette, claquement, nappe, niveau, pincer, Piste, reverberer, souffle, TAUX, wav } from './synthe';

/** Durée de la glissade entre deux scènes (Composition : TRANSITION), en secondes */
export const GLISSADE = 0.6;

// I–V–vi–IV en ré majeur : voicings serrés (la nappe ne saute pas d'un accord à l'autre), et la basse
const ACCORDS = [
  { notes: [50, 54, 57, 62], basse: 38 }, // ré
  { notes: [49, 52, 57, 61], basse: 45 }, // la
  { notes: [50, 54, 59, 62], basse: 47 }, // si mineur
  { notes: [50, 55, 59, 62], basse: 43 }, // sol
];
/** Arpège de la corde pincée, une note par croche, dans l'accord une octave au-dessus */
const ARPEGE = [0, 1, 2, 3, 2, 1, 2, 3];

/** Niveau de la voix off (RMS), pour régler la musique dessous */
function niveauVoix(fichiers: string[]): number | null {
  const niveaux = fichiers
    .filter(Boolean)
    .map((fichier) => {
      // Décodée en WAV 16 bits sur la sortie standard (le ffmpeg de Remotion n'a pas de sortie brute)
      const octets = spawnSync('pnpm', ['exec', 'remotion', 'ffmpeg', '-v', 'error', '-i', join(VIDEOS, 'public', fichier), '-ac', '1', '-ar', '22050', '-bitexact', '-map_metadata', '-1', '-acodec', 'pcm_s16le', '-f', 'wav', '-'], {
        cwd: VIDEOS,
        maxBuffer: 256 * 1024 * 1024,
      }).stdout;
      const donnees = octets.indexOf('data') + 8;
      if (donnees < 8) return 0;
      const echantillons: number[] = [];
      for (let i = donnees; i + 1 < octets.length; i += 2) echantillons.push(octets.readInt16LE(i) / 32768);
      return niveau(echantillons);
    })
    .filter((n) => n > 0);
  return niveaux.length ? niveaux.reduce((a, b) => a + b, 0) / niveaux.length : null;
}

function clic(): Piste {
  const piste = new Piste(0.08);
  let precedent = 0;
  for (let i = 0; i < piste.longueur; i += 1) {
    const s = i / TAUX;
    const bruit = Math.sin(i * 12.9898) * 43758.5453;
    const b = (bruit - Math.floor(bruit)) * 2 - 1;
    const aigu = b - precedent;
    precedent = b;
    const v = aigu * Math.exp(-s / 0.002) * 0.35 + Math.sin(2 * Math.PI * 1900 * s) * Math.exp(-s / 0.008) * 0.25 + Math.sin(2 * Math.PI * 140 * s) * Math.exp(-s / 0.014) * 0.4;
    piste.ajouter(i, v * 0.8);
  }
  return piste;
}

const id = videoDemandee();
const { script, timings } = await charger(id);
const segments = chronologie(script, timings);
const duree = dureeEnImages(script, timings) / FPS;
const temps = 60 / (script.tempo ?? 100);
const mesure = 4 * temps;
const debuts = segments.map((s) => s.debut);
const derniere = segments.at(-1)!.debut;
const scene = (t: number) => debuts.filter((d) => d <= t + 1e-6).length - 1;
const avantFin = (t: number) => t >= derniere - temps - 1e-6;

const sec = new Piste(duree);
const envoi = new Piste(duree);

// Boucle d'accords jusqu'à la carte de fin
for (let m = 0; m * mesure < derniere - 1e-6; m += 1) {
  const t = m * mesure;
  const accord = ACCORDS[m % ACCORDS.length]!;
  const finMesure = Math.min(mesure, derniere - t);
  nappe(envoi, t, finMesure, accord.notes, 0.028);
  for (let c = 0; c < 8; c += 1) {
    const tc = t + (c * temps) / 2;
    if (tc >= derniere - 1e-6) break;
    const n = scene(tc);
    const note = accord.notes[ARPEGE[c]!]! + 12;
    const force = c === 0 ? 1 : c % 2 ? 0.55 : 0.7;
    pincer(envoi, tc, note, 0.3 * force, c % 2 ? 0.3 : -0.3);
    // Scène du site public : une clochette double l'arpège sur les temps
    if (n === segments.length - 2 && c % 2 === 0) clochette(envoi, tc, note + 12, 0.05 * force, 0.2);
  }
  // Rythmique : basse et charleston dès la 3e mesure, caisse et claquement dès la 2e scène ; rien
  // pendant le temps qui précède la carte de fin (le souffle prend la place)
  for (let b = 0; b < 4; b += 1) {
    const tb = t + b * temps;
    if (avantFin(tb)) break;
    const n = scene(tb);
    if (m >= 2) {
      if (b === 0) basse(sec, tb, accord.basse, temps * 1.4, 0.32);
      if (b === 2) basse(sec, tb + temps / 2, accord.basse, temps * 0.5, 0.22);
      if (b === 3) basse(sec, tb, accord.basse + 12, temps * 0.9, 0.18);
      charleston(sec, tb + temps / 2, 0.07);
      charleston(sec, tb, 0.03, -0.3);
    }
    if (n >= 1) {
      if (b === 0 || b === 2) caisse(sec, tb, 0.55);
      if (b === 1 || b === 3) claquement(envoi, tb, 0.14);
    }
  }
}

// Changements de scène : un souffle qui culmine juste avant la fin de la glissade
for (const { debut: d } of segments.slice(1).filter((s) => s.entree !== 'fondu')) souffle(sec, d - GLISSADE - 0.2, GLISSADE + 0.45, GLISSADE + 0.05, 0.22);

// Carte de fin : accord de ré gratté, clochettes, puis la nappe tenue jusqu'au bout
const accordRe = ACCORDS[0]!;
caisse(sec, derniere, 0.6);
basse(sec, derniere, accordRe.basse, 3, 0.34);
[...accordRe.notes, 66, 69].forEach((note, i) => pincer(envoi, derniere + i * 0.018, note + 12, 0.24, i % 2 ? 0.35 : -0.35, 4));
clochette(envoi, derniere, 86, 0.07, 0.25);
clochette(envoi, derniere + temps, 81, 0.05, -0.25);
nappe(envoi, derniere, duree - derniere, accordRe.notes, 0.03);

// Mixage : son sec et bus d'envoi, réverbération réglée à un tiers du niveau de l'envoi
const reverb = reverberer(envoi);
const rapport = niveau(envoi.g) / Math.max(1e-9, niveau(reverb.g));
const mix = new Piste(duree);
mix.mixer(sec);
mix.mixer(envoi);
mix.mixer(reverb, rapport * 0.35);

// Fondus d'entrée et de sortie
const fondu = (i: number) => Math.min(1, i / (0.15 * TAUX), (mix.longueur - i) / (1.8 * TAUX));
for (let i = 0; i < mix.longueur; i += 1) {
  mix.g[i]! *= fondu(i);
  mix.d[i]! *= fondu(i);
}

// Niveau : 9 dB sous la voix quand la musique est seule (la composition la baisse encore sous la voix)
const voix = timings.audio && 'segments' in timings.audio ? niveauVoix(timings.audio.segments) : null;
const cible = (voix ?? 0.08) * 10 ** (-9 / 20);
const gain = cible / Math.max(1e-9, (niveau(mix.g) + niveau(mix.d)) / 2);
for (const canal of [mix.g, mix.d]) {
  for (let i = 0; i < canal.length; i += 1) {
    const v = canal[i]! * gain;
    // Limiteur doux : aucune crête ne sature
    canal[i] = Math.abs(v) < 0.8 ? v : Math.sign(v) * (0.8 + 0.2 * Math.tanh((Math.abs(v) - 0.8) / 0.2));
  }
}

const temp = mkdtempSync(join(tmpdir(), 'musique-'));
const source = join(temp, 'musique.wav');
writeFileSync(source, wav(mix));
mkdirSync(join(VIDEOS, 'public/musique'), { recursive: true });
const sortie = join(VIDEOS, 'public/musique', `${id}.mp3`);
const mp3 = remotionOutil('ffmpeg', ['-y', '-v', 'error', '-i', source, '-codec:a', 'libmp3lame', '-b:a', '160k', sortie]);
rmSync(temp, { recursive: true, force: true });
if (mp3.code !== 0) throw new Error(mp3.stderr);

mkdirSync(join(VIDEOS, 'public/sons'), { recursive: true });
writeFileSync(join(VIDEOS, 'public/sons/clic.wav'), wav(clic()));
console.log(`✓ public/musique/${id}.mp3 : ${duree.toFixed(1)} s, ${script.tempo ?? 100} temps/min${voix ? ', réglée 9 dB sous la voix' : ''}`);
console.log('✓ public/sons/clic.wav');

/**
 * Planche contact d'une vidéo : `pnpm videos:planche <vidéo> [--pas 0.5] [--rendre]`. Une image par
 * seconde (ou toutes les `--pas` secondes), repérée par son heure, en grille de 4 colonnes :
 * out/<vidéo>-planche.png. Rend la vidéo dans out/ si elle n'y est pas (ou avec `--rendre`).
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { dureeAudio as duree, executer, remotionOutil, VIDEOS, videoDemandee } from './outils';

const id = videoDemandee();
const index = process.argv.indexOf('--pas');
const pas = index > 0 ? Number(process.argv[index + 1]) : 1;
const video = join(VIDEOS, 'out', `${id}.mp4`);
if (!existsSync(video) || process.argv.includes('--rendre')) {
  executer('pnpm', ['exec', 'remotion', 'render', 'src/index.ts', id, video, '--codec=h264', '--crf=20']);
}

const LARGEUR = 640;
const HAUTEUR = 360;
const ESPACE = 14;
const LEGENDE = 34;
const COLONNES = 4;

const total = duree(video);
const heures: number[] = [];
// Jamais au-delà de la dernière image (la piste audio peut dépasser la vidéo de quelques millisecondes)
for (let t = 0; t + 0.02 < total - 0.04; t += pas) heures.push(t + 0.02);

const dossier = await mkdtemp(join(tmpdir(), `planche-${id}-`));
try {
  const vignettes = heures.map((t, i) => {
    const fichier = join(dossier, `${i}.png`);
    const { code, stderr } = remotionOutil('ffmpeg', ['-y', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf', `scale=${LARGEUR}:${HAUTEUR}`, fichier]);
    if (code !== 0) throw new Error(stderr.split('\n').slice(-5).join('\n'));
    return fichier;
  });
  const lignes = Math.ceil(vignettes.length / COLONNES);
  const cellule = { l: LARGEUR + ESPACE, h: HAUTEUR + LEGENDE + ESPACE };
  const composition = vignettes.flatMap((fichier, i) => {
    const left = ESPACE + (i % COLONNES) * cellule.l;
    const top = ESPACE + Math.floor(i / COLONNES) * cellule.h;
    const t = heures[i]!;
    const etiquette = `<svg width="${LARGEUR}" height="${LEGENDE}"><text x="2" y="24" font-family="Helvetica, Arial" font-size="20" fill="#4A4942">${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}  ·  image ${Math.round(t * 30)}</text></svg>`;
    return [
      { input: fichier, left, top },
      { input: Buffer.from(etiquette), left, top: top + HAUTEUR },
    ];
  });
  const sortie = join(VIDEOS, 'out', `${id}-planche.png`);
  await sharp({ create: { width: ESPACE + COLONNES * cellule.l, height: ESPACE + lignes * cellule.h, channels: 3, background: '#FFFFFF' } })
    .composite(composition)
    .png()
    .toFile(sortie);
  console.log(`✓ ${sortie} : ${vignettes.length} images, une toutes les ${pas} s`);
} finally {
  await rm(dossier, { recursive: true, force: true });
}

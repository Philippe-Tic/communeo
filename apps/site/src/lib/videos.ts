/**
 * Vidéos de communeo.fr, produites dans v2/videos (Remotion) et rendues ici, dans src/videos/ :
 * `<id>.mp4`, `<id>.vtt` (sous-titres), `<id>-apercu.png` (image d'attente), `<id>-transcription.md`
 * (ce qui est dit et ce qu'on voit, pour qui ne peut ni voir ni entendre la vidéo).
 *
 * Hébergées sur le site, sans lecteur tiers (aucun traceur), lecture au clic seulement.
 */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

export type IdVideo = 'v1-demo' | 'v2-alerte' | 'v3-themes' | 'v5-devis';

/**
 * Titre (nom accessible du lecteur), durée affichée comme dans les maquettes, et pour les moteurs de
 * recherche (VideoObject) : description, durée ISO 8601 et date de mise en ligne.
 */
export const VIDEOS: Record<IdVideo, { titre: string; duree: string; description: string; dureeIso: string; publiee: string }> = {
  'v1-demo': {
    titre: 'Démonstration : de l’inscription au site en ligne',
    duree: '1 min 24',
    description: 'Créer le site internet d’une mairie avec Communeo : inscription, données publiques reprises automatiquement, éditeur par blocs, mise en ligne, puis le site sur téléphone et ordinateur.',
    dureeIso: 'PT1M24S',
    publiee: '2026-10-01',
  },
  'v2-alerte': {
    titre: 'Une alerte, de l’administration au téléphone',
    duree: '20 s',
    description: 'Une coupure d’eau publiée depuis l’administration Communeo apparaît en bandeau sur le site de la commune en moins d’une minute, sans remettre le site en ligne.',
    dureeIso: 'PT21S',
    publiee: '2026-10-01',
  },
  'v3-themes': {
    titre: 'Un contenu, quatre thèmes',
    duree: '15 s',
    description: 'Le site d’une commune dans les quatre thèmes de Communeo (Institutionnel, Moderne, Journal, Bourg) : la mise en page change, les contenus restent.',
    dureeIso: 'PT15S',
    publiee: '2026-10-01',
  },
  'v5-devis': {
    titre: 'Le devis en ligne',
    duree: '20 s',
    description: 'Le devis en ligne de Communeo : prix selon la population INSEE, SIRET vérifié, devis PDF horodaté, facture déposée sur Chorus Pro.',
    dureeIso: 'PT20S',
    publiee: '2026-10-01',
  },
};

const mp4 = import.meta.glob<string>('../videos/*.mp4', { query: '?url', import: 'default', eager: true });
// Fichier séparé, jamais intégré en data: (la CSP du site, media-src 'self', le bloquerait)
const vtt = import.meta.glob<string>('../videos/*.vtt', { query: '?url&no-inline', import: 'default', eager: true });
const apercus = import.meta.glob<ImageMetadata>('../videos/*-apercu.png', { import: 'default', eager: true });
const transcriptions = import.meta.glob<{ compiledContent: () => Promise<string> }>('../videos/*-transcription.md', { eager: true });

function fichier<T>(fichiers: Record<string, T>, nom: string): T {
  const trouve = fichiers[`../videos/${nom}`];
  if (!trouve) throw new Error(`Vidéo : fichier manquant src/videos/${nom} (pnpm videos:render dans v2/videos)`);
  return trouve;
}

export interface FichiersVideo {
  mp4: string;
  vtt: string;
  /** Image d'attente en 1 280 px (vignette des données structurées) */
  apercu: string;
  /** Image d'attente source, pour une image responsive sous le bouton de lecture */
  apercuImage: ImageMetadata;
  /** Transcription en HTML, sans son titre (la page fournit le sien) */
  transcription: string;
}

export async function fichiersVideo(id: IdVideo): Promise<FichiersVideo> {
  const apercuImage = fichier(apercus, `${id}-apercu.png`);
  const apercu = await getImage({ src: apercuImage, width: 1280, format: 'webp', quality: 80 });
  const html = await fichier(transcriptions, `${id}-transcription.md`).compiledContent();
  return {
    mp4: fichier(mp4, `${id}.mp4`),
    vtt: fichier(vtt, `${id}.vtt`),
    apercu: apercu.src,
    apercuImage,
    transcription: html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/, ''),
  };
}

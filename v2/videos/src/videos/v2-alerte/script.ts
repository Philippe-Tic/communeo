/**
 * V2. Une alerte, de l'administration au téléphone de l'habitant (20 s). Cible : une secrétaire de
 * mairie sans compétence technique ; message : l'information part vite, sans remettre le site en ligne.
 *
 * Un seul plan, l'écran partagé (l'administration à gauche, le téléphone d'un habitant à droite) : les
 * segments rythment la caméra et la musique, sans glissade d'une scène à l'autre. Les durées sont
 * celles prévues par segment (minimum) : la voix les allonge si elle est plus longue.
 */
import type { ScriptVideo } from '../../lib/script';

export const script: ScriptVideo = {
  id: 'v2-alerte',
  titre: 'Une alerte, de l’administration au téléphone',
  // Le bandeau vient d'apparaître sur le téléphone, l'administration à côté
  apercu: { segment: 2, apres: 3.2 },
  finale: 0.5,
  // Musique à 100 temps/min : chaque segment tombe sur un temps
  tempo: 100,
  segments: [
    {
      debut: 0,
      fin: 4.8,
      voix: 'Une coupure d’eau est prévue mardi ? Prévenez les habitants.',
      ecran: 'Écran partagé : à gauche l’écran « Nouvelle alerte » de l’administration, à droite le site de Saint-Aubin-sur-Loire sur un téléphone, sans bandeau. On tape le titre « Coupure d’eau mardi de 9 h à 12 h ».',
    },
    {
      debut: 4.8,
      fin: 11.4,
      voix: 'Un titre, le niveau « Attention », une date de fin, puis vous publiez.',
      ecran: 'On choisit la sévérité « Attention », on écrit le message « Pensez à faire des réserves d’eau. », on règle la fin au mardi 6 octobre à 12 h, puis l’aperçu du bandeau et « Publier l’alerte ». Un chronomètre démarre dans le coin.',
    },
    {
      debut: 11.4,
      fin: 16.8,
      voix: 'Sur leur téléphone, le bandeau apparaît aussitôt, sans remettre le site en ligne.',
      ecran: 'L’administration confirme « Alerte publiée ». Le téléphone recharge la page : le bandeau « Attention – Coupure d’eau mardi de 9 h à 12 h » apparaît en haut du site. Le chronomètre s’arrête.',
    },
    {
      debut: 16.8,
      fin: 19.8,
      voix: 'Il disparaît tout seul à la date de fin.',
      ecran: 'Gros plan sur le bandeau du téléphone, avec la légende « Retrait automatique mardi à 12 h ».',
    },
  ],
};

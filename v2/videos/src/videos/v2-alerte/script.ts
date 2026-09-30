/** V2. Une alerte, de l'administration au téléphone de l'habitant (20 s). Brouillon de la voix, à valider. */
import type { ScriptVideo } from '../../lib/script';

export const script: ScriptVideo = {
  id: 'v2-alerte',
  titre: 'Une alerte, de l’administration au téléphone',
  apercu: 13,
  segments: [
    { debut: 0, fin: 5, voix: 'Une coupure d’eau est prévue mardi ? Vous créez une alerte depuis l’administration.', ecran: 'Écran partagé : à gauche l’écran « Nouvelle alerte », à droite un téléphone sur le site de Saint-Aubin, sans bandeau.' },
    { debut: 5, fin: 11, voix: 'Un titre, un niveau de gravité, une date de fin, et vous publiez.', ecran: 'On tape « Coupure d’eau mardi de 9 h à 12 h », on choisit « Attention », on règle la fin, on publie. Un chronomètre démarre.' },
    { debut: 11, fin: 17, voix: 'Quelques secondes plus tard, le bandeau apparaît en haut du site, sur le téléphone des habitants.', ecran: 'Le téléphone se recharge : le bandeau d’alerte apparaît en haut du site.' },
    { debut: 17, fin: 20, voix: 'Il disparaît tout seul à la date de fin.', ecran: 'Le chronomètre s’arrête ; zoom sur le bandeau.' },
  ],
};

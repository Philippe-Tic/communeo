/** Vidéo de test (5 s) : chaque composant du socle, pour vérifier le rendu et la charte. */
import type { ScriptVideo } from '../../lib/script';

export const script: ScriptVideo = {
  id: 'test',
  titre: 'Test du socle',
  apercu: 1.6,
  finale: 0,
  segments: [
    { debut: 0, fin: 2.8, voix: 'Vous publiez l’alerte depuis l’administration.', ecran: 'L’écran « Nouvelle alerte » : zoom sur le titre, saisie, clic sur « Voir l’aperçu ».' },
    { debut: 2.8, fin: 3.9, voix: 'Elle s’affiche chez les habitants.', ecran: 'Le site de Saint-Aubin sur un téléphone, avec le bandeau d’alerte.' },
    { debut: 3.9, fin: 5, voix: '', ecran: 'Carte de fin : « 30 jours gratuits, sans engagement », communeo.fr.' },
  ],
};

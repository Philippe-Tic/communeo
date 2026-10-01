/** V1. Démonstration, de l'inscription au site en ligne (1 min 30). Brouillon de la voix, à valider. */
import type { ScriptVideo } from '../../lib/script';

export const script: ScriptVideo = {
  id: 'v1-demo',
  titre: 'Démonstration : de l’inscription au site en ligne',
  apercu: 62,
  segments: [
    { debut: 0, fin: 4, voix: 'Voici comment une mairie crée son site internet avec Communeo.', ecran: 'La page d’inscription de Communeo.' },
    { debut: 4, fin: 10, voix: 'Vous cherchez votre commune, puis vous indiquez votre nom et votre adresse e-mail.', ecran: 'On tape « Saint-Aubin » dans la recherche, on choisit la commune, on remplit le nom et l’e-mail.' },
    { debut: 10, fin: 17, voix: 'L’assistant de création reprend les données publiques : coordonnées, horaires d’ouverture et population.', ecran: 'L’assistant de création : les coordonnées et les horaires de l’Annuaire, la population INSEE se remplissent.' },
    { debut: 17, fin: 25, voix: 'Vous choisissez un thème. Si vous en changez plus tard, vos contenus suivent.', ecran: 'Le choix du thème dans l’assistant.' },
    { debut: 25, fin: 35, voix: 'Le tableau de bord indique la prochaine étape. Une page se modifie comme un document : un texte, une image, un PDF.', ecran: 'Le tableau de bord, puis l’éditeur de la page « Location de la salle des fêtes » : on ajoute un texte, une image et un document.' },
    { debut: 35, fin: 42, voix: 'Chaque modification est enregistrée automatiquement dans le brouillon.', ecran: 'Zoom sur « Brouillon enregistré » en haut de l’éditeur.' },
    { debut: 42, fin: 50, voix: 'Avant de publier, vous voyez la page telle qu’elle apparaîtra, dans votre thème.', ecran: 'L’aperçu de la page dans le thème Institutionnel.' },
    { debut: 50, fin: 58, voix: 'Un clic sur « Mettre en ligne », et le site est à jour en moins d’une minute.', ecran: 'Clic sur « Mettre en ligne » : vérification, génération des pages, publication, en ligne.' },
    { debut: 58, fin: 68, voix: 'Sur téléphone comme sur ordinateur, les habitants trouvent les horaires, avec l’indication ouvert ou fermé, et les actualités.', ecran: 'Le site public de Saint-Aubin-sur-Loire sur un téléphone et sur un ordinateur : horaires « ouvert maintenant », actualités.' },
    { debut: 68, fin: 78, voix: 'Les démarches Service-Public sont déjà là. Pendant l’essai, un bandeau indique que le site est en préparation.', ecran: 'La recherche des démarches (« carte d’identité »), puis le bandeau « Site en préparation ».' },
    { debut: 78, fin: 88, voix: 'Trente jours gratuits, sans engagement. Rendez-vous sur communeo.fr.', ecran: 'Carte de fin : « 30 jours gratuits, sans engagement », communeo.fr.' },
  ],
};

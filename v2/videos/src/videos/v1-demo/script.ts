/**
 * V1. Démonstration, de l'inscription au site en ligne (1 min 30). Cible : une secrétaire de mairie sans
 * compétence technique ; message : un site correct en une journée, sans rien savoir faire de technique.
 * Les durées sont celles prévues par scène (minimum) : la voix les allonge si elle est plus longue.
 */
import type { ScriptVideo } from '../../lib/script';

export const script: ScriptVideo = {
  id: 'v1-demo',
  titre: 'Démonstration : de l’inscription au site en ligne',
  // Le site public sur l'ordinateur et le téléphone (scène 5, une fois le téléphone arrivé)
  apercu: { segment: 4, apres: 1.8 },
  finale: 0.4,
  // Musique à 100 temps/min : un temps = 0,6 s = 18 images, la durée d'une glissade entre deux scènes
  tempo: 100,
  segments: [
    {
      debut: 0,
      fin: 10,
      voix: 'Créer le site de votre commune commence ici. Vous cherchez votre commune, puis vous indiquez votre nom et votre adresse e-mail.',
      ecran: 'La page d’inscription de Communeo. On tape « Saint-Au » dans « Votre commune », Saint-Aubin-sur-Loire est proposée et choisie ; on saisit le prénom, le nom et l’adresse e-mail.',
    },
    {
      debut: 10,
      fin: 23,
      voix: 'Communeo récupère tout seul les informations publiques : l’adresse de la mairie, les horaires, la population. Il ne reste qu’à choisir l’allure du site.',
      prononciation: 'Communéo récupère tout seul les informations publiques : l’adresse de la mairie, les horaires, la population. Il ne reste qu’à choisir l’allure du site.',
      ecran: 'L’assistant de création : la commune est choisie, la population (INSEE), l’adresse, le téléphone et les coordonnées (Annuaire du service public) se remplissent seuls. Puis l’étape « Votre thème » : on choisit Institutionnel.',
    },
    {
      debut: 23,
      fin: 42.5,
      voix: 'Pour modifier une page, vous ajoutez des blocs : un texte, une photo, un document. Tout est enregistré au fur et à mesure, rien ne se perd.',
      ecran: 'Le tableau de bord, puis la page « Location de la salle des fêtes » : on complète le texte, on ajoute un bloc Image (photo de la salle), puis un bloc Documents (règlement en PDF). En haut : « Brouillon enregistré à l’instant ».',
    },
    {
      debut: 42.5,
      fin: 57,
      // Même écran que la fin de la scène précédente (l'éditeur) : pas de glissade
      entree: 'fondu',
      voix: 'Un aperçu pour vérifier, puis « Mettre en ligne ». Communeo vous guide à chaque étape.',
      prononciation: 'Un aperçu pour vérifier, puis : mettre en ligne. Communéo vous guide à chaque étape.',
      ecran: 'L’aperçu de la page dans le thème, puis l’écran Mise en ligne : vérification des contenus, préparation des pages, publication, puis « Votre site est à jour ».',
    },
    {
      debut: 57,
      fin: 75,
      voix: 'Le site est prêt, sur téléphone comme sur ordinateur : les horaires à jour, les actualités, les démarches en ligne. Les habitants trouvent l’essentiel.',
      ecran: 'Le site de Saint-Aubin-sur-Loire sur un ordinateur et un téléphone : « Ouverte · ferme à 12 h », les actualités, la recherche des démarches (« carte d’identité »), le bandeau « Site en préparation » pendant l’essai.',
    },
    {
      debut: 75,
      fin: 81.5,
      voix: 'Communeo, trente jours gratuits, sans engagement. Rendez-vous sur communeo.fr.',
      prononciation: 'Communéo : trente jours gratuits, sans engagement. Rendez-vous sur communéo point f r.',
      ecran: 'Carte de fin : « 30 jours gratuits, sans engagement », communeo.fr.',
    },
  ],
};

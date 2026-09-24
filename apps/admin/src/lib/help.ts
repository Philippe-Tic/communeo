/**
 * Aides contextuelles (#154) : une phrase par écran, sous son titre, pour savoir à quoi il sert et
 * ce qu'il change sur le site. Rien n'y est affirmé que la plateforme ne fasse pas réellement.
 */
export const SCREEN_HELP: Record<string, string> = {
  '/pages':
    'Les pages présentent ce qui change peu : services, démarches, lieux. Une page publiée peut figurer dans le menu du site.',
  '/actualites': 'Les actualités racontent la vie de la commune, de la plus récente à la plus ancienne.',
  '/agenda': 'Les événements de la commune et des associations : dates, lieu, inscription.',
  '/documents': 'Délibérations, procès-verbaux, arrêtés et budgets, classés par type et par année.',
  '/equipe': 'Les élus et les services de la mairie, avec leurs fonctions et leurs coordonnées.',
  '/associations': 'Les associations peuvent proposer leur fiche depuis le site : vous la publiez ou la refusez ici.',
  '/alertes':
    "Une alerte publiée s'affiche en bandeau sur le site en moins d'une minute, sans attendre la mise en ligne.",
  '/dechets': 'Les jours de collecte, affichés sur la page Collecte des déchets du site.',
  '/cantine': 'Les menus de la semaine, affichés sur la page Cantine du site.',
  '/messages':
    'Les messages envoyés depuis le formulaire de contact du site. Une demande RGPD appelle une réponse sous un mois.',
  '/newsletter': "Les personnes inscrites à la lettre d'information depuis le site.",
  '/mediatheque':
    'Les images et documents de la commune, réutilisables partout. Chaque image a besoin d’un texte alternatif.',
  '/utilisateurs': 'Les personnes qui gèrent le site de la commune, et leur rôle : administrateur ou rédacteur.',
  '/conformite': "Ce que la loi demande au site d'une commune, point par point, avec l'écran où le compléter.",
  '/mon-site/informations': 'Les coordonnées et les horaires de la mairie, repris sur tout le site.',
  '/mon-site/legal':
    'Les pages Mentions légales et Données personnelles du site sont construites avec ces informations.',
  '/mon-site/accessibilite': 'Sans audit, le site se déclare « non conforme » : c’est ce que demande le RGAA.',
  '/mon-site/reseaux': 'Les comptes de la commune sur les réseaux sociaux, affichés sur le site.',
  '/mon-site/demarches': "Les fiches Service-Public des démarches administratives, tenues à jour par l'État.",
  '/mon-site/open-data': 'Le lien vers les données publiées par la commune.',
  '/mon-site/accueil': "Choisissez les sections de la page d'accueil : le thème décide de leur disposition.",
  '/mon-site/menu': "Le menu principal et le pied de page. Une page en brouillon n'y apparaît qu'une fois publiée.",
};

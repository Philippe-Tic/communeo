/** Les quatre thèmes présentés sur le site, avec la capture de leur accueil (`pnpm captures:themes`) */
import type { ImageMetadata } from 'astro';
import bourg from '../assets/themes/bourg.png';
import institutionnel from '../assets/themes/institutionnel.png';
import journal from '../assets/themes/journal.png';
import moderne from '../assets/themes/moderne.png';

export interface ThemePresente {
  key: string;
  label: string;
  d: string;
  ideal: string;
  forts: string[];
  capture: ImageMetadata;
}

export const THEMES_PRESENTES: ThemePresente[] = [
  {
    key: 'institutionnel',
    label: 'Institutionnel',
    d: 'Sobre et très lisible, pour tous les publics.',
    ideal: 'les communes qui veulent la lisibilité avant tout.',
    forts: ['Accès rapides aux démarches dès l’arrivée', 'Menu horizontal classique, repérable par tous', 'Grands caractères et contrastes marqués'],
    capture: institutionnel,
  },
  {
    key: 'moderne',
    label: 'Moderne',
    d: 'Dynamique et typographique : photos en grand, agenda et actualités dès le premier écran.',
    ideal: 'les communes qui publient beaucoup de photos et d’événements.',
    forts: ['Une grande photo en ouverture', 'L’agenda visible sans défiler', 'Des titres très présents'],
    capture: moderne,
  },
  {
    key: 'journal',
    label: 'Journal',
    d: 'Le journal de la commune : navigation en barre latérale, une de journal, rubriques en colonnes.',
    ideal: 'les communes à l’actualité riche.',
    forts: ['Une « une » pour l’actualité principale', 'Rubriques en colonnes, comme un bulletin', 'Navigation latérale toujours visible'],
    capture: journal,
  },
  {
    key: 'bourg',
    label: 'Bourg',
    d: 'Chaleureux et pratique : mairie, alertes, collectes et météo toujours à portée de main.',
    ideal: 'les villages qui veulent le pratique au premier plan.',
    forts: ['Horaires de la mairie en tête de page', 'Collectes, météo et cantine en cartes', 'Alertes en bandeau très visibles'],
    capture: bourg,
  },
];

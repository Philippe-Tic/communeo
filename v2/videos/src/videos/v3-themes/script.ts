/**
 * V3. Un contenu, quatre thèmes (15 s). Cible : une secrétaire de mairie sans compétence technique ;
 * message : changer de thème ne demande rien de ressaisir. Les durées sont celles prévues par scène
 * (minimum) : la voix les allonge si elle est plus longue.
 */
import type { ScriptVideo } from '../../lib/script';

export const script: ScriptVideo = {
  id: 'v3-themes',
  titre: 'Un contenu, quatre thèmes',
  // Les quatre accueils côte à côte (scène 3)
  apercu: { segment: 2, apres: 1.6 },
  finale: 0.6,
  // Musique à 100 temps/min, comme V1 : les scènes changent sur les temps
  tempo: 100,
  segments: [
    {
      debut: 0,
      fin: 3.6,
      voix: 'Dans l’écran Apparence, choisissez un thème.',
      ecran: 'L’écran Apparence de l’administration : les quatre thèmes en vignettes, Institutionnel est actif. On clique sur « Prévisualiser ».',
    },
    {
      debut: 3.6,
      fin: 10.8,
      voix: 'Institutionnel, Moderne, Journal ou Bourg : la mise en page change, vos contenus restent.',
      ecran: 'L’aperçu de l’accueil de Saint-Aubin-sur-Loire : on passe d’Institutionnel à Moderne, Journal puis Bourg. La mise en page change, le logo, le nom, les alertes et « Ouverte · ferme à 12 h » restent.',
    },
    {
      debut: 10.8,
      fin: 14.4,
      voix: 'Vous n’avez rien à ressaisir.',
      ecran: 'Les quatre accueils côte à côte, de l’en-tête aux actualités : mêmes photos, mêmes actualités, mêmes horaires.',
    },
  ],
};

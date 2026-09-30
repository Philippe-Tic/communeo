/** V3. Un contenu, quatre thèmes (15 s). Brouillon de la voix, à valider. */
import type { ScriptVideo } from '../../lib/script';

export const script: ScriptVideo = {
  id: 'v3-themes',
  titre: 'Un contenu, quatre thèmes',
  apercu: 8,
  segments: [
    { debut: 0, fin: 4, voix: 'Dans l’écran Apparence, vous choisissez le thème de votre site.', ecran: 'L’écran Apparence de l’administration, les quatre thèmes.' },
    { debut: 4, fin: 12, voix: 'Institutionnel, Moderne, Journal ou Bourg : la mise en page change, vos actualités, vos horaires et votre logo restent.', ecran: 'L’accueil de Saint-Aubin passe d’un thème à l’autre : Institutionnel, Moderne, Journal, Bourg.' },
    { debut: 12, fin: 15, voix: 'Rien à ressaisir.', ecran: 'Les quatre accueils côte à côte.' },
  ],
};

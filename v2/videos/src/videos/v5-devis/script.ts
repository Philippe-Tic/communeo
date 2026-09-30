/** V5. Le devis en ligne (20 s). Brouillon de la voix, à valider. */
import type { ScriptVideo } from '../../lib/script';

export const script: ScriptVideo = {
  id: 'v5-devis',
  titre: 'Le devis en ligne',
  apercu: 7,
  segments: [
    { debut: 0, fin: 5, voix: 'Pour passer à l’abonnement, le prix s’affiche selon la population INSEE de votre commune.', ecran: 'L’écran « Passer en live » : l’offre et le prix annuel.' },
    { debut: 5, fin: 11, voix: 'Le maire, ou une personne ayant délégation, indique son nom et sa qualité. Le SIRET est vérifié.', ecran: 'On remplit le SIRET, le nom du signataire, sa qualité.' },
    { debut: 11, fin: 16, voix: 'Le devis validé et le bon de commande sont disponibles en PDF, horodatés.', ecran: 'Clic sur « Valider le devis » ; le devis et le bon de commande en PDF.' },
    { debut: 16, fin: 20, voix: 'La facture arrive par Chorus Pro, à régler par virement sous trente jours.', ecran: 'Légende « Facture via Chorus Pro, virement sous 30 jours ».' },
  ],
};

/**
 * V5. Le devis en ligne (20 s), page Tarifs de communeo.fr (« Pour votre secrétariat »). Cible : une
 * secrétaire de mairie sans compétence technique ; message : la partie administrative, souvent la plus
 * redoutée, est simple. Les prix à l'écran sont ceux de packages/core/src/site/pricing.ts (tarifs
 * d'exemple, à confirmer) : la vidéo est à re-rendre s'ils changent.
 */
import type { ScriptVideo } from '../../lib/script';

export const script: ScriptVideo = {
  id: 'v5-devis',
  titre: 'Le devis en ligne',
  // Le devis validé, en PDF : la commune, la désignation et les montants
  apercu: { segment: 2, apres: 3.4 },
  finale: 0.8,
  // Même musique que V1 : un temps = 0,6 s, la durée d'une glissade
  tempo: 100,
  segments: [
    {
      debut: 0,
      fin: 4.2,
      voix: 'Le prix s’affiche selon la population INSEE de votre commune.',
      prononciation: 'Le prix s’affiche selon la population Insée de votre commune.',
      ecran: 'L’écran « Passer en live » de l’administration : l’offre, 590 € HT par an pour la tranche de 2 000 à 4 999 habitants (population INSEE : 3 240).',
    },
    {
      debut: 4.2,
      fin: 9.6,
      voix: 'Vous saisissez le SIRET, le nom du signataire et sa qualité.',
      prononciation: 'Vous saisissez le Siret, le nom du signataire et sa qualité.',
      ecran: 'Le formulaire « Devis et bon de commande » : on saisit le SIRET, puis « Claire Martin », qualité « Maire », et on coche « J’ai lu le devis et je le valide au nom de la commune ». Légende « SIRET contrôlé automatiquement ».',
    },
    {
      debut: 9.6,
      fin: 14.4,
      // Même écran que la fin de la scène précédente : le clic sur « Valider le devis »
      entree: 'fondu',
      voix: 'Le devis validé vaut bon de commande, en PDF et horodaté.',
      ecran: 'Clic sur « Valider le devis » : « Devis DEV-2026-0001 validé le 6 octobre 2026 par Claire Martin, Maire ». Clic sur « Télécharger le devis (PDF) » : le devis et bon de commande, 590,00 € HT, « Validé en ligne le 6 octobre 2026 à 10 h 12 ».',
    },
    {
      debut: 14.4,
      fin: 18.6,
      // Toujours le PDF : ses conditions
      entree: 'fondu',
      voix: 'La facture arrive par Chorus Pro, à régler par virement sous trente jours.',
      ecran: 'Les conditions du devis : facture déposée sur Chorus Pro, payable par virement sous 30 jours. Légende « Chorus Pro, virement sous 30 jours ».',
    },
  ],
};

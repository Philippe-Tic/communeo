/**
 * Démarches de la commune de démonstration : une arborescence réduite et une fiche complète,
 * au format que le backend produit à partir des archives de la DILA.
 */
export const demarcheThemes = () => [
  {
    id: 'N19803',
    title: 'Papiers – Citoyenneté',
    children: [
      {
        id: 'N359',
        title: "Carte d'identité, passeport",
        children: [],
        fiches: [
          { id: 'F1371', title: "Carte nationale d'identité : première demande" },
          { id: 'F14929', title: 'Passeport : première demande' },
          { id: 'F21089', title: "Perte ou vol d'une carte d'identité" },
        ],
      },
      {
        id: 'N142',
        title: 'État civil',
        children: [],
        fiches: [
          { id: 'F1427', title: 'Acte de naissance : demande de copie' },
          { id: 'F930', title: 'Reconnaissance d’un enfant' },
        ],
      },
    ],
    fiches: [],
  },
  {
    id: 'N19808',
    title: 'Logement',
    children: [
      {
        id: 'N319',
        title: 'Urbanisme',
        children: [],
        fiches: [
          { id: 'F17578', title: 'Déclaration préalable de travaux' },
          { id: 'F1986', title: 'Permis de construire' },
        ],
      },
    ],
    fiches: [],
  },
  {
    id: 'N19805',
    title: 'Famille – Scolarité',
    children: [],
    fiches: [
      { id: 'F1878', title: 'Inscription à l’école primaire' },
      { id: 'F2833', title: 'Recensement citoyen (à 16 ans)' },
    ],
  },
];

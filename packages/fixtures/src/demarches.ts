/**
 * Démarches de la commune de démonstration, au format exact que le backend produit à partir des
 * archives de la DILA : l'arborescence (thème, sous-thème, dossier), un index de recherche réduit
 * (`assets/demarches-index.json`), une fiche et un dossier (`assets/demarche.json`, `demarche-dossier.json`).
 */
export const demarcheThemes = () => [
  {
    id: 'N19810',
    title: 'Papiers - Citoyenneté - Élections',
    type: 'theme',
    children: [
      {
        id: 'N31785',
        title: 'État civil',
        type: 'sousTheme',
        children: [
          { id: 'N359', title: "Actes d'état civil", type: 'dossier', children: [] },
        ],
      },
      {
        id: 'N103',
        title: 'Identité - Authentification',
        type: 'sousTheme',
        children: [
          { id: 'N358', title: "Carte d'identité", type: 'dossier', children: [] },
          { id: 'N360', title: 'Passeport', type: 'dossier', children: [] },
        ],
      },
      {
        id: 'N20070',
        title: 'Citoyenneté',
        type: 'sousTheme',
        children: [
          { id: 'N47', title: 'Élections', type: 'dossier', children: [] },
        ],
      },
    ],
  },
  {
    id: 'N19805',
    title: 'Famille - Scolarité',
    type: 'theme',
    children: [
      {
        id: 'N20092',
        title: 'Couple',
        type: 'sousTheme',
        children: [
          { id: 'N142', title: 'Mariage', type: 'dossier', children: [] },
        ],
      },
    ],
  },
  {
    id: 'N19808',
    title: 'Logement',
    type: 'theme',
    children: [
      {
        id: 'N557',
        title: 'Urbanisme',
        type: 'sousTheme',
        children: [
          { id: 'N319', title: "Autorisations d'urbanisme", type: 'dossier', children: [] },
        ],
      },
    ],
  },
];

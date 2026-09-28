import { describe, expect, it } from 'vitest';
import { demarcheHref, mapFiche, mapThemes } from './map';
import { renderNodes } from './render';
import { DemarcheSearchIndex, mapDemarcheSearch, searchTerms, type DemarcheIndexEntry } from './search';

/** Arborescence telle que le backend la produit à partir de l'archive de la DILA */
const TREE = [
  {
    id: 'N19810',
    title: 'Papiers - Citoyenneté - Élections',
    type: 'theme',
    children: [
      {
        id: 'N103',
        title: 'Identité - Authentification',
        type: 'sousTheme',
        children: [
          { id: 'N358', title: "Carte d'identité", type: 'dossier', children: [] },
          { id: 'N360', title: 'Passeport', type: 'dossier', children: [] },
        ],
      },
      { id: 'N20000', title: 'Sous-thème vide', type: 'sousTheme', children: [] },
    ],
  },
];

describe('arborescence des démarches', () => {
  it('fait des dossiers des liens sous leur sous-thème', () => {
    const [theme] = mapThemes(TREE);
    expect(theme!.children).toHaveLength(1);
    expect(theme!.children[0]!.title).toBe('Identité - Authentification');
    expect(theme!.children[0]!.fiches).toEqual([
      { id: 'N358', title: "Carte d'identité" },
      { id: 'N360', title: 'Passeport' },
    ]);
  });

  it('écarte les rubriques sans aucun lien', () => {
    expect(mapThemes([{ id: 'N1', title: 'Vide', type: 'theme', children: [] }])).toEqual([]);
  });
});

describe('fiche et dossier', () => {
  const folder = {
    id: 'N358',
    title: "Carte d'identité",
    sousDossiers: [
      { id: 'N358-1', title: 'Pour un majeur', fiches: [{ id: 'F1341', title: 'Première demande' }] },
      { id: 'N358-2', title: 'Pour un mineur', fiches: [{ id: 'F1342', title: 'Première demande' }] },
    ],
  };

  it("reconnaît un dossier et garde ses fiches par sous-dossier", () => {
    const fiche = mapFiche({ id: 'N358', type: 'Dossier', title: "Carte d'identité", dossierPere: folder }, 'particuliers');
    expect(fiche!.isFolder).toBe(true);
    expect(fiche!.folder!.groups.map((group) => group.title)).toEqual(['Pour un majeur', 'Pour un mineur']);
  });

  it("rattache une fiche à son dossier", () => {
    const fiche = mapFiche({ id: 'F1341', type: "Fiche d'information", title: 'Carte : première demande', dossierPere: folder }, 'particuliers');
    expect(fiche!.isFolder).toBe(false);
    expect(fiche!.folder!.id).toBe('N358');
  });

  it('garde les liens vers les autres fiches sur le site de la commune', () => {
    const html = renderNodes(
      [{ type: 'paragraphe', children: [{ type: 'lienInterne', text: 'le passeport', href: 'N360', attributes: { ficheId: 'N360' } }] }],
      3,
      'professionnels',
    );
    expect(html).toContain(`href="${demarcheHref('N360', 'professionnels').replace(/&/g, '&amp;')}"`);
  });

  it('laisse en texte les renvois au glossaire, et ne fait jamais de lien vide', () => {
    const html = renderNodes([
      {
        type: 'paragraphe',
        children: [
          { type: 'lienIntra', text: 'secours', href: 'R45627', attributes: { ficheId: 'R45627' } },
          { type: 'lienIntra', href: 'R53943', attributes: { ficheId: 'R53943' } },
          { type: 'lienInterne', href: 'F1341', attributes: { ficheId: 'F1341' } },
        ],
      },
    ]);
    expect(html).toBe('<p>secours</p>');
  });
});

describe('rendu du contenu des fiches', () => {
  it('rend les en-têtes de tableau avec leur portée et les fusions', () => {
    const html = renderNodes([
      {
        type: 'tableau',
        title: 'Tarifs',
        children: [
          { type: 'rangee', children: [{ type: 'cellule', attributes: { header: 'col' } }, { type: 'cellule', attributes: { header: 'col' }, children: [{ type: 'paragraphe', text: 'Adulte' }] }] },
          {
            type: 'rangee',
            children: [
              { type: 'cellule', attributes: { header: 'row', rowspan: '2' }, children: [{ type: 'paragraphe', text: 'Secteur 1' }] },
              { type: 'cellule', attributes: { colspan: '12' }, children: [{ type: 'paragraphe', text: '25 €' }] },
            ],
          },
        ],
      },
    ]);
    // Cellule d'en-tête vide (coin du tableau) : une cellule ordinaire
    expect(html).toContain('<tr><td></td><th scope="col"><p>Adulte</p></th></tr>');
    expect(html).toContain('<th scope="row" rowspan="2"><p>Secteur 1</p></th><td colspan="12"><p>25 €</p></td>');
  });

  it("renvoie « Où s'adresser : mairie » vers la page Contact du site", () => {
    const html = renderNodes([{ type: 'ouSAdresser', title: 'Mairie', attributes: { pivot: 'mairie' } }]);
    expect(html).toContain('<a href="/contact">Mairie</a>');
    const external = renderNodes([{ type: 'ouSAdresser', title: 'Mairie habilitée', href: 'https://ants.gouv.fr/mairies', attributes: { pivot: 'mairie' } }]);
    expect(external).toContain('href="https://ants.gouv.fr/mairies"');
    expect(external).toContain('<a href="/contact">contacter la mairie</a>');
  });

  it('rend les services en ligne, compléments et intertitres', () => {
    expect(renderNodes([{ type: 'serviceEnLigne', title: 'Pré-demande', href: 'https://ants.gouv.fr' }])).toContain(
      '<a href="https://ants.gouv.fr" target="_blank" rel="noopener noreferrer">Pré-demande<span class="cn-sr-only"> (nouvelle fenêtre)</span></a>',
    );
    expect(renderNodes([{ type: 'serviceEnLigne', title: 'Piège', href: 'javascript:alert(1)' }])).toBe('');
    expect(renderNodes([{ type: 'complement', title: 'Valeurs', children: [{ type: 'paragraphe', text: '20 mSv' }] }])).toBe(
      '<details class="cn-demarche-complement"><summary>Valeurs</summary><p>20 mSv</p></details>',
    );
    expect(renderNodes([{ type: 'titreFlottant', text: 'Formation <b>' }])).toBe('<p class="cn-demarche-subtitle"><strong>Formation &lt;b&gt;</strong></p>');
  });
});

const entry = (id: string, title: string, context = '', description = '', kind = "Fiche d'information conditionnée"): DemarcheIndexEntry => ({
  id,
  title,
  description,
  context,
  kind,
});

describe('recherche dans toutes les démarches', () => {
  const index = new DemarcheSearchIndex([
    entry('N358', "Carte d'identité", 'Papiers - Citoyenneté - Élections', '', 'Dossier'),
    entry('F1341', "Carte d'identité d'un majeur : première demande", "Carte d'identité", 'Il faut se rendre dans une mairie équipée.'),
    entry('F1887', "Comment remplacer une carte d'identité abîmée ?", "Carte d'identité", '', 'Fiche Question-réponse conditionnée'),
    entry('F14929', "Passeport d'un majeur : première demande", 'Passeport'),
    entry('F1986', 'Permis de construire (PC)', "Autorisations d'urbanisme", 'Autorisation pour une construction nouvelle.'),
    entry('F10613', 'Ajouter une personne sur sa carte grise', 'Carte grise (certificat d’immatriculation)'),
  ]);
  const ids = (query: string) => index.search(query).results.map((result) => result.id);

  it('ignore les accents, la casse et les mots vides', () => {
    expect(searchTerms("Comment faire une CARTE d'IDENTITÉ ?")).toEqual(['carte', 'identite']);
    expect(ids('carte identite')[0]).toBe('N358');
  });

  it('trouve un mot commencé et un pluriel', () => {
    expect(ids('passe')).toEqual(['F14929']);
    expect(ids('cartes grises')).toEqual(['F10613']);
  });

  it('cherche aussi dans la description et la rubrique', () => {
    expect(ids('mairie équipée')).toEqual(['F1341']);
    expect(ids('urbanisme')).toEqual(['F1986']);
  });

  it('exige tous les mots, puis se replie sur les fiches qui en ont le plus', () => {
    expect(ids('carte majeur')).toEqual(['F1341']);
    const fallback = index.search('passeport perdu');
    expect(fallback.results.map((result) => result.id)).toEqual(['F14929']);
  });

  it('compte tous les résultats et limite ceux renvoyés', () => {
    const { total, results } = index.search('carte', 2);
    expect(total).toBe(4);
    expect(results).toHaveLength(2);
  });

  it("ne renvoie rien sans terme", () => {
    expect(index.search('  ').total).toBe(0);
  });

  it("lit la réponse de l'API", () => {
    const vm = mapDemarcheSearch({ data: [{ id: 'F1', title: 'Titre', kind: 'Dossier' }, { title: 'sans id' }], meta: { total: 12 } }, 'particuliers', 'x');
    expect(vm.total).toBe(12);
    expect(vm.results).toEqual([{ id: 'F1', title: 'Titre', description: '', context: '', kind: 'Dossier' }]);
  });
});

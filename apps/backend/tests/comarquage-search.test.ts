/**
 * Recherche dans les démarches : l'index est tiré des fiches XML de la DILA, et un dossier sans
 * sous-dossier garde la liste de ses fiches.
 */
import { describe, expect, it } from 'vitest'
import { indexEntry } from '../src/services/comarquage'
import normalizer from '../src/services/dila-normalizer'

const publication = (attributes: string, body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><Publication xmlns:dc="http://purl.org/dc/elements/1.1/" ${attributes}>${body}</Publication>`

const FICHE = publication(
  'ID="F17578" type="Fiche d\'information conditionnée"',
  '<dc:title>Déclaration préalable (DP) &amp; travaux</dc:title>' +
    '<dc:description>Autorisation pour des travaux de <MiseEnEvidence>faible</MiseEnEvidence> importance.</dc:description>' +
    '<Theme ID="N19808"><Titre>Logement</Titre></Theme>' +
    '<DossierPere ID="N319"><Titre>Autorisations d\'urbanisme</Titre>' +
    '<Fiche ID="F1633">Certificat d\'urbanisme (CU)</Fiche><Fiche ID="F17578">Déclaration préalable (DP)</Fiche></DossierPere>',
)

describe("index de recherche des démarches", () => {
  it('garde titre, description et dossier, sans balises ni entités', () => {
    expect(indexEntry(FICHE)).toEqual({
      id: 'F17578',
      title: 'Déclaration préalable (DP) & travaux',
      description: 'Autorisation pour des travaux de faible importance.',
      context: "Autorisations d'urbanisme",
      kind: "Fiche d'information conditionnée",
    })
  })

  it('situe un dossier par son thème', () => {
    const folder = publication('ID="N319" type="Dossier"', "<dc:title>Autorisations d'urbanisme</dc:title><Theme ID=\"N19808\"><Titre>Logement</Titre></Theme>")
    expect(indexEntry(folder)?.context).toBe('Logement')
  })

  it('écarte les thèmes, les questionnaires et les ressources', () => {
    expect(indexEntry(publication('ID="N19808" type="Theme"', '<dc:title>Logement</dc:title>'))).toBeNull()
    expect(indexEntry(publication('ID="F35154" type="Recherche guidée"', '<dc:title>Passeport</dc:title>'))).toBeNull()
    expect(indexEntry(publication('ID="R1234" type="Formulaire"', '<dc:title>Cerfa</dc:title>'))).toBeNull()
  })
})

describe('dossier de la fiche', () => {
  it('garde les fiches placées directement dans le dossier', () => {
    const fiche = normalizer.parseFiche(FICHE, 'F17578', 'particuliers')
    expect(fiche?.dossierPere?.id).toBe('N319')
    expect(fiche?.dossierPere?.sousDossiers[0]?.fiches.map((item) => item.id)).toEqual(['F1633', 'F17578'])
  })
})

describe('contenu des fiches', () => {
  const fiche = (body: string) =>
    normalizer.parseFiche(publication('ID="F1" type="Fiche d\'information conditionnée"', `<dc:title>Fiche</dc:title>${body}`), 'F1', 'particuliers')!
  const types = (nodes: any[] | undefined): string[] => (nodes ?? []).flatMap((node) => [node.type, ...types(node.children)])

  it('lit tous les blocs Texte et les situations placées à côté', () => {
    const { content } = fiche(
      '<Texte><Paragraphe>Premier</Paragraphe></Texte><Texte><Paragraphe>Second</Paragraphe></Texte>' +
        '<ListeSituations><Situation><Titre>Vous êtes majeur</Titre><Texte><Chapitre><Titre>Où faire la demande ?</Titre>' +
        '<Paragraphe>En mairie.</Paragraphe></Chapitre></Texte></Situation></ListeSituations>',
    )
    expect(content.map((node) => node.type)).toEqual(['paragraphe', 'paragraphe', 'listeSituations'])
    expect(types(content)).toContain('chapitre')
  })

  it("garde l'introduction d'un cas, les services en ligne et le lieu où s'adresser", () => {
    const { content } = fiche(
      '<Texte><BlocCas><Cas><Titre>En France</Titre><Introduction><Texte><Paragraphe>Intro du cas</Paragraphe></Texte></Introduction>' +
        '<ServiceEnLigne ID="R1" URL="https://ants.gouv.fr/rdv" type="Téléservice"><Titre>Prendre rendez-vous</Titre></ServiceEnLigne>' +
        '<OuSAdresser ID="R2" type="Local"><Titre>Mairie</Titre><PivotLocal>mairie</PivotLocal></OuSAdresser></Cas></BlocCas></Texte>',
    )
    const cas = content[0]!.children![0]!
    expect(cas.children!.map((node) => node.type)).toEqual(['paragraphe', 'serviceEnLigne', 'ouSAdresser'])
    expect(cas.children![1]).toMatchObject({ title: 'Prendre rendez-vous', href: 'https://ants.gouv.fr/rdv' })
    expect(cas.children![2]!.attributes).toEqual({ pivot: 'mairie' })
  })

  it('garde les compléments et les liens commentés', () => {
    const { content } = fiche(
      '<Texte><Complement><Titre>Valeurs limites</Titre><Paragraphe>20 mSv</Paragraphe></Complement>' +
        '<LienExterneCommente><Commentaire><Paragraphe>Le tribunal de police juge les contraventions.</Paragraphe></Commentaire>' +
        '<LienExterne URL="https://www.justice.gouv.fr">Tribunaux</LienExterne></LienExterneCommente></Texte>',
    )
    expect(content.map((node) => node.type)).toEqual(['complement', 'paragraphe', 'paragraphe'])
    expect(content[0]!.title).toBe('Valeurs limites')
    expect(content[2]!.children![0]).toMatchObject({ type: 'lienExterne', href: 'https://www.justice.gouv.fr' })
  })

  it('lit les tableaux : en-têtes de colonnes et de lignes, cellules fusionnées', () => {
    const { content } = fiche(
      '<Texte><Tableau><Titre>Tarifs</Titre><Colonne largeur="40" type="header"/><Colonne largeur="40" type="normal"/><Colonne largeur="40" type="normal"/>' +
        '<Rangée type="header"><Cellule/><Cellule><Paragraphe>Adulte</Paragraphe></Cellule><Cellule><Paragraphe>Enfant</Paragraphe></Cellule></Rangée>' +
        '<Rangée type="normal"><Cellule fusionVerticale="2"><Paragraphe>Secteur 1</Paragraphe></Cellule><Cellule><Paragraphe>25 €</Paragraphe></Cellule><Cellule><Paragraphe>20 €</Paragraphe></Cellule></Rangée>' +
        '<Rangée type="normal"><Cellule fusionHorizontale="2"><Paragraphe>Gratuit</Paragraphe></Cellule></Rangée></Tableau></Texte>',
    )
    const [header, first, second] = content[0]!.children!
    expect(header!.children!.map((cell) => cell.attributes?.header)).toEqual(['col', 'col', 'col'])
    expect(first!.children!.map((cell) => cell.attributes)).toEqual([{ header: 'row', rowspan: '2' }, undefined, undefined])
    // La 1re colonne est occupée par la fusion : « Gratuit » commence à la 2e, ce n'est pas un en-tête
    expect(second!.children![0]!.attributes).toEqual({ colspan: '2' })
  })
})

describe('texte en ligne', () => {
  it('garde les espaces entre deux mises en évidence', () => {
    const fiche = normalizer.parseFiche(
      publication('ID="F1" type="Fiche"', '<dc:title>F</dc:title><Texte><Paragraphe>Il faut les <MiseEnEvidence>documents </MiseEnEvidence><MiseEnEvidence>originaux</MiseEnEvidence>.</Paragraphe></Texte>'),
      'F1',
      'particuliers',
    )!
    const text = fiche.content[0]!.children!.map((node) => node.text).join('')
    expect(text).toBe('Il faut les documents originaux.')
  })
})

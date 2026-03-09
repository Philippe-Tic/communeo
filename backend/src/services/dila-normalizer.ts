/**
 * DILA XML Normalizer — Parse les fiches XML service-public.gouv.fr en JSON typé
 */

import { XMLParser } from 'fast-xml-parser'
import type {
  DilaAudience,
  DilaContentNode,
  DilaDefinition,
  DilaExternalRef,
  DilaFiche,
  DilaMenuNode,
  DilaRef,
  DilaReferenceSection,
  DilaServiceEnLigne,
  DilaServiceInfo,
} from '../types/comarquage'

// Éléments qui peuvent apparaître plusieurs fois et doivent être forcés en tableau
const ARRAY_ELEMENTS = [
  'Chapitre', 'SousChapitre', 'Paragraphe', 'Item', 'Rangee', 'Colonne',
  'Cas', 'Situation', 'OuSAdresser', 'ServiceEnLigne', 'Reference',
  'VoirAussi', 'QuestionReponse', 'PourEnSavoirPlus', 'Definition',
  'SousDossier', 'Fiche', 'FilDAriane', 'Niveau',
  'BlocCas', 'ANoter', 'Attention', 'ASavoir', 'Exemple', 'Rappel',
  'Liste', 'Tableau', 'Image', 'Video',
  'FragmentConditionne', 'Condition',
  'ItemMenu',
]

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ARRAY_ELEMENTS.includes(name),
  trimValues: true,
  // Preserve text content when mixed with child elements
  textNodeName: '#text',
})

class DilaNormalizer {
  /**
   * Parse une fiche XML en DilaFiche
   */
  parseFiche(xml: string, fileId: string, audience: DilaAudience): DilaFiche | null {
    const parsed = parser.parse(xml)

    const publication = parsed.Publication || parsed.ServiceComplementaire
    if (!publication) return null

    const type = publication['@_type'] || publication['@_xsi:type'] || 'unknown'
    const title = this.textOf(publication.dc?.title) || this.textOf(publication['dc:title']) || this.textOf(publication.Titre) || ''
    const description = this.textOf(publication.dc?.description) || this.textOf(publication['dc:description']) || ''
    const dateModification = publication['@_dateModification'] || publication.dc?.date || ''

    // Thème et sous-thème
    const theme = this.parseRef(publication.Theme)
    const sousTheme = this.parseRef(publication.SousTheme)

    // Fil d'Ariane
    const filDAriane = this.parseFilDAriane(publication.FilDAriane)

    // Dossier père
    let dossierPere = this.parseDossierPere(publication.DossierPere)

    // Pour les Dossiers sans DossierPere, construire la structure depuis les SousDossier directs
    if (!dossierPere && (type === 'Dossier' || type === 'Dossier/Sous-dossier')) {
      const sousDossiers = this.ensureArray(publication.SousDossier || []).map((sd: any) => ({
        id: sd['@_ID'] || '',
        title: this.textOf(sd.Titre) || '',
        fiches: this.ensureArray(sd.Fiche || []).map((f: any) => ({
          id: f['@_ID'] || f['@_LienPublication'] || '',
          title: this.textOf(f.Titre) || this.textOf(f) || '',
        })),
      }))
      if (sousDossiers.length > 0) {
        dossierPere = { id: fileId, title, sousDossiers }
      }
    }

    // Avertissement
    const avertissement = publication.Avertissement
      ? this.parseCallout(publication.Avertissement, 'attention')
      : null

    // Introduction
    const introduction = publication.Introduction
      ? this.parseContentNodes(publication.Introduction)
      : []

    // Contenu principal — peut être dans Texte, Corps, ou directement sous Publication
    const contentSource = publication.Texte || publication.Corps || publication
    const content = this.parseContentNodes(contentSource)

    // Sections de référence
    const references = this.parseReferenceSection(publication)

    return {
      id: fileId,
      type,
      audience,
      title,
      description,
      dateModification,
      theme,
      sousTheme,
      filDAriane,
      dossierPere,
      avertissement,
      introduction,
      content,
      references,
    }
  }

  /**
   * Parse menu.xml en arbre de navigation
   */
  parseMenu(xml: string): DilaMenuNode[] {
    const parsed = parser.parse(xml)
    const menu = parsed.Menu || parsed.Arborescence
    if (!menu) return []

    // Le format réel utilise <ItemMenu type="Theme|Sous-theme|Dossier">
    const items = this.ensureArray(menu.ItemMenu || menu.Theme || menu.Noeud || [])
    return items.map((t: any) => this.parseMenuNode(t, this.menuNodeType(t)))
  }

  // ─── Contenu récursif ────────────────────────────────────────────

  private parseContentNodes(element: any): DilaContentNode[] {
    if (!element || typeof element === 'string') return []

    const nodes: DilaContentNode[] = []
    const tagHandlers: Record<string, (items: any[]) => void> = {
      Chapitre: (items) => items.forEach(c => nodes.push(this.parseChapitre(c))),
      SousChapitre: (items) => items.forEach(c => nodes.push(this.parseSousChapitre(c))),
      Paragraphe: (items) => items.forEach(p => nodes.push(this.parseParagraphe(p))),
      Liste: (items) => items.forEach(l => nodes.push(this.parseListe(l))),
      Tableau: (items) => items.forEach(t => nodes.push(this.parseTableau(t))),
      BlocCas: (items) => items.forEach(b => nodes.push(this.parseBlocCas(b))),
      ANoter: (items) => items.forEach(a => nodes.push(this.parseCallout(a, 'aNoter'))),
      Attention: (items) => items.forEach(a => nodes.push(this.parseCallout(a, 'attention'))),
      ASavoir: (items) => items.forEach(a => nodes.push(this.parseCallout(a, 'aSavoir'))),
      Exemple: (items) => items.forEach(e => nodes.push(this.parseCallout(e, 'exemple'))),
      Rappel: (items) => items.forEach(r => nodes.push(this.parseCallout(r, 'rappel'))),
      ListeSituations: (items) => items.forEach(l => nodes.push(this.parseListeSituations(l))),
      FragmentConditionne: (items) => items.forEach(f => nodes.push(this.parseFragmentConditionne(f))),
      Image: (items) => items.forEach(i => nodes.push(this.parseImage(i))),
      Video: (items) => items.forEach(v => nodes.push(this.parseVideo(v))),
    }

    for (const [tag, handler] of Object.entries(tagHandlers)) {
      if (element[tag]) {
        handler(this.ensureArray(element[tag]))
      }
    }

    return nodes
  }

  private parseChapitre(obj: any): DilaContentNode {
    const title = this.textOf(obj.Titre) || ''
    const children = this.parseContentNodes(obj)
    return { type: 'chapitre', title, children }
  }

  private parseSousChapitre(obj: any): DilaContentNode {
    const title = this.textOf(obj.Titre) || ''
    const children = this.parseContentNodes(obj)
    return { type: 'chapitre', title, children }
  }

  private parseParagraphe(obj: any): DilaContentNode {
    const children = this.parseInlineContent(obj)
    // Si le paragraphe n'a que du texte simple
    if (children.length === 0) {
      const text = this.textOf(obj)
      return { type: 'paragraphe', text: text || '' }
    }
    return { type: 'paragraphe', children }
  }

  private parseListe(obj: any): DilaContentNode {
    const listeType = obj['@_type'] || 'puce'
    const items = this.ensureArray(obj.Item || [])
    const children: DilaContentNode[] = items.map((item: any) => {
      const itemChildren = this.parseContentNodes(item)
      const inlineChildren = this.parseInlineContent(item)
      const allChildren = [...itemChildren, ...inlineChildren]
      if (allChildren.length === 0) {
        return { type: 'paragraphe', text: this.textOf(item) || '' }
      }
      return { type: 'paragraphe', children: allChildren }
    })
    return { type: 'liste', attributes: { listeType }, children }
  }

  private parseTableau(obj: any): DilaContentNode {
    const titre = this.textOf(obj.Titre) || undefined
    const rangees = this.ensureArray(obj.Rangee || [])
    const children: DilaContentNode[] = rangees.map((rangee: any) => {
      const colonnes = this.ensureArray(rangee.Colonne || [])
      const cells: DilaContentNode[] = colonnes.map((col: any) => {
        const cellContent = this.parseContentNodes(col)
        const inlineContent = this.parseInlineContent(col)
        const allContent = [...cellContent, ...inlineContent]
        if (allContent.length === 0) {
          return { type: 'paragraphe', text: this.textOf(col) || '' }
        }
        return { type: 'paragraphe', children: allContent }
      })
      const isHeader = rangee['@_type'] === 'header'
      return {
        type: 'paragraphe' as const,
        children: cells,
        attributes: isHeader ? { rowType: 'header' } : undefined,
      }
    })
    return { type: 'tableau', title: titre, children }
  }

  private parseBlocCas(obj: any): DilaContentNode {
    const affichage = obj['@_affichage'] || 'onglet'
    const cas = this.ensureArray(obj.Cas || [])
    const children: DilaContentNode[] = cas.map((c: any) => ({
      type: 'situation' as const,
      title: this.textOf(c.Titre) || '',
      children: this.parseContentNodes(c),
    }))
    return { type: 'blocCas', attributes: { affichage }, children }
  }

  private parseCallout(obj: any, calloutType: string): DilaContentNode {
    const titre = this.textOf(obj.Titre) || undefined
    const children = this.parseContentNodes(obj)
    // Si pas d'enfants structurés, tenter inline
    if (children.length === 0) {
      const inline = this.parseInlineContent(obj)
      if (inline.length > 0) return { type: calloutType, title: titre, children: inline }
      const text = this.textOf(obj)
      if (text) return { type: calloutType, title: titre, text }
    }
    return { type: calloutType, title: titre, children }
  }

  private parseListeSituations(obj: any): DilaContentNode {
    const situations = this.ensureArray(obj.Situation || [])
    const children: DilaContentNode[] = situations.map((s: any) => ({
      type: 'situation' as const,
      title: this.textOf(s.Titre) || '',
      children: this.parseContentNodes(s),
    }))
    return { type: 'listeSituations', children }
  }

  private parseFragmentConditionne(obj: any): DilaContentNode {
    const children = this.parseContentNodes(obj)
    const attributes: Record<string, string> = {}
    if (obj['@_type']) attributes.conditionType = obj['@_type']
    if (obj['@_variable']) attributes.variable = obj['@_variable']
    if (obj['@_valeur']) attributes.valeur = obj['@_valeur']
    return {
      type: 'fragmentConditionne',
      children,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    }
  }

  private parseImage(obj: any): DilaContentNode {
    return {
      type: 'paragraphe',
      attributes: {
        src: obj['@_source'] || obj['@_url'] || '',
        alt: obj['@_alt'] || obj.LienWeb?.['@_URL'] || '',
      },
    }
  }

  private parseVideo(obj: any): DilaContentNode {
    return {
      type: 'paragraphe',
      attributes: {
        videoUrl: obj['@_source'] || obj['@_url'] || obj.LienWeb?.['@_URL'] || '',
        videoTitle: this.textOf(obj.Titre) || '',
      },
    }
  }

  // ─── Inline ──────────────────────────────────────────────────────

  private parseInlineContent(element: any): DilaContentNode[] {
    if (!element || typeof element === 'string') return []

    const nodes: DilaContentNode[] = []

    const inlineTags: Record<string, (item: any) => DilaContentNode> = {
      MiseEnEvidence: (m) => ({
        type: 'miseEnEvidence',
        text: this.textOf(m),
        attributes: m['@_type'] ? { miseEnEvidenceType: m['@_type'] } : undefined,
      }),
      Expression: (e) => ({ type: 'expression', text: this.textOf(e) }),
      LienExterne: (l) => ({
        type: 'lienExterne',
        text: this.textOf(l),
        href: l['@_URL'] || '',
      }),
      LienInterne: (l) => ({
        type: 'lienInterne',
        text: this.textOf(l),
        attributes: { ficheId: l['@_LienPublication'] || '' },
      }),
      LienIntra: (l) => ({
        type: 'lienIntra',
        text: this.textOf(l),
        attributes: { ficheId: l['@_LienID'] || l['@_LienPublication'] || '' },
      }),
      Valeur: (v) => ({ type: 'valeur', text: this.textOf(v) }),
      Exposant: (e) => ({ type: 'exposant', text: this.textOf(e) }),
      Tel: (t) => ({ type: 'expression', text: this.textOf(t) }),
    }

    for (const [tag, handler] of Object.entries(inlineTags)) {
      const items = element[tag]
      if (items == null) continue
      const arr = Array.isArray(items) ? items : [items]
      for (const item of arr) {
        nodes.push(handler(item))
      }
    }

    return nodes
  }

  // ─── Références ──────────────────────────────────────────────────

  private parseReferenceSection(publication: any): DilaReferenceSection {
    return {
      ouSAdresser: this.ensureArray(publication.OuSAdresser || []).map((o: any) => this.parseServiceInfo(o)),
      servicesEnLigne: this.ensureArray(publication.ServiceEnLigne || []).map((s: any) => this.parseServiceEnLigne(s)),
      references: this.ensureArray(publication.Reference || []).map((r: any) => this.parseExternalRef(r)),
      voirAussi: this.ensureArray(publication.VoirAussi || []).map((v: any) => this.parseRef(v)).filter(Boolean) as DilaRef[],
      definitions: this.ensureArray(publication.Definition || []).map((d: any) => this.parseDefinition(d)),
      questionsReponses: this.ensureArray(publication.QuestionReponse || []).map((q: any) => this.parseRef(q)).filter(Boolean) as DilaRef[],
      pourEnSavoirPlus: this.ensureArray(publication.PourEnSavoirPlus || []).map((p: any) => this.parseExternalRef(p)),
    }
  }

  private parseServiceInfo(obj: any): DilaServiceInfo {
    return {
      id: obj['@_ID'] || '',
      title: this.textOf(obj.Titre) || this.textOf(obj) || '',
      type: obj['@_type'] || '',
      pivotLocal: obj['@_pivotLocal'] || undefined,
      url: obj.RessourceWeb?.['@_URL'] || obj['@_URL'] || undefined,
      texte: obj.Texte ? this.parseContentNodes(obj.Texte) : undefined,
    }
  }

  private parseServiceEnLigne(obj: any): DilaServiceEnLigne {
    return {
      id: obj['@_ID'] || '',
      title: this.textOf(obj.Titre) || this.textOf(obj) || '',
      url: obj['@_URL'] || '',
      type: obj['@_type'] || '',
      numeroCerfa: obj.NumeroCerfa || obj['@_numeroCerfa'] || undefined,
    }
  }

  private parseExternalRef(obj: any): DilaExternalRef {
    return {
      id: obj['@_ID'] || '',
      title: this.textOf(obj.Titre) || this.textOf(obj) || '',
      url: obj['@_URL'] || '',
      source: obj['@_source'] || undefined,
    }
  }

  private parseDefinition(obj: any): DilaDefinition {
    return {
      id: obj['@_ID'] || '',
      term: this.textOf(obj.Terme) || '',
      texte: obj.Texte ? this.parseContentNodes(obj.Texte) : [],
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────

  private parseMenuNode(obj: any, type: 'theme' | 'sousTheme' | 'dossier'): DilaMenuNode {
    const id = obj['@_ID'] || ''
    const title = this.textOf(obj.Titre) || this.textOf(obj.Nom) || ''
    const children: DilaMenuNode[] = []

    // Enfants via <ItemMenu> (format réel) ou ancien format
    const childItems = this.ensureArray(obj.ItemMenu || [])
    for (const child of childItems) {
      children.push(this.parseMenuNode(child, this.menuNodeType(child)))
    }

    // Fallback ancien format
    const sousThemes = this.ensureArray(obj.SousTheme || obj.Noeud || [])
    for (const st of sousThemes) {
      children.push(this.parseMenuNode(st, 'sousTheme'))
    }

    const dossiers = this.ensureArray(obj.Dossier || [])
    for (const d of dossiers) {
      children.push(this.parseMenuNode(d, 'dossier'))
    }

    return { id, title, type, children }
  }

  private menuNodeType(obj: any): 'theme' | 'sousTheme' | 'dossier' {
    const type = obj['@_type'] || ''
    if (type === 'Theme') return 'theme'
    if (type === 'Sous-theme') return 'sousTheme'
    return 'dossier'
  }

  // ─── Utilitaires ─────────────────────────────────────────────────

  private parseRef(obj: any): DilaRef | null {
    if (!obj) return null
    return {
      id: obj['@_ID'] || obj['@_LienPublication'] || '',
      title: this.textOf(obj.Titre) || this.textOf(obj) || '',
    }
  }

  private parseFilDAriane(obj: any): DilaRef[] {
    if (!obj) return []
    const niveaux = this.ensureArray(obj.Niveau || [])
    return niveaux
      .map((n: any) => this.parseRef(n))
      .filter(Boolean) as DilaRef[]
  }

  private parseDossierPere(obj: any): DilaFiche['dossierPere'] {
    if (!obj) return null
    const sousDossiers = this.ensureArray(obj.SousDossier || []).map((sd: any) => ({
      id: sd['@_ID'] || '',
      title: this.textOf(sd.Titre) || '',
      fiches: this.ensureArray(sd.Fiche || []).map((f: any) => ({
        id: f['@_ID'] || f['@_LienPublication'] || '',
        title: this.textOf(f.Titre) || this.textOf(f) || '',
      })),
    }))
    return {
      id: obj['@_ID'] || '',
      title: this.textOf(obj.Titre) || '',
      sousDossiers,
    }
  }

  /**
   * Extrait le texte d'un élément (gère string, objet avec #text, etc.)
   */
  private textOf(element: any): string {
    if (element == null) return ''
    if (typeof element === 'string') return element.trim()
    if (typeof element === 'number') return String(element)
    if (element['#text'] != null) return String(element['#text']).trim()
    return ''
  }

  private ensureArray<T>(val: T | T[]): T[] {
    if (val == null) return []
    return Array.isArray(val) ? val : [val]
  }
}

export default new DilaNormalizer()

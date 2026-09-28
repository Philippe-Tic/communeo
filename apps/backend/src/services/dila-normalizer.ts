/**
 * DILA XML Normalizer — Parse les fiches XML service-public.gouv.fr en JSON typé
 *
 * Uses fast-xml-parser with preserveOrder: true to correctly handle mixed content
 * (text interleaved with inline elements like <MiseEnEvidence>, <LienInterne>, etc.)
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

// ─── preserveOrder helpers ──────────────────────────────────────────
// With preserveOrder the parser outputs ordered arrays of { tag: children[], ':@': attrs }

/** Find first child node matching a tag */
function findChild(children: any[], tag: string): any | undefined {
  if (!Array.isArray(children)) return undefined
  for (const item of children) {
    if (item[tag] !== undefined) return item
  }
  return undefined
}

/** Find all child nodes matching a tag */
function findChildren(children: any[], tag: string): any[] {
  if (!Array.isArray(children)) return []
  return children.filter(item => item[tag] !== undefined)
}

/** Read attributes from a node (':@' key) */
function getAttrs(node: any): Record<string, string> {
  return node?.[':@'] || {}
}

/** Read a single attribute */
function getAttr(node: any, attr: string): string {
  return node?.[':@']?.[attr] || ''
}

/** Recursively extract all text from a children array (whitespace-normalised) */
function getAllText(children: any[]): string {
  if (!Array.isArray(children)) return ''
  const parts: string[] = []
  for (const item of children) {
    if (item['#text'] !== undefined) {
      parts.push(String(item['#text']))
    } else {
      const tag = Object.keys(item).find(k => k !== ':@')
      if (tag && Array.isArray(item[tag])) {
        parts.push(getAllText(item[tag]))
      }
    }
  }
  return parts.join('').replace(/\s+/g, ' ').trim()
}

/** Texte d'une balise en ligne : les espaces de bord comptent (« <MiseEnEvidence>documents </MiseEnEvidence>originaux ») */
function inlineText(children: any[]): string {
  const text = getAllText(children)
  if (!text) return ''
  const raw = Array.isArray(children) ? children.map((item: any) => (item['#text'] !== undefined ? String(item['#text']) : 'x')).join('') : ''
  return `${/^\s/.test(raw) ? ' ' : ''}${text}${/\s$/.test(raw) ? ' ' : ''}`
}

/** Enfants dans l'ordre du document, chaque Texte (ou Corps) remplacé par son contenu */
function unwrapText(children: any[]): any[] {
  return (Array.isArray(children) ? children : []).flatMap((item: any) => (item.Texte ? item.Texte : item.Corps ? item.Corps : [item]))
}

/** Shortcut: get text of the first child with the given tag */
function childText(children: any[], tag: string): string {
  const child = findChild(children, tag)
  if (!child) return ''
  return getAllText(child[tag])
}

// ─── Inline tags ────────────────────────────────────────────────────

const INLINE_TAGS = new Set([
  'MiseEnEvidence', 'Expression', 'LienExterne', 'LienInterne',
  'LienIntra', 'Valeur', 'Exposant', 'Tel',
])

// ─── Parser ─────────────────────────────────────────────────────────

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  trimValues: false,
  textNodeName: '#text',
})

// ─── Normalizer ─────────────────────────────────────────────────────

class DilaNormalizer {
  /**
   * Parse une fiche XML en DilaFiche
   */
  parseFiche(xml: string, fileId: string, audience: DilaAudience): DilaFiche | null {
    const parsed = parser.parse(xml)

    const pubNode = findChild(parsed, 'Publication') || findChild(parsed, 'ServiceComplementaire')
    if (!pubNode) return null
    const pubTag = pubNode.Publication ? 'Publication' : 'ServiceComplementaire'
    const pubChildren: any[] = pubNode[pubTag]
    const pubAttrs = getAttrs(pubNode)

    const type = pubAttrs['@_type'] || pubAttrs['@_xsi:type'] || 'unknown'
    const title = childText(pubChildren, 'dc:title') || childText(pubChildren, 'Titre') || ''
    const description = childText(pubChildren, 'dc:description') || ''

    // Fix 1: date — handle "modified 2026-03-06" format in dc:date
    const rawDate = pubAttrs['@_dateModification'] || childText(pubChildren, 'dc:date') || ''
    const dateModification = rawDate
      ? (rawDate.match(/\d{4}-\d{2}-\d{2}/)?.[0] || rawDate)
      : ''

    // Thème et sous-thème
    const themeNode = findChild(pubChildren, 'Theme')
    const theme = themeNode ? this.parseRef(themeNode) : null
    const sousThemeNode = findChild(pubChildren, 'SousTheme')
    const sousTheme = sousThemeNode ? this.parseRef(sousThemeNode) : null

    // Fil d'Ariane
    const filDAriane = this.parseFilDAriane(pubChildren)

    // Dossier père
    let dossierPere = this.parseDossierPere(pubChildren)

    // Pour les Dossiers sans DossierPere, construire depuis SousDossier ou Fiche directs
    if (!dossierPere && (type === 'Dossier' || type === 'Dossier/Sous-dossier')) {
      const sousDossierNodes = findChildren(pubChildren, 'SousDossier')
      if (sousDossierNodes.length > 0) {
        const sousDossiers = sousDossierNodes.map((sdNode: any) => {
          const sdChildren = sdNode.SousDossier
          const sdAttrs = getAttrs(sdNode)
          return {
            id: sdAttrs['@_ID'] || '',
            title: childText(sdChildren, 'Titre') || '',
            fiches: findChildren(sdChildren, 'Fiche').map((fNode: any) => ({
              id: getAttr(fNode, '@_ID') || getAttr(fNode, '@_LienPublication') || getAllText(fNode.Fiche) || '',
              title: childText(fNode.Fiche, 'Titre') || getAllText(fNode.Fiche) || '',
            })),
          }
        })
        dossierPere = { id: fileId, title, sousDossiers }
      }

      // Fix 2: Fiches directement sous Publication (ex: N435)
      if (!dossierPere) {
        const fichesDirectes = findChildren(pubChildren, 'Fiche')
        if (fichesDirectes.length > 0) {
          dossierPere = {
            id: fileId,
            title,
            sousDossiers: [{
              id: `${fileId}-1`,
              title,
              fiches: fichesDirectes.map((fNode: any) => ({
                id: getAttr(fNode, '@_ID') || getAttr(fNode, '@_LienPublication') || getAllText(fNode.Fiche) || '',
                title: childText(fNode.Fiche, 'Titre') || getAllText(fNode.Fiche) || '',
              })),
            }],
          }
        }
      }
    }

    // Avertissement
    const avertNode = findChild(pubChildren, 'Avertissement')
    const avertissement = avertNode
      ? this.parseCallout(avertNode.Avertissement, 'attention')
      : null

    // Introduction
    const introNode = findChild(pubChildren, 'Introduction')
    const introduction = introNode ? this.parseContentNodes(introNode.Introduction) : []

    // Contenu principal, dans l'ordre du document : un ou plusieurs Texte (ou Corps), et des blocs
    // placés directement sous Publication (ListeSituations, ASavoir…). Ne lire que le premier Texte
    // perdait l'essentiel des fiches conditionnées (une situation par public).
    const content = this.parseContentNodes(unwrapText(pubChildren))

    // Sections de référence
    const references = this.parseReferenceSection(pubChildren)

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
    const menuNode = findChild(parsed, 'Menu') || findChild(parsed, 'Arborescence')
    if (!menuNode) return []
    const tag = menuNode.Menu ? 'Menu' : 'Arborescence'
    const menuChildren = menuNode[tag]

    const items = [
      ...findChildren(menuChildren, 'ItemMenu'),
      ...findChildren(menuChildren, 'Theme'),
      ...findChildren(menuChildren, 'Noeud'),
    ]

    return items.map(item => {
      const itemTag = Object.keys(item).find(k => k !== ':@')!
      return this.parseMenuNode(item[itemTag], getAttrs(item), this.menuNodeType(getAttrs(item)))
    })
  }

  // ─── Contenu récursif (document-order) ─────────────────────────────

  private parseContentNodes(children: any[]): DilaContentNode[] {
    if (!Array.isArray(children)) return []

    const nodes: DilaContentNode[] = []

    for (const item of children) {
      const tag = Object.keys(item).find(k => k !== ':@')
      if (!tag) continue

      const content = item[tag]
      const attrs = getAttrs(item)

      switch (tag) {
        case 'Chapitre':     nodes.push(this.parseChapitre(content)); break
        case 'SousChapitre': nodes.push(this.parseSousChapitre(content)); break
        case 'Paragraphe':   nodes.push(this.parseParagraphe(content)); break
        case 'Liste':        nodes.push(this.parseListe(content, attrs)); break
        case 'Tableau':      nodes.push(this.parseTableau(content)); break
        case 'BlocCas':      nodes.push(this.parseBlocCas(content, attrs)); break
        case 'ANoter':       nodes.push(this.parseCallout(content, 'aNoter')); break
        case 'Attention':    nodes.push(this.parseCallout(content, 'attention')); break
        case 'ASavoir':      nodes.push(this.parseCallout(content, 'aSavoir')); break
        case 'Exemple':      nodes.push(this.parseCallout(content, 'exemple')); break
        case 'Rappel':       nodes.push(this.parseCallout(content, 'rappel')); break
        case 'ListeSituations':    nodes.push(this.parseListeSituations(content)); break
        case 'FragmentConditionne': nodes.push(this.parseFragmentConditionne(content, attrs)); break
        // Introduction d'un cas ou d'une situation : ses paragraphes, dans le fil du texte
        case 'Introduction': nodes.push(...this.parseContentNodes(unwrapText(content))); break
        case 'TitreFlottant': nodes.push({ type: 'titreFlottant', text: getAllText(content) }); break
        // Complément repliable (« Connaître les valeurs limites… ») : titre et contenu
        case 'Complement': {
          const body = this.parseContentNodes(unwrapText(content))
          if (body.length) nodes.push({ type: 'complement', title: childText(content, 'Titre') || undefined, children: body })
          break
        }
        // Lien commenté : le commentaire, puis le lien
        case 'LienExterneCommente': {
          const comment = findChild(content, 'Commentaire')
          if (comment) nodes.push(...this.parseContentNodes(unwrapText(comment.Commentaire)))
          const link = findChild(content, 'LienExterne')
          if (link) nodes.push({ type: 'paragraphe', children: [this.parseInlineTag('LienExterne', link.LienExterne, getAttrs(link))] })
          break
        }
        case 'ServiceEnLigne': {
          const service = this.parseServiceEnLigne(content, attrs)
          if (service.url) {
            nodes.push({ type: 'serviceEnLigne', title: service.title, href: service.url, attributes: { serviceType: service.type } })
          }
          break
        }
        case 'OuSAdresser': {
          const place = this.parseServiceInfo(content, attrs)
          const attributes: Record<string, string> = {}
          if (place.pivotLocal) attributes.pivot = place.pivotLocal
          nodes.push({ type: 'ouSAdresser', title: place.title, href: place.url, children: place.texte ?? [], attributes })
          break
        }
        case 'Image':        nodes.push(this.parseImage(content, attrs)); break
        case 'Video':        nodes.push(this.parseVideo(content, attrs)); break
      }
    }

    return nodes
  }

  private parseChapitre(children: any[]): DilaContentNode {
    const title = childText(children, 'Titre')
    return { type: 'chapitre', title, children: this.parseContentNodes(children) }
  }

  private parseSousChapitre(children: any[]): DilaContentNode {
    const title = childText(children, 'Titre')
    return { type: 'chapitre', title, children: this.parseContentNodes(children) }
  }

  /**
   * FIX 3 — Parse un paragraphe en préservant le contenu mixte (texte + inline)
   *
   * Avant: fast-xml-parser sans preserveOrder perdait les text nodes intercalés.
   * Maintenant: on itère les enfants en ordre, créant des nodes 'texte' et inline alternés.
   */
  private parseParagraphe(children: any[]): DilaContentNode {
    if (!Array.isArray(children)) return { type: 'paragraphe', text: '' }

    const nodes: DilaContentNode[] = []

    for (const item of children) {
      const tag = Object.keys(item).find(k => k !== ':@')
      if (!tag) continue

      if (tag === '#text') {
        const raw = String(item['#text'])
        if (!raw.trim()) continue
        // Normalise internal whitespace but keep leading/trailing for inline spacing
        const text = raw.replace(/\s+/g, ' ')
        nodes.push({ type: 'texte', text })
      } else if (INLINE_TAGS.has(tag)) {
        nodes.push(this.parseInlineTag(tag, item[tag], getAttrs(item)))
      } else {
        // Block element inside paragraph (rare) — delegate
        const blockNodes = this.parseContentNodes([item])
        nodes.push(...blockNodes)
      }
    }

    // Simple text paragraph
    if (nodes.length === 0) {
      return { type: 'paragraphe', text: getAllText(children) || '' }
    }
    if (nodes.length === 1 && nodes[0].type === 'texte') {
      return { type: 'paragraphe', text: (nodes[0].text || '').trim() }
    }
    return { type: 'paragraphe', children: nodes }
  }

  private parseInlineTag(tag: string, children: any[], attrs: Record<string, string>): DilaContentNode {
    const text = inlineText(children)
    switch (tag) {
      case 'MiseEnEvidence':
        return {
          type: 'miseEnEvidence',
          text,
          attributes: attrs['@_type'] ? { miseEnEvidenceType: attrs['@_type'] } : undefined,
        }
      case 'Expression':
        return { type: 'expression', text }
      case 'LienExterne':
        return { type: 'lienExterne', text, href: attrs['@_URL'] || '' }
      case 'LienInterne':
        return {
          type: 'lienInterne',
          text,
          href: attrs['@_LienPublication'] || '',
          attributes: { ficheId: attrs['@_LienPublication'] || '' },
        }
      case 'LienIntra':
        return {
          type: 'lienIntra',
          text,
          href: attrs['@_LienID'] || attrs['@_LienPublication'] || '',
          attributes: { ficheId: attrs['@_LienID'] || attrs['@_LienPublication'] || '' },
        }
      case 'Valeur':
        return { type: 'valeur', text }
      case 'Exposant':
        return { type: 'exposant', text }
      case 'Tel':
        return { type: 'expression', text }
      default:
        return { type: 'texte', text }
    }
  }

  private parseListe(children: any[], attrs: Record<string, string>): DilaContentNode {
    const listeType = attrs['@_type'] || 'puce'
    const items = findChildren(children, 'Item')
    const listChildren: DilaContentNode[] = items.map((itemNode: any) => {
      const itemContent = itemNode.Item
      const blockNodes = this.parseContentNodes(itemContent)
      if (blockNodes.length > 0) {
        return { type: 'element' as const, children: blockNodes }
      }
      const para = this.parseParagraphe(itemContent)
      return { type: 'element' as const, children: [para] }
    })
    return { type: 'liste', attributes: { listeType }, children: listChildren }
  }

  /**
   * Tableau de la DILA : `Colonne` (type header : colonne d'en-têtes de ligne), `Rangée` (type header :
   * ligne d'en-têtes), `Cellule` (fusionHorizontale / fusionVerticale : nombre de colonnes / lignes).
   * Chaque cellule sait si c'est un en-tête (`header` : col ou row) et ses fusions.
   */
  private parseTableau(children: any[]): DilaContentNode {
    const titre = childText(children, 'Titre') || undefined
    const columnHeaders = findChildren(children, 'Colonne').map((node: any) => getAttr(node, '@_type') === 'header')
    const rowNodes = [...findChildren(children, 'Rangée'), ...findChildren(children, 'Rangee')]
    // Colonnes déjà occupées par une cellule fusionnée verticalement : rang restant par colonne
    const spanned: number[] = []
    const rows: DilaContentNode[] = rowNodes.map((rNode: any) => {
      const rContent = rNode['Rangée'] ?? rNode.Rangee ?? []
      const headerRow = getAttr(rNode, '@_type') === 'header'
      let column = 0
      const cells: DilaContentNode[] = findChildren(rContent, 'Cellule').map((cNode: any) => {
        while ((spanned[column] ?? 0) > 0) column += 1
        const cAttrs = getAttrs(cNode)
        const colspan = Math.max(1, parseInt(cAttrs['@_fusionHorizontale'] || '1', 10) || 1)
        const rowspan = Math.max(1, parseInt(cAttrs['@_fusionVerticale'] || '1', 10) || 1)
        const header = headerRow ? 'col' : columnHeaders[column] ? 'row' : ''
        for (let offset = 0; offset < colspan; offset += 1) spanned[column + offset] = rowspan
        column += colspan
        const cContent = cNode.Cellule ?? []
        const blockContent = this.parseContentNodes(cContent)
        const attributes: Record<string, string> = {}
        if (header) attributes.header = header
        if (colspan > 1) attributes.colspan = String(colspan)
        if (rowspan > 1) attributes.rowspan = String(rowspan)
        return {
          type: 'cellule' as const,
          children: blockContent.length > 0 ? blockContent : [this.parseParagraphe(cContent)],
          attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        }
      })
      // La ligne suivante : une ligne de moins pour chaque fusion verticale en cours
      for (let index = 0; index < spanned.length; index += 1) if (spanned[index]) spanned[index] -= 1
      return {
        type: 'rangee' as const,
        children: cells,
        attributes: headerRow ? { rowType: 'header' } : undefined,
      }
    })
    return { type: 'tableau', title: titre, children: rows }
  }

  private parseBlocCas(children: any[], attrs: Record<string, string>): DilaContentNode {
    const affichage = attrs['@_affichage'] || 'onglet'
    const casNodes = findChildren(children, 'Cas')
    const casChildren: DilaContentNode[] = casNodes.map((casNode: any) => {
      const casContent = casNode.Cas
      const title = childText(casContent, 'Titre')
      const contentChildren = unwrapText(casContent)
      return {
        type: 'situation' as const,
        title,
        children: this.parseContentNodes(contentChildren),
      }
    })
    return { type: 'blocCas', attributes: { affichage }, children: casChildren }
  }

  private parseListeSituations(children: any[]): DilaContentNode {
    const situationNodes = findChildren(children, 'Situation')
    const sitChildren: DilaContentNode[] = situationNodes.map((sitNode: any) => {
      const sitContent = sitNode.Situation
      const title = childText(sitContent, 'Titre')
      const contentChildren = unwrapText(sitContent)
      return {
        type: 'situation' as const,
        title,
        children: this.parseContentNodes(contentChildren),
      }
    })
    return { type: 'listeSituations', children: sitChildren }
  }

  private parseCallout(children: any[], calloutType: string): DilaContentNode {
    const titre = childText(children, 'Titre') || undefined
    const contentNodes = this.parseContentNodes(children)
    if (contentNodes.length === 0) {
      const para = this.parseParagraphe(children)
      if (para.text || (para.children && para.children.length > 0)) {
        return { type: calloutType, title: titre, children: [para] }
      }
    }
    return { type: calloutType, title: titre, children: contentNodes }
  }

  private parseFragmentConditionne(children: any[], attrs: Record<string, string>): DilaContentNode {
    const contentNodes = this.parseContentNodes(children)
    const attributes: Record<string, string> = {}
    if (attrs['@_type']) attributes.conditionType = attrs['@_type']
    if (attrs['@_variable']) attributes.variable = attrs['@_variable']
    if (attrs['@_valeur']) attributes.valeur = attrs['@_valeur']
    return {
      type: 'fragmentConditionne',
      children: contentNodes,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    }
  }

  private parseImage(children: any[], attrs: Record<string, string>): DilaContentNode {
    const lienWebNode = findChild(children, 'LienWeb')
    const lienWebUrl = lienWebNode ? getAttr(lienWebNode, '@_URL') : ''
    return {
      type: 'paragraphe',
      attributes: {
        src: attrs['@_source'] || attrs['@_url'] || '',
        alt: attrs['@_alt'] || lienWebUrl || '',
      },
    }
  }

  private parseVideo(children: any[], attrs: Record<string, string>): DilaContentNode {
    const lienWebNode = findChild(children, 'LienWeb')
    const lienWebUrl = lienWebNode ? getAttr(lienWebNode, '@_URL') : ''
    return {
      type: 'paragraphe',
      attributes: {
        videoUrl: attrs['@_source'] || attrs['@_url'] || lienWebUrl || '',
        videoTitle: childText(children, 'Titre') || '',
      },
    }
  }

  // ─── Références ───────────────────────────────────────────────────

  private parseReferenceSection(pubChildren: any[]): DilaReferenceSection {
    return {
      ouSAdresser: findChildren(pubChildren, 'OuSAdresser')
        .map(n => this.parseServiceInfo(n.OuSAdresser, getAttrs(n))),
      servicesEnLigne: findChildren(pubChildren, 'ServiceEnLigne')
        .map(n => this.parseServiceEnLigne(n.ServiceEnLigne, getAttrs(n))),
      references: findChildren(pubChildren, 'Reference')
        .map(n => this.parseExternalRef(n.Reference, getAttrs(n))),
      voirAussi: findChildren(pubChildren, 'VoirAussi')
        .map(n => this.parseRef(n)).filter(Boolean) as DilaRef[],
      definitions: findChildren(pubChildren, 'Definition')
        .map(n => this.parseDefinition(n.Definition, getAttrs(n))),
      questionsReponses: findChildren(pubChildren, 'QuestionReponse')
        .map(n => this.parseRef(n)).filter(Boolean) as DilaRef[],
      pourEnSavoirPlus: findChildren(pubChildren, 'PourEnSavoirPlus')
        .map(n => this.parseExternalRef(n.PourEnSavoirPlus, getAttrs(n))),
    }
  }

  private parseServiceInfo(children: any[], attrs: Record<string, string>): DilaServiceInfo {
    const resWebNode = findChild(children, 'RessourceWeb')
    const resWebAttrs = resWebNode ? getAttrs(resWebNode) : {}
    const texteNode = findChild(children, 'Texte')
    return {
      id: attrs['@_ID'] || '',
      title: childText(children, 'Titre') || getAllText(children) || '',
      type: attrs['@_type'] || '',
      pivotLocal: attrs['@_pivotLocal'] || childText(children, 'PivotLocal') || undefined,
      url: resWebAttrs['@_URL'] || attrs['@_URL'] || undefined,
      texte: texteNode ? this.parseContentNodes(texteNode.Texte) : undefined,
    }
  }

  private parseServiceEnLigne(children: any[], attrs: Record<string, string>): DilaServiceEnLigne {
    return {
      id: attrs['@_ID'] || '',
      title: childText(children, 'Titre') || getAllText(children) || '',
      url: attrs['@_URL'] || '',
      type: attrs['@_type'] || '',
      numeroCerfa: childText(children, 'NumeroCerfa') || attrs['@_numeroCerfa'] || undefined,
    }
  }

  private parseExternalRef(children: any[], attrs: Record<string, string>): DilaExternalRef {
    return {
      id: attrs['@_ID'] || '',
      title: childText(children, 'Titre') || getAllText(children) || '',
      url: attrs['@_URL'] || '',
      source: attrs['@_source'] || undefined,
    }
  }

  private parseDefinition(children: any[], attrs: Record<string, string>): DilaDefinition {
    const texteNode = findChild(children, 'Texte')
    return {
      id: attrs['@_ID'] || '',
      term: childText(children, 'Titre') || '',
      texte: texteNode ? this.parseContentNodes(texteNode.Texte) : [],
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────

  private parseMenuNode(children: any[], attrs: Record<string, string>, type: 'theme' | 'sousTheme' | 'dossier'): DilaMenuNode {
    const id = attrs['@_ID'] || ''
    const title = childText(children, 'Titre') || childText(children, 'Nom') || ''
    const menuChildren: DilaMenuNode[] = []

    for (const item of findChildren(children, 'ItemMenu')) {
      const itemAttrs = getAttrs(item)
      menuChildren.push(this.parseMenuNode(item.ItemMenu, itemAttrs, this.menuNodeType(itemAttrs)))
    }

    // Fallback ancien format
    for (const st of [...findChildren(children, 'SousTheme'), ...findChildren(children, 'Noeud')]) {
      const stTag = st.SousTheme ? 'SousTheme' : 'Noeud'
      menuChildren.push(this.parseMenuNode(st[stTag], getAttrs(st), 'sousTheme'))
    }
    for (const d of findChildren(children, 'Dossier')) {
      menuChildren.push(this.parseMenuNode(d.Dossier, getAttrs(d), 'dossier'))
    }

    return { id, title, type, children: menuChildren }
  }

  private menuNodeType(attrs: Record<string, string>): 'theme' | 'sousTheme' | 'dossier' {
    const type = attrs['@_type'] || ''
    if (type === 'Theme') return 'theme'
    if (type === 'Sous-theme') return 'sousTheme'
    return 'dossier'
  }

  // ─── Utilitaires ──────────────────────────────────────────────────

  private parseRef(node: any): DilaRef | null {
    if (!node) return null
    const tag = Object.keys(node).find(k => k !== ':@')
    if (!tag) return null
    const attrs = getAttrs(node)
    const children = node[tag]
    return {
      id: attrs['@_ID'] || attrs['@_LienPublication'] || '',
      title: childText(children, 'Titre') || getAllText(children) || '',
    }
  }

  private parseFilDAriane(pubChildren: any[]): DilaRef[] {
    const fadNode = findChild(pubChildren, 'FilDAriane')
    if (!fadNode) return []
    const niveaux = findChildren(fadNode.FilDAriane, 'Niveau')
    return niveaux
      .map((n: any) => this.parseRef(n))
      .filter(Boolean) as DilaRef[]
  }

  private parseDossierPere(pubChildren: any[]): DilaFiche['dossierPere'] {
    const dpNode = findChild(pubChildren, 'DossierPere')
    if (!dpNode) return null
    const dpChildren = dpNode.DossierPere
    const dpAttrs = getAttrs(dpNode)

    const fiche = (fNode: any) => ({
      id: getAttr(fNode, '@_ID') || getAttr(fNode, '@_LienPublication') || getAllText(fNode.Fiche) || '',
      title: childText(fNode.Fiche, 'Titre') || getAllText(fNode.Fiche) || '',
    })
    const sousDossiers = findChildren(dpChildren, 'SousDossier').map((sdNode: any) => {
      const sdChildren = sdNode.SousDossier
      const sdAttrs = getAttrs(sdNode)
      return {
        id: sdAttrs['@_ID'] || '',
        title: childText(sdChildren, 'Titre') || '',
        fiches: findChildren(sdChildren, 'Fiche').map(fiche),
      }
    })
    // Dossier sans sous-dossier : ses fiches sont directement sous DossierPere
    const direct = findChildren(dpChildren, 'Fiche').map(fiche)
    if (direct.length) sousDossiers.unshift({ id: dpAttrs['@_ID'] || '', title: '', fiches: direct })

    return {
      id: dpAttrs['@_ID'] || '',
      title: childText(dpChildren, 'Titre') || '',
      sousDossiers,
    }
  }
}

export default new DilaNormalizer()

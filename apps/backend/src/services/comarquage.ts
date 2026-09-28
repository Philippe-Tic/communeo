/**
 * Service Comarquage — Téléchargement, cache fichier et lookup des fiches DILA
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import { Open } from 'unzipper'
import type {
  CacheInfo,
  CacheMetadata,
  DilaAudience,
  FicheResult,
  MenuResult,
} from '../types/comarquage'
import { DemarcheSearchIndex, type DemarcheIndexEntry } from '@communeo/core'
import normalizer from './dila-normalizer'
import { log } from '../utils/logger';

const DILA_BASE_URL = 'https://lecomarquage.service-public.fr/vdd/3.4'
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24h

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const decodeXml = (value: string) =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] === '#') {
        const point = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return Number.isFinite(point) ? String.fromCodePoint(point) : entity
      }
      return XML_ENTITIES[code.toLowerCase()] ?? entity
    })
    .replace(/\s+/g, ' ')
    .trim()

const firstMatch = (xml: string, pattern: RegExp) => {
  const match = pattern.exec(xml)
  return match ? decodeXml(match[1]) : ''
}

/** Fiche ou dossier de l'archive → entrée de l'index de recherche (thèmes, questionnaires et ressources exclus) */
export function indexEntry(xml: string): DemarcheIndexEntry | null {
  const publication = /<Publication\b[^>]*>/.exec(xml)?.[0]
  if (!publication) return null
  const id = /\bID="([A-Z]\d+)"/.exec(publication)?.[1]
  const kind = decodeXml(/\btype="([^"]*)"/.exec(publication)?.[1] ?? '')
  // Les recherches guidées sont des questionnaires internes de service-public.fr (« [RG - …] »)
  if (!id || !/^[FN]/.test(id) || kind === 'Theme' || kind === 'Recherche guidée') return null
  const title = firstMatch(xml, /<dc:title>([\s\S]*?)<\/dc:title>/)
  if (!title) return null
  const folder = firstMatch(xml, /<DossierPere\b[^>]*>\s*<Titre>([\s\S]*?)<\/Titre>/)
  return {
    id,
    title,
    description: firstMatch(xml, /<dc:description>([\s\S]*?)<\/dc:description>/),
    context: folder && folder !== title ? folder : firstMatch(xml, /<Theme\b[^>]*>\s*<Titre>([\s\S]*?)<\/Titre>/),
    kind,
  }
}

class ComarquageService {
  private cacheDir: string
  private ttlMs: number
  private downloadInProgress: Map<DilaAudience, Promise<void>> = new Map()
  /** Index de recherche par public, reconstruit quand l'archive change */
  private searchIndexes: Map<DilaAudience, { downloadedAt: string; index: Promise<DemarcheSearchIndex> }> = new Map()

  constructor() {
    this.cacheDir = path.join(os.tmpdir(), 'communeo-comarquage')
    this.ttlMs = process.env.COMARQUAGE_TTL_MS
      ? parseInt(process.env.COMARQUAGE_TTL_MS, 10)
      : DEFAULT_TTL_MS

    // Créer les répertoires de cache
    for (const audience of ['part', 'pro'] as const) {
      const dir = path.join(this.cacheDir, audience)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }

    log.info(`🗂️ [COMARQUAGE] Cache directory: ${this.cacheDir}`)
    log.info(`🗂️ [COMARQUAGE] TTL: ${this.ttlMs / 1000}s`)
  }

  // ─── API publique ────────────────────────────────────────────────

  /**
   * Retourne une fiche parsée, déclenche refresh si cache stale
   */
  async getFiche(ficheId: string, audience: DilaAudience): Promise<FicheResult | null> {
    await this.ensureCache(audience)

    const audienceDir = this.audienceDir(audience)
    const xmlPath = path.join(audienceDir, `${ficheId}.xml`)

    if (!fs.existsSync(xmlPath)) return null

    const xml = await fs.promises.readFile(xmlPath, 'utf-8')
    const fiche = normalizer.parseFiche(xml, ficheId, audience)
    if (!fiche) return null

    const metadata = this.readMetadata(audience)
    const cacheAge = metadata ? Date.now() - new Date(metadata.downloadedAt).getTime() : 0
    const stale = cacheAge > this.ttlMs

    return { fiche, cacheAge, stale }
  }

  /**
   * Retourne l'arbre de navigation thématique
   */
  async getMenu(audience: DilaAudience): Promise<MenuResult> {
    await this.ensureCache(audience)

    const audienceDir = this.audienceDir(audience)
    // Essayer plusieurs noms possibles pour le fichier menu
    const menuNames = ['menu.xml', 'arborescence.xml']
    let xml: string | null = null

    for (const name of menuNames) {
      const menuPath = path.join(audienceDir, name)
      if (fs.existsSync(menuPath)) {
        xml = await fs.promises.readFile(menuPath, 'utf-8')
        break
      }
    }

    const themes = xml ? normalizer.parseMenu(xml) : []
    const metadata = this.readMetadata(audience)
    const cacheAge = metadata ? Date.now() - new Date(metadata.downloadedAt).getTime() : 0
    const stale = cacheAge > this.ttlMs

    return { themes, audience, cacheAge, stale }
  }

  /**
   * Recherche dans toutes les fiches et tous les dossiers d'un public, quel que soit leur rang
   */
  async search(audience: DilaAudience, query: string, limit = 20) {
    await this.ensureCache(audience)
    const index = await this.searchIndex(audience)
    return index.search(query, limit)
  }

  private async searchIndex(audience: DilaAudience): Promise<DemarcheSearchIndex> {
    const downloadedAt = this.readMetadata(audience)?.downloadedAt ?? ''
    const cached = this.searchIndexes.get(audience)
    if (cached && cached.downloadedAt === downloadedAt) return cached.index

    const index = this.buildSearchIndex(audience)
    this.searchIndexes.set(audience, { downloadedAt, index })
    // Un échec ne doit pas rester en cache
    index.catch(() => this.searchIndexes.delete(audience))
    return index
  }

  private async buildSearchIndex(audience: DilaAudience): Promise<DemarcheSearchIndex> {
    const startTime = Date.now()
    const audienceDir = this.audienceDir(audience)
    const files = (await fs.promises.readdir(audienceDir).catch(() => [] as string[])).filter((file) => /^[FN]\d+\.xml$/.test(file))
    const entries: DemarcheIndexEntry[] = []
    for (const file of files) {
      const xml = await fs.promises.readFile(path.join(audienceDir, file), 'utf-8').catch(() => '')
      const entry = xml && indexEntry(xml)
      if (entry) entries.push(entry)
    }
    log.info(`🔎 [COMARQUAGE] Search index for ${audience}: ${entries.length} entries in ${Date.now() - startTime} ms`)
    return new DemarcheSearchIndex(entries)
  }

  /**
   * Force le re-téléchargement du cache
   */
  async refreshCache(audience: DilaAudience): Promise<void> {
    await this.downloadAndExtract(audience)
  }

  /**
   * Diagnostic pour l'admin
   */
  getCacheStatus(): { particuliers: CacheInfo; professionnels: CacheInfo } {
    return {
      particuliers: this.buildCacheInfo('particuliers'),
      professionnels: this.buildCacheInfo('professionnels'),
    }
  }

  // ─── Logique de cache ────────────────────────────────────────────

  /**
   * Stale-while-revalidate : sert le cache existant, re-télécharge si stale
   */
  private async ensureCache(audience: DilaAudience): Promise<void> {
    const metadata = this.readMetadata(audience)

    // Cache frais → rien à faire
    if (metadata) {
      const age = Date.now() - new Date(metadata.downloadedAt).getTime()
      if (age < this.ttlMs) return
    }

    // Download déjà en cours → attendre
    const existing = this.downloadInProgress.get(audience)
    if (existing) {
      await existing
      return
    }

    // Pas de cache du tout → download bloquant
    if (!metadata) {
      await this.downloadAndExtract(audience)
      return
    }

    // Cache stale → refresh en arrière-plan, servir le stale
    log.info(`🔄 [COMARQUAGE] Cache stale for ${audience}, refreshing in background`)
    const bgPromise = this.downloadAndExtract(audience).catch((err) => {
      log.warn(`⚠️ [COMARQUAGE] Background refresh failed for ${audience}:`, err.message)
    })
    this.downloadInProgress.set(audience, bgPromise as Promise<void>)
    bgPromise.finally(() => this.downloadInProgress.delete(audience))
  }

  /**
   * Télécharge le ZIP DILA, extrait les fichiers et écrit les métadonnées
   */
  private async downloadAndExtract(audience: DilaAudience): Promise<void> {
    // Empêcher les téléchargements simultanés
    const existing = this.downloadInProgress.get(audience)
    if (existing) {
      await existing
      return
    }

    const promise = this.doDownloadAndExtract(audience)
    this.downloadInProgress.set(audience, promise)

    try {
      await promise
    } finally {
      this.downloadInProgress.delete(audience)
    }
  }

  private async doDownloadAndExtract(audience: DilaAudience): Promise<void> {
    const audienceSlug = audience === 'particuliers' ? 'part' : 'pro'
    const zipUrl = `${DILA_BASE_URL}/${audienceSlug}/zip/vosdroits-latest.zip`
    const zipPath = path.join(this.cacheDir, `${audienceSlug}-${Date.now()}.zip`)
    const audienceDir = this.audienceDir(audience)

    log.info(`⬇️ [COMARQUAGE] Downloading ${zipUrl}`)
    const startTime = Date.now()

    try {
      // 1. Télécharger le ZIP
      const response = await fetch(zipUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      await fs.promises.writeFile(zipPath, buffer)
      log.info(`✅ [COMARQUAGE] ZIP downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)

      // 2. Vider le répertoire audience (supprimer anciens XML)
      const existingFiles = await fs.promises.readdir(audienceDir).catch(() => [])
      for (const file of existingFiles) {
        if (file === 'metadata.json') continue
        await fs.promises.unlink(path.join(audienceDir, file)).catch(() => {})
      }

      // 3. Extraire le ZIP
      const directory = await Open.file(zipPath)
      let fileCount = 0

      for (const entry of directory.files) {
        if (entry.type === 'Directory') continue
        // Le ZIP peut contenir un dossier racine — on extrait à plat
        const fileName = path.basename(entry.path)
        if (!fileName) continue

        const content = await entry.buffer()
        await fs.promises.writeFile(path.join(audienceDir, fileName), content)
        fileCount++
      }

      // 4. Écrire les métadonnées
      const metadata: CacheMetadata = {
        downloadedAt: new Date().toISOString(),
        audience,
        fileCount,
      }
      await fs.promises.writeFile(
        path.join(audienceDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
      )

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      log.info(`✅ [COMARQUAGE] Cache refreshed for ${audience}: ${fileCount} files in ${elapsed}s`)
    } catch (error: any) {
      // Si cache stale existe, on le garde et on log un warning
      const metadata = this.readMetadata(audience)
      if (metadata) {
        log.warn(`⚠️ [COMARQUAGE] Download failed for ${audience}, serving stale cache: ${error.message}`)
      } else {
        throw new Error(`[COMARQUAGE] Download failed for ${audience} and no cache available: ${error.message}`)
      }
    } finally {
      // 5. Supprimer le ZIP temp
      if (fs.existsSync(zipPath)) {
        await fs.promises.unlink(zipPath).catch(() => {})
      }
    }
  }

  // ─── Utilitaires ─────────────────────────────────────────────────

  private audienceDir(audience: DilaAudience): string {
    const slug = audience === 'particuliers' ? 'part' : 'pro'
    return path.join(this.cacheDir, slug)
  }

  private readMetadata(audience: DilaAudience): CacheMetadata | null {
    const metaPath = path.join(this.audienceDir(audience), 'metadata.json')
    if (!fs.existsSync(metaPath)) return null
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    } catch {
      return null
    }
  }

  private buildCacheInfo(audience: DilaAudience): CacheInfo {
    const metadata = this.readMetadata(audience)
    if (!metadata) {
      return { exists: false, downloadedAt: null, fileCount: 0, stale: true, ageMs: 0 }
    }
    const ageMs = Date.now() - new Date(metadata.downloadedAt).getTime()
    return {
      exists: true,
      downloadedAt: metadata.downloadedAt,
      fileCount: metadata.fileCount,
      stale: ageMs > this.ttlMs,
      ageMs,
    }
  }
}

export default new ComarquageService()

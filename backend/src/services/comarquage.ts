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
import normalizer from './dila-normalizer'

const DILA_BASE_URL = 'https://lecomarquage.service-public.gouv.fr/vdd/3.4'
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24h

class ComarquageService {
  private cacheDir: string
  private ttlMs: number
  private downloadInProgress: Map<DilaAudience, Promise<void>> = new Map()

  constructor() {
    this.cacheDir = path.join(os.tmpdir(), 'cms-mairies-comarquage')
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

    console.log(`🗂️ [COMARQUAGE] Cache directory: ${this.cacheDir}`)
    console.log(`🗂️ [COMARQUAGE] TTL: ${this.ttlMs / 1000}s`)
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
    console.log(`🔄 [COMARQUAGE] Cache stale for ${audience}, refreshing in background`)
    const bgPromise = this.downloadAndExtract(audience).catch((err) => {
      console.warn(`⚠️ [COMARQUAGE] Background refresh failed for ${audience}:`, err.message)
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
    const zipUrl = `${DILA_BASE_URL}/vos-droits-et-demarches_${audienceSlug}.zip`
    const zipPath = path.join(this.cacheDir, `${audienceSlug}-${Date.now()}.zip`)
    const audienceDir = this.audienceDir(audience)

    console.log(`⬇️ [COMARQUAGE] Downloading ${zipUrl}`)
    const startTime = Date.now()

    try {
      // 1. Télécharger le ZIP
      const response = await fetch(zipUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      await fs.promises.writeFile(zipPath, buffer)
      console.log(`✅ [COMARQUAGE] ZIP downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)

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
      console.log(`✅ [COMARQUAGE] Cache refreshed for ${audience}: ${fileCount} files in ${elapsed}s`)
    } catch (error: any) {
      // Si cache stale existe, on le garde et on log un warning
      const metadata = this.readMetadata(audience)
      if (metadata) {
        console.warn(`⚠️ [COMARQUAGE] Download failed for ${audience}, serving stale cache: ${error.message}`)
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

/**
 * Deployment Service - Orchestration des builds et déploiements
 */

import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { promisify } from 'util';
import { getPublisher, toPublisherSite } from '../publishing';
import { log } from '../utils/logger';

const execAsync = promisify(exec);

interface BuildResult {
  success: boolean;
  buildPath?: string;
  error?: string;
  buildTime: number;
}

interface DeploymentResult {
  deployment: any;
  buildTime: number;
  success: boolean;
  error?: string;
}

class DeploymentService {
  private sitesPath: string;
  private tempDir: string;

  constructor() {
    // Site V1 (gelé) : racine du monorepo en local, volume /sites en Docker
    this.sitesPath = process.env.SITES_PATH || path.resolve(process.cwd(), '../../sites');
    // Utiliser le dossier temp système pour éviter les redémarrages Strapi
    this.tempDir = path.join(os.tmpdir(), 'communeo-builds');

    log.info('🔧 [DEPLOYMENT SERVICE] Configuration des chemins :');
    log.info(`   - Working directory: ${process.cwd()}`);
    log.info(`   - Sites path: ${this.sitesPath}`);
    log.info(`   - Temp directory: ${this.tempDir}`);
    log.info(`   - Sites directory exists: ${fs.existsSync(this.sitesPath)}`);

    // Nettoyer tous les anciens dossiers temporaires au démarrage
    this.cleanupOldTempFiles();

    // Créer le dossier temp s'il n'existe pas
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      log.info(`✅ [DEPLOYMENT SERVICE] Temp directory created: ${this.tempDir}`);
    } else {
      log.info(`✅ [DEPLOYMENT SERVICE] Temp directory exists: ${this.tempDir}`);
    }
  }

  /**
   * Déploie un site complet : build + publication chez l'hébergeur
   */
  async buildAndDeploy(siteId: string, siteSlug: string, userId?: string): Promise<DeploymentResult> {
    const startTime = Date.now();
    let tempBuildDir: string | undefined;
    let deploymentRecord: any = null;

    log.info(`🚀 [DEPLOYMENT] Starting deployment for site ${siteSlug} (ID: ${siteId})`);

    try {
      // 1. Récupérer les infos du site
      log.info(`📋 [DEPLOYMENT] Step 1: Fetching site data...`);

      const sites = await strapi.documents('api::site.site').findMany({
        filters: { documentId: siteId } as any,
        populate: {
          pages: true,
          articles: true,
          evenements: true
        }
      });

      const site = sites && sites.length > 0 ? sites[0] : null;

      if (!site) {
        log.error(`❌ [DEPLOYMENT] Site not found: ${siteId}`);
        throw new Error(`Site not found: ${siteId}`);
      }

      log.info(`✅ [DEPLOYMENT] Site found: ${(site as any).name}`);

      // 2. Créer le site chez l'hébergeur si nécessaire (avant le build : live_url sert au build)
      const publisher = getPublisher();
      const host = await publisher.ensureSite(toPublisherSite(site));
      if ((site as any).netlify_site_id !== host.hostId) {
        await strapi.documents('api::site.site').update({ documentId: site.documentId,
          data: {
            netlify_site_id: host.hostId,
            ...((site as any).custom_domain ? {} : { live_url: host.defaultUrl })
          } as any
        });
        (site as any).netlify_site_id = host.hostId;
        if (!(site as any).custom_domain) (site as any).live_url = host.defaultUrl;
        log.info(`✅ [DEPLOYMENT] Host site ready: ${host.hostId}`);
      }

      // 3. Build le site Astro
      log.info(`🏗️ [DEPLOYMENT] Step 3: Building Astro site...`);
      const customDomain = (site as any).custom_domain
        ? { domain: (site as any).custom_domain, verified: (site as any).domain_status === 'verified' }
        : undefined;
      const buildResult = await this.buildSite(siteId, (site as any).slug, (site as any).live_url, customDomain);
      if (!buildResult.success) {
        log.error(`❌ [DEPLOYMENT] Build failed: ${buildResult.error}`);
        throw new Error(buildResult.error || 'Build failed');
      }

      log.info(`✅ [DEPLOYMENT] Build successful in ${buildResult.buildTime}s`);
      tempBuildDir = buildResult.buildPath!;

      // 3b. Validation post-build : vérifier les pages critiques
      if ((site as any).comarquage_enabled) {
        const demarchesIndex = path.join(tempBuildDir, 'demarches', 'index.html');
        if (!fs.existsSync(demarchesIndex)) {
          throw new Error('Build validation failed: demarches/index.html missing but comarquage is enabled');
        }
        const size = fs.statSync(demarchesIndex).size;
        if (size < 2000) {
          throw new Error(`Build validation failed: demarches/index.html too small (${size} bytes), comarquage data likely missing`);
        }
        log.info(`✅ [DEPLOYMENT] demarches/index.html validated (${size} bytes)`);
      }

      // 4. Publier chez l'hébergeur
      log.info(`⬆️ [DEPLOYMENT] Step 4: Publishing with ${publisher.id}...`);
      const deployment = await publisher.publish(toPublisherSite(site), tempBuildDir);
      log.info(`✅ [DEPLOYMENT] Published, deployment ID: ${deployment.deployId} (${deployment.state})`);

      // 5. Créer l'entrée de déploiement en base
      log.info(`💾 [DEPLOYMENT] Step 5: Creating deployment record...`);
      try {
        // Utiliser l'ID du site pour la relation, pas le documentId
        const siteIdForRelation = (site as any).documentId;

        deploymentRecord = await strapi.documents('api::deployment.deployment').create({
          data: {
            site: siteIdForRelation,
            deployment_id: deployment.deployId,
            status: 'building',
            ...(userId ? { triggered_by: userId } : {}),
            triggered_at: new Date()
          }
        });
        log.info(`✅ [DEPLOYMENT] Deployment record created: ${deploymentRecord.id}`);
      } catch (dbError: any) {
        log.warn(`⚠️ [DEPLOYMENT] Could not create deployment record: ${dbError.message}`);
        // Ne pas faire échouer le déploiement si l'enregistrement en base échoue
      }

      const buildTime = Math.round((Date.now() - startTime) / 1000);

      // 6. Mettre à jour le statut final du déploiement (resté `building` si l'hébergeur n'a pas fini)
      if (deploymentRecord && deployment.state === 'ready') {
        try {
          await strapi.documents('api::deployment.deployment').update({ documentId: deploymentRecord.documentId,
            data: {
              status: 'ready',
              build_time: buildTime,
              completed_at: new Date()
            }
          });
          log.info(`✅ [DEPLOYMENT] Deployment status updated to ready`);
        } catch (updateError: any) {
          log.warn(`⚠️ [DEPLOYMENT] Could not update deployment status: ${updateError.message}`);
        }
      }

      log.info(`🎉 [DEPLOYMENT] Deployment initiated successfully in ${buildTime}s`);

      return {
        deployment: deploymentRecord,
        buildTime,
        success: true
      };

    } catch (error: any) {
      const buildTime = Math.round((Date.now() - startTime) / 1000);
      log.error(`💥 [DEPLOYMENT] Deployment failed for site ${siteSlug} after ${buildTime}s:`, error);

      // Mettre à jour le statut du déploiement en erreur s'il existe
      if (deploymentRecord) {
        try {
          await strapi.documents('api::deployment.deployment').update({ documentId: deploymentRecord.documentId,
            data: {
              status: 'error',
              build_time: buildTime,
              error_message: error.message,
              completed_at: new Date()
            }
          });
          log.info(`❌ [DEPLOYMENT] Deployment status updated to error`);
        } catch (updateError: any) {
          log.warn(`⚠️ [DEPLOYMENT] Could not update deployment error status: ${updateError.message}`);
        }
      } else {
                // Créer un record d'erreur s'il n'existe pas encore
        try {
          // Récupérer le site pour obtenir son ID
          const sites = await strapi.documents('api::site.site').findMany({
            filters: { documentId: siteId } as any
          });
          const siteForError = sites && sites.length > 0 ? sites[0] : null;
          const siteIdForRelation = siteForError ? (siteForError as any).documentId : siteId;

          deploymentRecord = await strapi.documents('api::deployment.deployment').create({
            data: {
              site: siteIdForRelation,
              deployment_id: `error-${Date.now()}`,
              status: 'error',
              ...(userId ? { triggered_by: userId } : {}),
              build_time: buildTime,
              error_message: error.message,
              triggered_at: new Date(),
              completed_at: new Date()
            }
          });
          log.info(`❌ [DEPLOYMENT] Error deployment record created: ${deploymentRecord.id}`);
        } catch (dbError: any) {
          log.warn(`⚠️ [DEPLOYMENT] Could not create error deployment record: ${dbError.message}`);
        }
      }

      return {
        deployment: deploymentRecord,
        buildTime,
        success: false,
        error: error.message
      };
    } finally {
      // Cleanup du dossier de build
      log.info(`🧹 [DEPLOYMENT] Final cleanup...`);

      // Nettoyer le dossier build s'il existe encore
      if (tempBuildDir && fs.existsSync(tempBuildDir)) {
        try {
          await fs.promises.rm(tempBuildDir, { recursive: true, force: true });
          log.info(`✅ [DEPLOYMENT] Build directory cleaned: ${tempBuildDir}`);
        } catch (cleanupError: any) {
          log.warn(`⚠️ [DEPLOYMENT] Could not clean build dir: ${cleanupError.message}`);
        }
      }

      log.info(`✅ [DEPLOYMENT] Final cleanup completed`);
    }
  }

  /**
   * Environnement minimal pour npm et Node pendant le build
   */
  private baseBuildEnv(): NodeJS.ProcessEnv {
    const keep = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'NODE_OPTIONS', 'npm_config_cache', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY'];
    const env: NodeJS.ProcessEnv = {};
    for (const key of keep) {
      if (process.env[key] !== undefined) env[key] = process.env[key];
    }
    return env;
  }

  /**
   * Build un site Astro avec les variables d'environnement appropriées
   */
  async buildSite(siteId: string, siteSlug: string, liveUrl?: string, customDomain?: { domain: string; verified: boolean }): Promise<BuildResult> {
    const startTime = Date.now();
    const tempBuildDir = path.join(this.tempDir, `build-${siteSlug}-${Date.now()}`);

    try {
      log.info(`🏗️ [BUILD] Starting build for ${siteSlug}`);
      log.info(`📁 [BUILD] Temp directory: ${tempBuildDir}`);

      // 1. Copier les sources Astro
      log.info(`📂 [BUILD] Step 1: Copying Astro sources...`);
      await this.copyDirectory(this.sitesPath, tempBuildDir);
      log.info(`✅ [BUILD] Sources copied from ${this.sitesPath}`);

      // 2. Installer les dépendances (--include=dev pour pagefind et autres outils de build)
      log.info(`📦 [BUILD] Step 2: Installing dependencies...`);
      try {
        await execAsync('npm ci --include=dev', {
          cwd: tempBuildDir,
          env: this.baseBuildEnv(),
          maxBuffer: 10 * 1024 * 1024
        });
        log.info(`✅ [BUILD] Dependencies installed successfully`);
      } catch (npmError: any) {
        log.error(`❌ [BUILD] npm ci failed:`, npmError.message);
        throw new Error(`npm ci failed: ${npmError.message}`);
      }

      // 3. Build avec les variables d'environnement
      // Seules les variables nécessaires sont transmises : jamais les secrets de Strapi
      // (base de données, JWT, NETLIFY_TOKEN…) aux scripts du build et de ses dépendances.
      const buildEnv = {
        ...this.baseBuildEnv(),
        // Variables pour Astro/Strapi
        SITE_DOCUMENT_ID: siteId,  // Le projet Astro s'attend à SITE_DOCUMENT_ID
        SITE_SLUG: siteSlug,
        STRAPI_URL: process.env.STRAPI_BUILD_URL || `http://localhost:${process.env.PORT || 1337}`,
        STRAPI_PUBLIC_URL: process.env.STRAPI_PUBLIC_URL || process.env.STRAPI_BUILD_URL || `http://localhost:${process.env.PORT || 1337}`,
        STRAPI_TOKEN: process.env.STRAPI_API_TOKEN,
        SITE_URL: (customDomain?.verified && customDomain.domain)
          ? `https://${customDomain.domain}`
          : liveUrl,
        NODE_ENV: 'production'
      };

      log.info(`🔧 [BUILD] Step 3: Building with environment variables:`);
      log.info(`   SITE_DOCUMENT_ID: ${buildEnv.SITE_DOCUMENT_ID}`);
      log.info(`   SITE_SLUG: ${buildEnv.SITE_SLUG}`);
      log.info(`   STRAPI_URL: ${buildEnv.STRAPI_URL}`);
      log.info(`   STRAPI_TOKEN: ${buildEnv.STRAPI_TOKEN ? '***SET***' : 'NOT_SET'}`);
      log.info(`   NODE_ENV: ${buildEnv.NODE_ENV}`);

      // Pre-build health check: verify Strapi is reachable and site exists
      if (!buildEnv.STRAPI_TOKEN) {
        throw new Error('STRAPI_API_TOKEN not set — cannot build site');
      }

      const checkUrl = `${buildEnv.STRAPI_URL}/api/sites?filters[documentId][$eq]=${siteId}`;
      log.debug(`🔍 [BUILD] Pre-build check: ${checkUrl}`);
      const check = await fetch(checkUrl, {
        headers: { 'Authorization': `Bearer ${buildEnv.STRAPI_TOKEN}`, 'Content-Type': 'application/json' }
      });
      if (!check.ok) {
        throw new Error(`Strapi inaccessible at ${buildEnv.STRAPI_URL} (${check.status}). Check STRAPI_BUILD_URL/STRAPI_API_TOKEN.`);
      }
      const checkData = await check.json() as { data?: { name: string }[] };
      if (!checkData.data?.length) {
        throw new Error(`Site ${siteId} not found via API. Build would produce an empty site.`);
      }
      log.info(`✅ [BUILD] Site "${checkData.data[0].name}" accessible via API`);

      try {
        log.info(`🚀 [BUILD] Running: npx astro build`);
        const { stdout: buildOutput } = await execAsync('npx astro build', {
          cwd: tempBuildDir,
          env: buildEnv,
          maxBuffer: 10 * 1024 * 1024
        });
        log.info(`📋 [BUILD] Build output:\n${buildOutput}`);
        log.info(`✅ [BUILD] Astro build completed successfully`);
      } catch (buildError: any) {
        log.error(`❌ [BUILD] npx astro build failed:`);
        log.error(`❌ [BUILD] Exit code: ${buildError.code}`);
        log.error(`❌ [BUILD] Error message: ${buildError.message}`);
        if (buildError.stdout) {
          log.error(`📋 [BUILD] STDOUT:\n${buildError.stdout}`);
        }
        if (buildError.stderr) {
          log.error(`📋 [BUILD] STDERR:\n${buildError.stderr}`);
        }
        throw new Error(`Astro build failed: ${buildError.message}\n${buildError.stderr || buildError.stdout || ''}`);
      }

      // 3b. Run Pagefind indexing
      log.debug(`🔍 [BUILD] Running Pagefind indexing...`);
      try {
        const { stdout: pagefindOutput } = await execAsync('npx pagefind --site dist', {
          cwd: tempBuildDir,
          env: buildEnv,
          maxBuffer: 10 * 1024 * 1024
        });
        log.info(`📋 [BUILD] Pagefind output:\n${pagefindOutput}`);
        log.info(`✅ [BUILD] Pagefind indexing completed`);
      } catch (pagefindError: any) {
        log.error(`❌ [BUILD] Pagefind indexing failed: ${pagefindError.message}`);
        if (pagefindError.stderr) {
          log.error(`📋 [BUILD] Pagefind STDERR:\n${pagefindError.stderr}`);
        }
        throw new Error(`Pagefind indexing failed: ${pagefindError.message}`);
      }

      const distPath = path.join(tempBuildDir, 'dist');

      if (!fs.existsSync(distPath)) {
        log.error(`❌ [BUILD] Build output directory not found: ${distPath}`);
        throw new Error('Build output directory not found');
      }

      log.info(`📁 [BUILD] Build output found at: ${distPath}`);

      // Analyser le contenu du dossier dist
      try {
        const distFiles = fs.readdirSync(distPath, { recursive: true });
        log.info(`📋 [BUILD] Dist contents (${distFiles.length} files):`);
        distFiles.slice(0, 20).forEach(file => log.info(`   - ${file}`));
        if (distFiles.length > 20) {
          log.info(`   ... and ${distFiles.length - 20} more files`);
        }

        // Vérifier la taille du dossier
        const distStats = fs.statSync(distPath);
        log.info(`📊 [BUILD] Dist directory size: ${distStats.size} bytes`);

        // Vérifier le fichier index.html
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          const indexSize = fs.statSync(indexPath).size;
          log.info(`📄 [BUILD] index.html found: ${indexSize} bytes`);
          if (indexSize < 1000) {
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            log.info(`⚠️  [BUILD] index.html content (small file):\n${indexContent.substring(0, 500)}`);
          }
        } else {
          log.info(`❌ [BUILD] index.html NOT found!`);
        }
      } catch (error) {
        log.warn(`⚠️ [BUILD] Could not analyze dist contents:`, error);
      }

      const buildTime = Math.round((Date.now() - startTime) / 1000);

      log.info(`🎉 [BUILD] Build completed successfully in ${buildTime}s`);

      return {
        success: true,
        buildPath: distPath,
        buildTime
      };

    } catch (error: any) {
      const buildTime = Math.round((Date.now() - startTime) / 1000);
      log.error(`💥 [BUILD] Build failed for ${siteSlug} after ${buildTime}s:`, error);

      return {
        success: false,
        error: error.message,
        buildTime
      };
    }
  }

  /**
   * Copie récursive d'un dossier (exclut node_modules, dist, .astro qui sont régénérés)
   */
  private static EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.astro']);

  async copyDirectory(source: string, destination: string): Promise<void> {
    await fs.promises.mkdir(destination, { recursive: true });

    const items = await fs.promises.readdir(source);

    for (const item of items) {
      if (DeploymentService.EXCLUDED_DIRS.has(item)) {
        continue;
      }
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      const stat = await fs.promises.stat(sourcePath);

      if (stat.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        await fs.promises.copyFile(sourcePath, destPath);
      }
    }
  }

  /**
   * Vérifie le statut d'un déploiement et met à jour la base
   */
  async checkDeploymentStatus(deploymentId: string): Promise<any> {
    try {
      // Récupérer le déploiement depuis la base
      const deployments = await strapi.documents('api::deployment.deployment').findMany({
        filters: { deployment_id: deploymentId }
      });

      if (!deployments || deployments.length === 0) {
        throw new Error('Deployment not found in database');
      }

      const deployment = deployments[0];

      // Vérifier le statut chez l'hébergeur
      const hostStatus = await getPublisher().status(deploymentId);
      const status = hostStatus.state;
      const completedAt = status === 'building' ? null : new Date();

      // Mettre à jour en base si le statut a changé
      if (deployment.status !== status) {
        const updateData: any = { status };

        if (completedAt) {
          updateData.completed_at = completedAt;
        }

        if (hostStatus.error) {
          updateData.error_message = hostStatus.error;
        }

        await strapi.documents('api::deployment.deployment').update({ documentId: deployment.documentId,
          data: updateData
        });
      }

      return {
        ...deployment,
        status,
        host_status: hostStatus
      };

    } catch (error: any) {
      log.error(`❌ [DEPLOYMENT STATUS] Error checking deployment status:`, error);
      throw error;
    }
  }

  /**
   * Nettoie les fichiers temporaires
   */
  async cleanup(...paths: (string | undefined)[]): Promise<void> {
    // Nettoyer les chemins spécifiés
    for (const cleanupPath of paths) {
      if (cleanupPath && fs.existsSync(cleanupPath)) {
        try {
          const stat = await fs.promises.stat(cleanupPath);
          if (stat.isDirectory()) {
            await fs.promises.rm(cleanupPath, { recursive: true, force: true });
          } else {
            await fs.promises.unlink(cleanupPath);
          }
          log.info(`🧹 [CLEANUP] Cleaned up: ${cleanupPath}`);
        } catch (error: any) {
          log.warn(`⚠️ [CLEANUP] Failed to cleanup ${cleanupPath}: ${error.message}`);
        }
      }
    }

    // Nettoyer les anciens fichiers temporaires (plus de 1 heure)
    try {
      if (fs.existsSync(this.tempDir)) {
        const tempFiles = fs.readdirSync(this.tempDir);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        for (const file of tempFiles) {
          if (file.startsWith('build-') || file.startsWith('deploy-')) {
            const filePath = path.join(this.tempDir, file);
            const stats = fs.statSync(filePath);

            if (stats.mtime.getTime() < oneHourAgo) {
              if (stats.isDirectory()) {
                await fs.promises.rm(filePath, { recursive: true, force: true });
              } else {
                await fs.promises.unlink(filePath);
              }
              log.info(`🧹 [CLEANUP] Old temp file removed: ${file}`);
            }
          }
        }
      }
    } catch (error: any) {
      log.error(`❌ [CLEANUP] Auto-cleanup error:`, error.message);
    }
  }

  /**
   * Nettoie les anciens fichiers temporaires (plus de 1 heure)
   */
  private async cleanupOldTempFiles(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        const tempFiles = fs.readdirSync(this.tempDir);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        for (const file of tempFiles) {
          if (file.startsWith('build-') || file.startsWith('deploy-')) {
            const filePath = path.join(this.tempDir, file);
            const stats = fs.statSync(filePath);

            if (stats.mtime.getTime() < oneHourAgo) {
              if (stats.isDirectory()) {
                await fs.promises.rm(filePath, { recursive: true, force: true });
              } else {
                await fs.promises.unlink(filePath);
              }
              log.info(`🧹 [CLEANUP] Old temp file removed: ${file}`);
            }
          }
        }
      }
    } catch (error: any) {
      log.error(`❌ [CLEANUP] Auto-cleanup error:`, error.message);
    }
  }
}

// Export singleton instance
export default new DeploymentService();

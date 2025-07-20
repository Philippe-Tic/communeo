/**
 * Deployment Service - Orchestration des builds et déploiements
 */

import archiver from 'archiver';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import netlifyService from './netlify';

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
    // Le dossier sites est au niveau parent du backend
    this.sitesPath = path.join(process.cwd(), '../sites');
    // Utiliser le dossier temp système pour éviter les redémarrages Strapi
    this.tempDir = path.join(os.tmpdir(), 'cms-mairies-builds');

    console.log('🔧 [DEPLOYMENT SERVICE] Configuration des chemins :');
    console.log(`   - Working directory: ${process.cwd()}`);
    console.log(`   - Sites path: ${this.sitesPath}`);
    console.log(`   - Temp directory: ${this.tempDir}`);
    console.log(`   - Sites directory exists: ${fs.existsSync(this.sitesPath)}`);

    // Nettoyer tous les anciens dossiers temporaires au démarrage
    this.cleanupOldTempFiles();

    // Créer le dossier temp s'il n'existe pas
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log(`✅ [DEPLOYMENT SERVICE] Temp directory created: ${this.tempDir}`);
    } else {
      console.log(`✅ [DEPLOYMENT SERVICE] Temp directory exists: ${this.tempDir}`);
    }
  }

  /**
   * Déploie un site complet : build + upload vers Netlify
   */
  async buildAndDeploy(siteId: string, siteSlug: string, userId: string): Promise<DeploymentResult> {
    const startTime = Date.now();
    let tempBuildDir: string | undefined;
    let zipPath: string | undefined;

    console.log(`🚀 [DEPLOYMENT] Starting deployment for site ${siteSlug} (ID: ${siteId})`);

    try {
      // 1. Récupérer les infos du site
      console.log(`📋 [DEPLOYMENT] Step 1: Fetching site data...`);

      const sites = await strapi.entityService.findMany('api::site.site', {
        filters: { documentId: siteId } as any,
        populate: {
          pages: true,
          articles: true,
          evenements: true
        }
      });

      const site = sites && sites.length > 0 ? sites[0] : null;

      if (!site) {
        console.error(`❌ [DEPLOYMENT] Site not found: ${siteId}`);
        throw new Error(`Site not found: ${siteId}`);
      }

      console.log(`✅ [DEPLOYMENT] Site found: ${(site as any).name}`);

      // 2. Créer le site Netlify si nécessaire
      console.log(`🌐 [DEPLOYMENT] Step 2: Checking Netlify site...`);

      let netlifyId = (site as any).netlify_site_id;
      if (!netlifyId) {
        console.log(`🔧 [DEPLOYMENT] Creating new Netlify site...`);
        const netlifyResult = await netlifyService.createSite((site as any).name, (site as any).slug);
        netlifyId = netlifyResult.id;

        console.log(`✅ [DEPLOYMENT] Netlify site created: ${netlifyId}`);

        // Mettre à jour le site avec l'ID Netlify
        await strapi.entityService.update('api::site.site', siteId, {
          data: {
            netlify_site_id: netlifyId,
            live_url: netlifyResult.url
          }
        });

                console.log(`✅ [DEPLOYMENT] Site updated with Netlify ID`);
      } else {
        console.log(`✅ [DEPLOYMENT] Using existing Netlify site: ${netlifyId}`);
      }

      // 3. Build le site Astro
      console.log(`🏗️ [DEPLOYMENT] Step 3: Building Astro site...`);
      const buildResult = await this.buildSite(siteId, (site as any).slug);
      if (!buildResult.success) {
        console.error(`❌ [DEPLOYMENT] Build failed: ${buildResult.error}`);
        throw new Error(buildResult.error || 'Build failed');
      }

      console.log(`✅ [DEPLOYMENT] Build successful in ${buildResult.buildTime}s`);
      tempBuildDir = buildResult.buildPath!;

      // 4. Créer le ZIP
      console.log(`📦 [DEPLOYMENT] Step 4: Creating ZIP archive...`);
      zipPath = await this.createZip(tempBuildDir);
      console.log(`✅ [DEPLOYMENT] ZIP created: ${zipPath}`);

      // 5. Nettoyer immédiatement le dossier de build (garde seulement le ZIP)
      console.log(`🧹 [DEPLOYMENT] Step 5: Immediate cleanup of build directory...`);
      if (tempBuildDir && fs.existsSync(tempBuildDir)) {
        await fs.promises.rm(tempBuildDir, { recursive: true, force: true });
        console.log(`✅ [DEPLOYMENT] Build directory cleaned: ${tempBuildDir}`);
        tempBuildDir = undefined; // Pour éviter de le nettoyer à nouveau dans finally
      }

      // 6. Uploader vers Netlify
      console.log(`⬆️ [DEPLOYMENT] Step 6: Uploading to Netlify...`);
      const zipBuffer = fs.readFileSync(zipPath);
      const deployment = await netlifyService.deploySite(netlifyId, zipBuffer);
      console.log(`✅ [DEPLOYMENT] Uploaded to Netlify, deployment ID: ${deployment.id}`);

      // 7. Créer l'entrée de déploiement en base
      console.log(`💾 [DEPLOYMENT] Step 7: Creating deployment record...`);
      try {
        const deploymentRecord = await global.strapi.entityService.create('api::deployment.deployment', {
          data: {
            site: siteId,
            deployment_id: deployment.id,
            status: 'building',
            triggered_by: userId,
            deployment_url: deployment.deploy_url,
            triggered_at: new Date()
          }
        });
        console.log(`✅ [DEPLOYMENT] Deployment record created: ${deploymentRecord.id}`);
      } catch (dbError: any) {
        console.warn(`⚠️ [DEPLOYMENT] Could not create deployment record: ${dbError.message}`);
        // Ne pas faire échouer le déploiement si l'enregistrement en base échoue
      }

      const buildTime = Math.round((Date.now() - startTime) / 1000);

      console.log(`🎉 [DEPLOYMENT] Deployment initiated successfully in ${buildTime}s`);
      console.log(`🔗 [DEPLOYMENT] Deployment URL: ${deployment.deploy_url}`);

      return {
        deployment: null, // Déploiement réussi même si l'enregistrement en base échoue
        buildTime,
        success: true
      };

    } catch (error: any) {
      const buildTime = Math.round((Date.now() - startTime) / 1000);
      console.error(`💥 [DEPLOYMENT] Deployment failed for site ${siteSlug} after ${buildTime}s:`, error);

      return {
        deployment: null,
        buildTime,
        success: false,
        error: error.message
      };
    } finally {
      // Cleanup des fichiers temporaires (ZIP et dossier build s'il reste)
      console.log(`🧹 [DEPLOYMENT] Final cleanup...`);

      // Nettoyer le ZIP s'il existe encore
      if (zipPath && fs.existsSync(zipPath)) {
        try {
          await fs.promises.unlink(zipPath);
          console.log(`✅ [DEPLOYMENT] ZIP file cleaned: ${zipPath}`);
        } catch (cleanupError: any) {
          console.warn(`⚠️ [DEPLOYMENT] Could not clean ZIP: ${cleanupError.message}`);
        }
      }

      // Nettoyer le dossier build s'il existe encore
      if (tempBuildDir && fs.existsSync(tempBuildDir)) {
        try {
          await fs.promises.rm(tempBuildDir, { recursive: true, force: true });
          console.log(`✅ [DEPLOYMENT] Build directory cleaned: ${tempBuildDir}`);
        } catch (cleanupError: any) {
          console.warn(`⚠️ [DEPLOYMENT] Could not clean build dir: ${cleanupError.message}`);
        }
      }

      console.log(`✅ [DEPLOYMENT] Final cleanup completed`);
    }
  }

  /**
   * Build un site Astro avec les variables d'environnement appropriées
   */
  async buildSite(siteId: string, siteSlug: string): Promise<BuildResult> {
    const startTime = Date.now();
    const tempBuildDir = path.join(this.tempDir, `build-${siteSlug}-${Date.now()}`);

    try {
      console.log(`🏗️ [BUILD] Starting build for ${siteSlug}`);
      console.log(`📁 [BUILD] Temp directory: ${tempBuildDir}`);

      // 1. Copier les sources Astro
      console.log(`📂 [BUILD] Step 1: Copying Astro sources...`);
      await this.copyDirectory(this.sitesPath, tempBuildDir);
      console.log(`✅ [BUILD] Sources copied from ${this.sitesPath}`);

      // 2. Installer les dépendances
      console.log(`📦 [BUILD] Step 2: Installing dependencies...`);
      try {
        execSync('npm ci --production=false', {
          cwd: tempBuildDir,
          stdio: 'pipe'
        });
        console.log(`✅ [BUILD] Dependencies installed successfully`);
      } catch (npmError: any) {
        console.error(`❌ [BUILD] npm ci failed:`, npmError.message);
        throw new Error(`npm ci failed: ${npmError.message}`);
      }

      // 3. Build avec les variables d'environnement
      const buildEnv = {
        ...process.env,
        // Variables pour Astro/Strapi
        SITE_DOCUMENT_ID: siteId,  // Le projet Astro s'attend à SITE_DOCUMENT_ID
        SITE_SLUG: siteSlug,
        STRAPI_URL: process.env.STRAPI_PUBLIC_URL || 'http://localhost:1337',
        STRAPI_TOKEN: process.env.STRAPI_API_TOKEN,
        NODE_ENV: 'production'
      };

      console.log(`🔧 [BUILD] Step 3: Building with environment variables:`);
      console.log(`   SITE_DOCUMENT_ID: ${buildEnv.SITE_DOCUMENT_ID}`);
      console.log(`   SITE_SLUG: ${buildEnv.SITE_SLUG}`);
      console.log(`   STRAPI_URL: ${buildEnv.STRAPI_URL}`);
      console.log(`   STRAPI_TOKEN: ${buildEnv.STRAPI_TOKEN ? '***SET***' : 'NOT_SET'}`);
      console.log(`   NODE_ENV: ${buildEnv.NODE_ENV}`);

      try {
        console.log(`🚀 [BUILD] Running: npx astro build`);
        const buildOutput = execSync('npx astro build', {
          cwd: tempBuildDir,
          env: buildEnv,
          stdio: 'pipe',
          encoding: 'utf8'
        });
        console.log(`📋 [BUILD] Build output:\n${buildOutput}`);
        console.log(`✅ [BUILD] Astro build completed successfully`);
      } catch (buildError: any) {
        console.error(`❌ [BUILD] npx astro build failed:`);
        console.error(`❌ [BUILD] Exit code: ${buildError.status}`);
        console.error(`❌ [BUILD] Error message: ${buildError.message}`);
        if (buildError.stdout) {
          console.error(`📋 [BUILD] STDOUT:\n${buildError.stdout}`);
        }
        if (buildError.stderr) {
          console.error(`📋 [BUILD] STDERR:\n${buildError.stderr}`);
        }
        throw new Error(`Build failed: ${buildError.message}\n${buildError.stderr || buildError.stdout || ''}`);
      }

      const distPath = path.join(tempBuildDir, 'dist');

      if (!fs.existsSync(distPath)) {
        console.error(`❌ [BUILD] Build output directory not found: ${distPath}`);
        throw new Error('Build output directory not found');
      }

      console.log(`📁 [BUILD] Build output found at: ${distPath}`);

      // Analyser le contenu du dossier dist
      try {
        const distFiles = fs.readdirSync(distPath, { recursive: true });
        console.log(`📋 [BUILD] Dist contents (${distFiles.length} files):`);
        distFiles.slice(0, 20).forEach(file => console.log(`   - ${file}`));
        if (distFiles.length > 20) {
          console.log(`   ... and ${distFiles.length - 20} more files`);
        }

        // Vérifier la taille du dossier
        const distStats = fs.statSync(distPath);
        console.log(`📊 [BUILD] Dist directory size: ${distStats.size} bytes`);

        // Vérifier le fichier index.html
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          const indexSize = fs.statSync(indexPath).size;
          console.log(`📄 [BUILD] index.html found: ${indexSize} bytes`);
          if (indexSize < 1000) {
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            console.log(`⚠️  [BUILD] index.html content (small file):\n${indexContent.substring(0, 500)}`);
          }
        } else {
          console.log(`❌ [BUILD] index.html NOT found!`);
        }
      } catch (error) {
        console.warn(`⚠️ [BUILD] Could not analyze dist contents:`, error);
      }

      const buildTime = Math.round((Date.now() - startTime) / 1000);

      console.log(`🎉 [BUILD] Build completed successfully in ${buildTime}s`);

      return {
        success: true,
        buildPath: distPath,
        buildTime
      };

    } catch (error: any) {
      const buildTime = Math.round((Date.now() - startTime) / 1000);
      console.error(`💥 [BUILD] Build failed for ${siteSlug} after ${buildTime}s:`, error);

      return {
        success: false,
        error: error.message,
        buildTime
      };
    }
  }

  /**
   * Crée un ZIP du dossier de build
   * Structure le ZIP pour que Netlify trouve les fichiers dans dist/
   */
  async createZip(sourceDir: string): Promise<string> {
    const zipPath = path.join(this.tempDir, `deploy-${Date.now()}.zip`);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`✅ [ZIP] Created: ${archive.pointer()} total bytes`);
        console.log(`📁 [ZIP] Structure: Files placed at ZIP root for direct Netlify deployment`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      // Mettre les fichiers directement à la racine du ZIP
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Copie récursive d'un dossier
   */
  async copyDirectory(source: string, destination: string): Promise<void> {
    await fs.promises.mkdir(destination, { recursive: true });

    const items = await fs.promises.readdir(source);

    for (const item of items) {
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
      const deployments = await strapi.entityService.findMany('api::deployment.deployment', {
        filters: { deployment_id: deploymentId }
      });

      if (!deployments || deployments.length === 0) {
        throw new Error('Deployment not found in database');
      }

      const deployment = deployments[0];

      // Vérifier le statut sur Netlify
      const netlifyStatus = await netlifyService.getDeploymentStatus(deploymentId);

      // Mapper les statuts Netlify vers nos statuts
      let status = 'building';
      let completedAt = null;

      switch (netlifyStatus.state) {
        case 'ready':
          status = 'ready';
          completedAt = new Date();
          break;
        case 'error':
        case 'skipped':
          status = 'error';
          completedAt = new Date();
          break;
        case 'building':
        case 'enqueued':
        default:
          status = 'building';
          break;
      }

      // Mettre à jour en base si le statut a changé
      if (deployment.status !== status) {
        const updateData: any = { status };

        if (completedAt) {
          updateData.completed_at = completedAt;
        }

        if (netlifyStatus.error_message) {
          updateData.error_message = netlifyStatus.error_message;
        }

        await strapi.entityService.update('api::deployment.deployment', deployment.id, {
          data: updateData
        });
      }

      return {
        ...deployment,
        status,
        netlify_status: netlifyStatus
      };

    } catch (error: any) {
      console.error(`❌ [DEPLOYMENT STATUS] Error checking deployment status:`, error);
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
          console.log(`🧹 [CLEANUP] Cleaned up: ${cleanupPath}`);
        } catch (error: any) {
          console.warn(`⚠️ [CLEANUP] Failed to cleanup ${cleanupPath}: ${error.message}`);
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
              console.log(`🧹 [CLEANUP] Old temp file removed: ${file}`);
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ [CLEANUP] Auto-cleanup error:`, error.message);
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
              console.log(`🧹 [CLEANUP] Old temp file removed: ${file}`);
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ [CLEANUP] Auto-cleanup error:`, error.message);
    }
  }
}

// Export singleton instance
export default new DeploymentService();

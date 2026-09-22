/**
 * Auto-deploy service — triggers a rebuild with debounce when content changes.
 */

import deploymentService from './deployment';
import { log } from '../utils/logger';

// In-memory map of pending deploy timers per site
const pendingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

class AutoDeployService {
  /**
   * Schedule a deploy if auto-deploy is enabled for the site.
   * Uses debounce: if called again before the timer fires, the previous timer is cancelled.
   */
  async scheduleDeployIfEnabled(siteDocumentId: string): Promise<void> {
    try {
      // Look up the site to check auto-deploy settings
      const sites = await strapi.documents('api::site.site').findMany({
        filters: { documentId: siteDocumentId } as any,
      });

      const site = Array.isArray(sites) ? sites[0] : sites;
      if (!site || !site.auto_deploy_enabled) {
        return;
      }

      const delaySeconds = site.auto_deploy_delay || 300;
      const siteSlug = site.slug;

      // Cancel any pending timer for this site (debounce)
      this.cancelPending(siteDocumentId);

      log.info(`⏱️ [AUTO-DEPLOY] Scheduling deploy for "${siteSlug}" in ${delaySeconds}s`);

      const timer = setTimeout(async () => {
        pendingTimers.delete(siteDocumentId);

        try {
          // La file garantit un seul build à la fois par site
          await deploymentService.requestBuild(siteDocumentId, { reason: 'content' });
        } catch (error) {
          log.error(`❌ [AUTO-DEPLOY] Could not queue a build for "${siteSlug}":`, error);
        }
      }, delaySeconds * 1000);

      pendingTimers.set(siteDocumentId, timer);
    } catch (error) {
      log.error(`❌ [AUTO-DEPLOY] Error scheduling deploy:`, error);
    }
  }

  /** A deploy is scheduled for this site */
  hasPending(siteDocumentId: string): boolean {
    return pendingTimers.has(siteDocumentId);
  }

  /**
   * Cancel a pending deploy for a site.
   */
  cancelPending(siteDocumentId: string): void {
    const existing = pendingTimers.get(siteDocumentId);
    if (existing) {
      clearTimeout(existing);
      pendingTimers.delete(siteDocumentId);
      log.info(`🛑 [AUTO-DEPLOY] Cancelled pending deploy for site ${siteDocumentId}`);
    }
  }
}

export default new AutoDeployService();

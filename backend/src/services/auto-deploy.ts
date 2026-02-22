/**
 * Auto-deploy service — triggers a rebuild with debounce when content changes.
 */

import deploymentService from './deployment';

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
      const sites = await strapi.entityService.findMany('api::site.site', {
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

      console.log(`⏱️ [AUTO-DEPLOY] Scheduling deploy for "${siteSlug}" in ${delaySeconds}s`);

      const timer = setTimeout(async () => {
        pendingTimers.delete(siteDocumentId);

        try {
          // Check if a build is already in progress
          const activeDeployments = await strapi.entityService.findMany('api::deployment.deployment', {
            filters: {
              site: { documentId: siteDocumentId },
              status: 'building',
            } as any,
          });

          if (activeDeployments && activeDeployments.length > 0) {
            console.log(`⏸️ [AUTO-DEPLOY] Build already in progress for "${siteSlug}", skipping`);
            return;
          }

          console.log(`🚀 [AUTO-DEPLOY] Triggering deploy for "${siteSlug}"`);
          await deploymentService.buildAndDeploy(siteDocumentId, siteSlug);
          console.log(`✅ [AUTO-DEPLOY] Deploy completed for "${siteSlug}"`);
        } catch (error) {
          console.error(`❌ [AUTO-DEPLOY] Deploy failed for "${siteSlug}":`, error);
        }
      }, delaySeconds * 1000);

      pendingTimers.set(siteDocumentId, timer);
    } catch (error) {
      console.error(`❌ [AUTO-DEPLOY] Error scheduling deploy:`, error);
    }
  }

  /**
   * Cancel a pending deploy for a site.
   */
  cancelPending(siteDocumentId: string): void {
    const existing = pendingTimers.get(siteDocumentId);
    if (existing) {
      clearTimeout(existing);
      pendingTimers.delete(siteDocumentId);
      console.log(`🛑 [AUTO-DEPLOY] Cancelled pending deploy for site ${siteDocumentId}`);
    }
  }
}

export default new AutoDeployService();

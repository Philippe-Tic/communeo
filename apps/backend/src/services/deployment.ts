/**
 * Mises en ligne : dépôt des demandes dans la file des builds et suivi de l'état chez l'hébergeur.
 * Le build et la publication sont faits par le worker (apps/worker), qui rend compte à Strapi
 * par les routes internes de `api::build-worker`.
 */
import type { BuildReason, EnqueueResult } from '@communeo/pipeline';
import { enqueueBuild, scheduleBuild } from './build-queue';
import { publisher } from '../utils/publisher';
import { log } from '../utils/logger';

class DeploymentService {
  /**
   * Demande une mise en ligne immédiate. Si une demande attend déjà pour ce site, elle part aussi tôt
   * et prendra en compte les dernières modifications.
   */
  async requestBuild(siteDocumentId: string, options: { triggeredBy?: string | null; reason: BuildReason }): Promise<EnqueueResult> {
    const result = await enqueueBuild({ siteDocumentId, triggeredBy: options.triggeredBy ?? null, reason: options.reason });
    log.info(`📥 [DEPLOYMENT] Build ${result.status} for site ${siteDocumentId} (${options.reason}, job ${result.jobId})`);
    return result;
  }

  /**
   * Mise en ligne automatique après une modification : part `delaySeconds` après la dernière
   * modification du site (debounce persistant dans la file).
   */
  async scheduleContentBuild(siteDocumentId: string, delaySeconds: number): Promise<EnqueueResult> {
    const result = await scheduleBuild({ siteDocumentId, triggeredBy: null, reason: 'content' }, delaySeconds);
    log.info(`⏱️ [DEPLOYMENT] Build ${result.status} for site ${siteDocumentId} in ${delaySeconds}s (job ${result.jobId})`);
    return result;
  }

  /**
   * Vérifie l'état d'un dépôt chez l'hébergeur et met à jour l'enregistrement Deployment
   */
  async checkDeploymentStatus(deploymentId: string): Promise<any> {
    const deployments = await strapi.documents('api::deployment.deployment').findMany({
      filters: { deployment_id: deploymentId }
    });
    const deployment = deployments?.[0];
    if (!deployment) {
      throw new Error('Deployment not found in database');
    }

    const hostStatus = await publisher().status(deploymentId);
    const status = hostStatus.state;

    if (deployment.status !== status) {
      await strapi.documents('api::deployment.deployment').update({ documentId: deployment.documentId,
        data: {
          status,
          ...(status === 'building' ? {} : { completed_at: new Date() }),
          ...(hostStatus.error ? { error_message: hostStatus.error } : {}),
        } as any
      });
    }

    return { ...deployment, status, host_status: hostStatus };
  }
}

export default new DeploymentService();

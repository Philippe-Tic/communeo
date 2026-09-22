/**
 * Mises en ligne : dépôt des demandes dans la file des builds et suivi de l'état chez l'hébergeur.
 * Le build et la publication sont faits par le worker (apps/worker), qui rend compte à Strapi
 * par les routes internes de `api::build-worker`.
 */
import type { BuildReason } from '@communeo/pipeline';
import { enqueueBuild } from './build-queue';
import { publisher } from '../utils/publisher';
import { log } from '../utils/logger';

class DeploymentService {
  /**
   * Demande une mise en ligne. Renvoie l'identifiant du job, ou `null` si une demande attend déjà
   * pour ce site (elle prendra en compte les dernières modifications).
   */
  async requestBuild(siteDocumentId: string, options: { triggeredBy?: string | null; reason: BuildReason }): Promise<string | null> {
    const jobId = await enqueueBuild({
      siteDocumentId,
      triggeredBy: options.triggeredBy ?? null,
      reason: options.reason,
    });
    log.info(jobId
      ? `📥 [DEPLOYMENT] Build queued for site ${siteDocumentId} (${options.reason}, job ${jobId})`
      : `⏸️ [DEPLOYMENT] A build is already waiting for site ${siteDocumentId}`);
    return jobId;
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

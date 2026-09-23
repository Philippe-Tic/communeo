/**
 * Mise en ligne automatique : après une modification visible sur le site public, un build part
 * `auto_deploy_delay` secondes après la dernière modification (debounce persistant dans la file
 * des builds, qui survit aux redémarrages).
 *
 * Ne déclenchent rien : les brouillons (seules la publication, la dépublication et la suppression
 * comptent sur les contenus en Draft & Publish), les champs techniques du Site (hébergeur, domaine,
 * réglages de mise en ligne), les soumissions publiques (messages, abonnés, associations en attente)
 * et l'historique des mises en ligne.
 */
import deploymentService from './deployment';
import { isBuildQueueConfigured } from './build-queue';
import { log } from '../utils/logger';

const SITE = 'api::site.site';
const DEFAULT_DELAY_SECONDS = 300;

/** Contenus qui n'apparaissent jamais sur le site public */
const IGNORED_UIDS = new Set([
  'api::deployment.deployment',
  'api::contact-submission.contact-submission',
  'api::newsletter-subscriber.newsletter-subscriber',
]);

/** Champs du Site sans effet sur les pages : les modifier ne reconstruit pas le site */
export const TECHNICAL_SITE_FIELDS = new Set([
  'netlify_site_id',
  'live_url',
  'custom_domain',
  'domain_status',
  'domain_type',
  'domain_configured_at',
  'ssl_enabled',
  'auto_deploy_enabled',
  'auto_deploy_delay',
]);

/** Contenus visibles seulement dans certains états (une association en attente n'est pas publiée) */
const VISIBILITY: Record<string, (entry: any) => boolean> = {
  'api::association.association': (entry) => entry?.status === 'published',
};

const DOCUMENT_ACTIONS = new Set(['create', 'update', 'delete', 'publish', 'unpublish']);

export interface ChangeContext {
  uid: string;
  action: string;
  /** Le type de contenu a Draft & Publish */
  draftAndPublish: boolean;
  /** Le type de contenu est rattaché à un site (ou est le Site lui-même) */
  siteScoped: boolean;
  /** Champs envoyés (create / update) */
  data?: Record<string, unknown>;
  /** Statut demandé à l'écriture (`published` : écrit et publie) */
  status?: string;
  /** Le document avant / après l'action, pour les contenus dont la visibilité dépend d'un état */
  before?: unknown;
  after?: unknown;
}

/** Vrai si l'action change ce que voient les visiteurs du site. */
export function changesPublicSite(change: ChangeContext): boolean {
  if (!DOCUMENT_ACTIONS.has(change.action) || !change.siteScoped || IGNORED_UIDS.has(change.uid)) return false;

  if (change.uid === SITE) {
    if (change.action !== 'update') return false;
    const fields = Object.keys(change.data ?? {});
    return fields.some((field) => !TECHNICAL_SITE_FIELDS.has(field));
  }

  // Brouillons : seule la version publiée compte
  if (change.draftAndPublish && (change.action === 'create' || change.action === 'update')) {
    return change.status === 'published';
  }

  const visible = VISIBILITY[change.uid];
  if (visible) return visible(change.before) || visible(change.after);
  return true;
}

class AutoDeployService {
  /**
   * Programme la mise en ligne du site si l'auto-deploy est activé (repoussée à chaque modification).
   */
  async scheduleDeployIfEnabled(siteDocumentId: string): Promise<void> {
    try {
      const site: any = await strapi.documents(SITE).findFirst({ filters: { documentId: siteDocumentId } as any });
      if (!site?.auto_deploy_enabled) return;
      if (!isBuildQueueConfigured()) {
        log.warn(`[AUTO-DEPLOY] File des builds non configurée : pas de mise en ligne automatique pour ${site.slug}`);
        return;
      }
      await deploymentService.scheduleContentBuild(siteDocumentId, site.auto_deploy_delay || DEFAULT_DELAY_SECONDS);
    } catch (error) {
      log.error(`❌ [AUTO-DEPLOY] Could not schedule a build for site ${siteDocumentId}:`, error);
    }
  }
}

const autoDeployService = new AutoDeployService();
export default autoDeployService;

/** Site d'un document (bas niveau : trouve aussi les brouillons) */
async function siteOf(strapi: any, uid: string, documentId: string): Promise<{ siteId: string | null; entry: any }> {
  const entry = await strapi.db.query(uid).findOne({ where: { documentId }, populate: ['site'] });
  return { siteId: entry?.site?.documentId ?? null, entry };
}

/**
 * Middleware des documents : repère les modifications visibles et programme la mise en ligne.
 */
export function autoDeployMiddleware(strapi: any) {
  return async (ctx: any, next: () => Promise<any>) => {
    if (!DOCUMENT_ACTIONS.has(ctx.action) || !ctx.uid?.startsWith('api::')) return next();

    const contentType = strapi.contentTypes[ctx.uid];
    const siteScoped = ctx.uid === SITE || !!contentType?.attributes?.site;
    const change: ChangeContext = {
      uid: ctx.uid,
      action: ctx.action,
      draftAndPublish: !!contentType?.options?.draftAndPublish,
      siteScoped,
      data: ctx.params?.data,
      status: ctx.params?.status,
    };
    if (!siteScoped || IGNORED_UIDS.has(ctx.uid)) return next();

    // Avant l'action : le site (perdu après une suppression) et l'état, pour les contenus concernés
    let siteId: string | null = null;
    const documentId: string | undefined = ctx.params?.documentId;
    if (documentId && ctx.uid !== SITE && (ctx.action === 'delete' || VISIBILITY[ctx.uid])) {
      const before = await siteOf(strapi, ctx.uid, documentId).catch(() => ({ siteId: null, entry: null }));
      siteId = before.siteId;
      change.before = before.entry;
    }

    const result = await next();

    try {
      if (ctx.uid === SITE) {
        siteId = documentId ?? result?.documentId ?? null;
      } else if (ctx.action !== 'delete') {
        const after = await siteOf(strapi, ctx.uid, result?.documentId ?? documentId);
        siteId ??= after.siteId;
        change.after = after.entry;
      }

      if (siteId && changesPublicSite(change)) {
        log.info(`📝 [AUTO-DEPLOY] Content changed (${ctx.action} on ${ctx.uid})`);
        await autoDeployService.scheduleDeployIfEnabled(siteId);
      }
    } catch (error) {
      log.error('[AUTO-DEPLOY] Could not inspect the change:', error);
    }

    return result;
  };
}

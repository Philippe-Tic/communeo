import { isExpired, TRIAL_EXPIRED_MESSAGE } from '../services/trial';
import { log } from '../utils/logger';
/**
 * Isolation multi-tenant : chaque utilisateur ne voit et ne modifie que les données de son site.
 *
 * Politique « fail-closed » pour les utilisateurs authentifiés (hors super_admin) :
 * seules les routes explicitement listées ici sont autorisées, tout le reste est refusé.
 * Les requêtes sans utilisateur (public, API tokens) sont laissées aux permissions Strapi.
 */

interface StrapiUser {
  id: number;
  documentId: string;
  municipality_role?: string;
  blocked?: boolean;
  /** `false` : compte désactivé par un administrateur */
  active?: boolean;
  site?: {
    id: number;
    documentId: string;
    suspended?: boolean;
    plan?: string | null;
  };
}

// Content-types filtrés par site : pluralApiId → uid
const SITE_SCOPED_CONTENT_TYPES: Record<string, string> = {
  'pages': 'api::page.page',
  'articles': 'api::article.article',
  'evenements': 'api::evenement.evenement',
  'contact-submissions': 'api::contact-submission.contact-submission',
  'official-documents': 'api::official-document.official-document',
  'team-members': 'api::team-member.team-member',
  'associations': 'api::association.association',
  'alertes': 'api::alerte.alerte',
  'media-items': 'api::media-item.media-item',
  'waste-schedules': 'api::waste-schedule.waste-schedule',
  'newsletter-subscribers': 'api::newsletter-subscriber.newsletter-subscriber',
  'school-menus': 'api::school-menu.school-menu',
};

// Content-types avec Draft & Publish : sans `?status=published` explicite, on écrit le brouillon
// (par défaut l'API REST de Strapi 5 publierait directement).
const DRAFT_AND_PUBLISH_CONTENT_TYPES = new Set([
  'api::page.page',
  'api::article.article',
  'api::evenement.evenement',
  'api::official-document.official-document',
]);

// Routes custom de niveau collection (ne sont pas des documentId) : pluralApiId → segments
const COLLECTION_ROUTES: Record<string, string[]> = {
  'media-items': ['upload', 'folders', 'usage'],
  'newsletter-subscribers': ['stats', 'export', 'public', 'unsubscribe'],
  'contact-submissions': ['public'],
  'associations': ['public'],
  'alertes': ['public'],
};

// Actions custom sur un document (POST /api/<type>/<documentId>/<action>) : propriété vérifiée comme
// pour une écriture ; toute autre route sous un document reste refusée
const ITEM_ACTIONS: Record<string, string[]> = {
  associations: ['publish', 'reject'],
  'contact-submissions': ['reply', 'open'],
  'newsletter-subscribers': ['unsubscribe'],
};

// APIs custom dont les contrôleurs résolvent eux-mêmes le site (getEffectiveSite) et les rôles
const SELF_GUARDED_APIS = ['deployment', 'domain', 'comarquage', 'user-management', 'site-management', 'preview', 'session', 'publication', 'compliance', 'activity-log', 'content-versions', 'onboarding', 'page-templates', 'trial', 'validations', 'quote'];

// Champs du Site qu'un utilisateur de commune ne peut pas modifier via /api/sites
const PROTECTED_SITE_FIELDS = [
  'slug',
  'netlify_site_id',
  'live_url',
  'custom_domain',
  'domain_status',
  'domain_type',
  'domain_configured_at',
  'ssl_enabled',
  // suspension et période d'essai : décidées par l'équipe Communeo (site-management) et le serveur
  'suspended',
  'plan',
  'trial_ends_at',
  'trial_expired_at',
  'trial_notice',
  'live_requested_at',
  'live_requested_by',
  // relations : empêchent de rattacher les contenus d'une autre commune
  'pages',
  'articles',
  'evenements',
  'deployments',
  'contact_submissions',
  'official_documents',
  'team_members',
  'associations',
  'alertes',
  'waste_schedules',
  'media_items',
  'newsletter_subscribers',
  'school_menus',
  'users',
];

// Essai terminé (#310) : l'administration est en lecture seule, sauf la session, le compte de la
// personne, l'aperçu et la demande de passage en live
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const writableWhenExpired = (apiId: string | null, id: string | null) =>
  ['session', 'auth', 'preview', 'quote'].includes(apiId ?? '') || (apiId === 'user-management' && id === 'me');

const parsePath = (rawUrl: string) => {
  const pathname = rawUrl.split('?')[0];
  const segments = pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s));
  if (segments[0] !== 'api') {
    return { isApi: false, apiId: null as string | null, id: null as string | null, extra: [] as string[] };
  }
  return { isApi: true, apiId: segments[1] || null, id: segments[2] || null, extra: segments.slice(3) };
};

export default (config: any, { strapi }: { strapi: any }) => {
  const getUserFromToken = async (token: string): Promise<StrapiUser | null> => {
    try {
      const decoded = await strapi.plugin('users-permissions').service('jwt').verify(token);
      return await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: decoded.id },
        populate: ['site'],
      });
    } catch {
      // Jeton invalide ou API token (non-JWT) : laissé aux permissions Strapi
      return null;
    }
  };

  const verifyOwnership = async (uid: string, documentId: string, siteDocumentId: string) => {
    // Requête bas niveau : trouve le document qu'il soit brouillon ou publié (Draft & Publish)
    const entity = await strapi.db.query(uid).findOne({
      where: { documentId },
      populate: ['site'],
    });
    if (!entity) return 'notFound' as const;
    if (!entity.site || entity.site.documentId !== siteDocumentId) return 'forbidden' as const;
    return null;
  };

  return async (ctx: any, next: () => Promise<void>) => {
    const { isApi, apiId, id, extra } = parsePath(ctx.request.url || ctx.request.path || '');
    if (!isApi) return next();

    const method: string = ctx.request.method;

    let user: StrapiUser | null = ctx.state.user || null;
    if (!user) {
      const authHeader: string | undefined = ctx.request.headers?.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        user = await getUserFromToken(authHeader.substring(7));
      }
    } else if (!user.site) {
      user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: user.id }, populate: ['site'] });
    }

    if (!user || user.blocked) return next();
    // Compte désactivé par un administrateur, ou commune suspendue : la session en cours ne vaut plus rien
    if (user.active === false) return ctx.unauthorized('Compte désactivé');
    if (user.municipality_role !== 'super_admin' && user.site?.suspended) return ctx.unauthorized('Commune suspendue');
    ctx.state.user = user;

    // Routes d'authentification et profil courant : toujours accessibles
    if (apiId === 'auth' || (apiId === 'users' && id === 'me' && extra.length === 0)) {
      return next();
    }

    // L'équipe Communeo garde la main sur une commune dont l'essai est terminé
    if (user.municipality_role !== 'super_admin' && isExpired(user.site) && !READ_METHODS.has(method) && !writableWhenExpired(apiId, id)) {
      return ctx.forbidden(TRIAL_EXPIRED_MESSAGE, { code: 'trial_expired' });
    }

    if (user.municipality_role === 'super_admin') {
      const impersonatedId = ctx.request.headers?.['x-site-document-id'];
      if (!impersonatedId) return next();

      const sites = await strapi.documents('api::site.site').findMany({
        filters: { documentId: { $eq: impersonatedId } },
      });
      if (!sites?.length) return ctx.notFound('Site introuvable');

      ctx.state.impersonatedSite = sites[0];
      user.site = { id: sites[0].id, documentId: impersonatedId };
      // Puis même filtrage qu'un utilisateur de commune
    } else if (!user.site) {
      return ctx.forbidden('Aucun site assigné à ce compte');
    }

    const siteDocumentId = user.site!.documentId;

    try {
      // --- /api/sites : uniquement son propre site, en lecture et mise à jour ---
      if (apiId === 'sites') {
        if (extra.length > 0 || !['GET', 'PUT'].includes(method)) {
          return ctx.forbidden('Action non autorisée sur le site');
        }
        if (method === 'GET' && !id) {
          ctx.query = { ...ctx.query, filters: { ...(ctx.query?.filters || {}), documentId: { $eq: siteDocumentId } } };
          return next();
        }
        if (id !== siteDocumentId) return ctx.notFound();
        if (method === 'PUT') {
          const data = ctx.request.body?.data;
          if (data && typeof data === 'object') {
            for (const field of PROTECTED_SITE_FIELDS) delete data[field];
            // Le choix du thème est réservé aux administrateurs (écran Apparence)
            if ('theme' in data && !['admin', 'super_admin'].includes(user.municipality_role)) {
              return ctx.forbidden('Seul un administrateur peut changer le thème du site');
            }
          }
        }
        return next();
      }

      // --- Upload : envoi de fichiers uniquement, sans rattachement ni remplacement ---
      if (apiId === 'upload') {
        if (method !== 'POST' || id || extra.length > 0 || ctx.query?.id) {
          return ctx.forbidden('Action non autorisée sur les fichiers');
        }
        const body = ctx.request.body;
        if (body && typeof body === 'object') {
          delete body.ref;
          delete body.refId;
          delete body.field;
          delete body.path;
        }
        return next();
      }

      if (apiId && SELF_GUARDED_APIS.includes(apiId)) return next();

      const uid = apiId ? SITE_SCOPED_CONTENT_TYPES[apiId] : undefined;
      if (!uid) return ctx.forbidden('Accès non autorisé');

      const isCollectionRoute = !!id && (COLLECTION_ROUTES[apiId!] || []).includes(id);
      const documentId = isCollectionRoute ? null : id;
      const isItemAction = !!documentId && extra.length === 1 && method === 'POST' && (ITEM_ACTIONS[apiId!] || []).includes(extra[0]!);
      if (extra.length > 0 && !isItemAction) return ctx.forbidden('Accès non autorisé');

      if (method === 'GET' && !documentId) {
        if (!isCollectionRoute) {
          ctx.query = {
            ...ctx.query,
            filters: { ...(ctx.query?.filters || {}), site: { documentId: { $eq: siteDocumentId } } },
          };
        }
        return next();
      }

      if ((method === 'POST' || method === 'PUT') && DRAFT_AND_PUBLISH_CONTENT_TYPES.has(uid) && !ctx.query?.status) {
        ctx.query = { ...ctx.query, status: 'draft' };
      }

      if (method === 'POST' && !documentId) {
        if (!ctx.request.body || typeof ctx.request.body !== 'object') ctx.request.body = {};
        if (!ctx.request.body.data || typeof ctx.request.body.data !== 'object') ctx.request.body.data = {};
        ctx.request.body.data.site = siteDocumentId;
        return next();
      }

      if (!documentId) return ctx.forbidden('Accès non autorisé');

      const error = await verifyOwnership(uid, documentId, siteDocumentId);
      if (error === 'notFound') return ctx.notFound();
      if (error === 'forbidden') return ctx.forbidden('Accès non autorisé à cette ressource');

      if (ctx.request.body?.data && typeof ctx.request.body.data === 'object') {
        delete ctx.request.body.data.site;
      }
      return next();
    } catch (error) {
      log.error('[site-isolation] Erreur lors de la vérification des permissions', error);
      return ctx.internalServerError('Erreur lors de la vérification des permissions');
    }
  };
};

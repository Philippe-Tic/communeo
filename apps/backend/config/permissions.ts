/**
 * Permissions des rôles users-permissions, déclarées dans le code (source de vérité unique).
 *
 * Au démarrage, la base est alignée sur cette liste : les permissions manquantes sont créées,
 * celles qui n'y figurent pas sont supprimées. Dans Strapi 5, une permission existe ou n'existe pas
 * (il n'y a pas de champ « enabled ») : ne rien déclarer, c'est interdire.
 *
 * L'isolation par commune est assurée en plus par le middleware site-isolation.
 */

const crud = (name: string, actions = ['find', 'findOne', 'create', 'update', 'delete']) =>
  actions.map((action) => `api::${name}.${name}.${action}`);

const custom = (name: string, actions: string[]) => actions.map((action) => `api::${name}.${name}.${action}`);

export const ROLE_PERMISSIONS: Record<'authenticated' | 'public', string[]> = {
  authenticated: [
    // Contenus de la commune
    ...crud('page'),
    ...crud('article'),
    ...crud('evenement'),
    ...crud('official-document'),
    ...crud('team-member'),
    ...crud('association'),
    ...custom('association', ['publish', 'reject']),
    ...crud('alerte'),
    ...crud('waste-schedule'),
    ...crud('school-menu'),
    ...crud('media-item'),
    ...custom('media-item', ['upload', 'folders', 'usage']),
    // Données des habitants : pas de création depuis l'admin (formulaires publics)
    ...crud('contact-submission', ['find', 'findOne', 'update', 'delete']),
    ...custom('contact-submission', ['reply', 'open']),
    // Jamais de suppression ni de modification : l'abonné est désabonné, la trace reste (RGPD)
    ...crud('newsletter-subscriber', ['find', 'findOne']),
    ...custom('newsletter-subscriber', ['stats', 'export', 'unsubscribe']),
    // Son propre site : lecture et mise à jour uniquement
    ...crud('site', ['find', 'findOne', 'update']),
    // Pas d'envoi direct (/api/upload) : tout passe par la médiathèque (formats vérifiés, SVG
    // nettoyés, fichier rattaché à la commune)
    // Endpoints custom (rôles vérifiés dans les contrôleurs)
    ...custom('deployment', ['trigger', 'state', 'status', 'check', 'debug']),
    ...custom('domain', ['configure', 'verify', 'remove', 'status', 'diagnostic']),
    ...custom('user-management', [
      'find',
      'findOne',
      'create',
      'update',
      'delete',
      'resendInvitation',
      'resetPassword',
      'updateMe',
      'requestPasswordReset',
      'admins',
    ]),
    ...custom('site-management', ['find', 'findOne', 'stats', 'slugAvailable', 'create', 'update', 'delete']),
    ...custom('comarquage', ['categories', 'fiche', 'search', 'invalidateCache', 'cacheStatus']),
    ...custom('preview', ['token']),
    ...custom('publication', ['states', 'years', 'unpublish']),
    // Compte courant (la gestion des utilisateurs passe par /api/user-management)
    'plugin::users-permissions.user.me',
    'plugin::users-permissions.auth.changePassword',
    'plugin::users-permissions.auth.logout',
  ],

  public: [
    // Connexion (POST /api/auth/local) et renouvellement de session
    'plugin::users-permissions.auth.callback',
    'plugin::users-permissions.auth.refresh',
    // Alertes affichées en direct sur les sites publics (bandeau rechargé par le navigateur)
    ...custom('alerte', ['findPublicAlerts']),
    // Formulaires publics des sites
    ...custom('contact-submission', ['publicCreate']),
    ...custom('association', ['publicCreate']),
    ...custom('newsletter-subscriber', ['publicSubscribe', 'publicUnsubscribe']),
    // Invitations (flux maison, jetons hachés)
    ...custom('user-management', ['acceptInvitation']),
    // Pas d'inscription, ni de réinitialisation native, ni de connexion par fournisseur externe
  ],
};

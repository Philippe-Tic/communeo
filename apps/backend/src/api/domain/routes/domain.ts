/**
 * domain router
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/domain/configure',
      handler: 'domain.configure',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/domain/verify',
      handler: 'domain.verify',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/domain/remove',
      handler: 'domain.remove',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/domain/status',
      handler: 'domain.status',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      // Caddy (`on_demand_tls`, `ask`) avant de demander le certificat d'un domaine nu de commune, redirigé
      // vers www (#382) : appelé sur le réseau interne, sans utilisateur ; fermé côté public par le Caddyfile
      method: 'GET',
      path: '/domain/certificate-check',
      handler: 'domain.certificateCheck',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/domain/diagnostic/:domain',
      handler: 'domain.diagnostic',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

/**
 * Routes internes du worker de build (apps/worker). Pas d'utilisateur Strapi : le contrôleur
 * vérifie le secret partagé WORKER_SECRET.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/build-worker/jobs/:jobId/start',
      handler: 'build-worker.start',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/build-worker/jobs/:jobId/progress',
      handler: 'build-worker.progress',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/build-worker/jobs/:jobId/finish',
      handler: 'build-worker.finish',
      config: { auth: false },
    },
  ],
};

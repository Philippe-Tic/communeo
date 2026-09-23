/**
 * Custom public route for association submissions
 */

export default {
  routes: [
    // Modération d'une proposition (admin) : site-isolation vérifie la commune
    { method: 'POST', path: '/associations/:id/publish', handler: 'association.publish' },
    { method: 'POST', path: '/associations/:id/reject', handler: 'association.reject' },
    {
      method: 'POST',
      path: '/associations/public',
      handler: 'association.publicCreate',
      config: {
        auth: false,
      },
    },
  ],
};

/**
 * Custom public route for SVE contact form submissions
 */

export default {
  routes: [
    // Traitement d'un message (admin) : site-isolation vérifie la commune
    { method: 'POST', path: '/contact-submissions/:id/reply', handler: 'contact-submission.reply' },
    { method: 'POST', path: '/contact-submissions/:id/open', handler: 'contact-submission.open' },
    {
      method: 'POST',
      path: '/contact-submissions/public',
      handler: 'contact-submission.publicCreate',
      config: {
        auth: false,
      },
    },
  ],
};

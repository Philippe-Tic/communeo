/**
 * Custom public route for SVE contact form submissions
 */

export default {
  routes: [
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

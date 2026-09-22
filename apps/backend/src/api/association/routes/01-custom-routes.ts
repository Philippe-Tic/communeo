/**
 * Custom public route for association submissions
 */

export default {
  routes: [
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

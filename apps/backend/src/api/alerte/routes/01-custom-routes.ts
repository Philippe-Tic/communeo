export default {
  routes: [
    {
      method: 'GET',
      path: '/alertes/public/:siteDocumentId',
      handler: 'alerte.findPublicAlerts',
      config: {
        auth: false,
      },
    },
  ],
};

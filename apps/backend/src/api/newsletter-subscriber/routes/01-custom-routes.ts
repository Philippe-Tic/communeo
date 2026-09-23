export default {
  routes: [
    {
      method: 'POST',
      path: '/newsletter-subscribers/public',
      handler: 'newsletter-subscriber.publicSubscribe',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/newsletter-subscribers/unsubscribe',
      handler: 'newsletter-subscriber.publicUnsubscribe',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/newsletter-subscribers/stats',
      handler: 'newsletter-subscriber.stats',
    },
    {
      method: 'GET',
      path: '/newsletter-subscribers/export',
      handler: 'newsletter-subscriber.export',
    },
    {
      method: 'POST',
      path: '/newsletter-subscribers/:id/unsubscribe',
      handler: 'newsletter-subscriber.unsubscribe',
    },
  ],
};

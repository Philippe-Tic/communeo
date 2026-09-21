export default ({ env }) => ({
  mcp: {
    // Outil de développement : jamais exposé en production
    enabled: env('NODE_ENV') !== 'production',
    config: {
      session: {
        type: 'memory',
        max: 20,
        ttlMs: 600000, // 10 minutes
      },
    },
  },
  email: {
    config: {
      provider: 'strapi-provider-email-resend',
      providerOptions: {
        apiKey: env('RESEND_API_KEY'),
      },
      settings: {
        defaultFrom: env('EMAIL_DEFAULT_FROM', 'noreply@communeo.fr'),
        defaultReplyTo: env('EMAIL_DEFAULT_FROM', 'noreply@communeo.fr'),
      },
    },
  },
});

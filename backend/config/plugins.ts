export default ({ env }) => ({
  mcp: {
    enabled: true,
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

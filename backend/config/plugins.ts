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
      provider: '@strapi/provider-email-nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'localhost'),
        port: env.int('SMTP_PORT', 1025),
        ...(env('SMTP_USERNAME') ? {
          auth: {
            user: env('SMTP_USERNAME'),
            pass: env('SMTP_PASSWORD'),
          },
        } : {}),
        secure: env.bool('SMTP_SECURE', false),
      },
      settings: {
        defaultFrom: env('SMTP_DEFAULT_FROM', 'noreply@cms-mairies.fr'),
        defaultReplyTo: env('SMTP_DEFAULT_REPLY_TO', 'noreply@cms-mairies.fr'),
      },
    },
  },
});

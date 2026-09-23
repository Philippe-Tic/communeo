'use strict';

const toArray = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return [value];
};

module.exports = {
  init(providerOptions, settings) {
    const apiKey = providerOptions.apiKey;

    // En développement sans clé : les e-mails (invitations, liens de mot de passe) sont écrits
    // dans le journal de Strapi au lieu d'être envoyés
    const logOnly = !apiKey && process.env.NODE_ENV !== 'production';

    if (!apiKey) {
      global.strapi?.log.warn(
        logOnly ? 'Resend provider: RESEND_API_KEY not set — emails are logged, not sent' : 'Resend provider: RESEND_API_KEY not set — emails will fail',
      );
    }

    return {
      async send(options) {
        if (logOnly) {
          const files = options.attachments?.length ? `\n[pièces jointes : ${options.attachments.map((file) => file.filename).join(', ')}]` : '';
          global.strapi?.log.info(`[email] À : ${options.to} — ${options.subject}\n${options.text ?? ''}${files}`);
          return;
        }
        if (!apiKey) {
          throw new Error('Resend provider: RESEND_API_KEY is required to send emails');
        }

        const { from, to, cc, bcc, replyTo, subject, text, html } = options;

        const body = {
          from: from || settings.defaultFrom,
          to: toArray(to),
          subject,
        };

        if (cc) body.cc = toArray(cc);
        if (bcc) body.bcc = toArray(bcc);
        if (replyTo || settings.defaultReplyTo) {
          body.reply_to = toArray(replyTo || settings.defaultReplyTo);
        }
        if (text) body.text = text;
        if (html) body.html = html;
        // Pièces jointes : { filename, content (base64) } ou { filename, path (adresse publique) }
        if (options.attachments?.length) body.attachments = options.attachments;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `Resend API error ${response.status}: ${errorBody}`
          );
        }

        return response.json();
      },
    };
  },
};

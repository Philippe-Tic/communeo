/**
 * Hébergeur des sites (mentions légales) : réglage de la plateforme (config/platform.ts), jamais
 * celui envoyé par une commune. Chaque enregistrement du Site le reprend ; au démarrage, les sites
 * existants sont alignés sur la configuration.
 */
const SITE = 'api::site.site';
const COMPONENT = 'legal.mentions-legales';

type Host = { hebergeur_name: string | null; hebergeur_address: string | null; hebergeur_phone: string | null };

/** Hébergeur configuré pour la plateforme, ou `null` s'il ne l'est pas */
export function platformHost(strapi: any): Host | null {
  const host = strapi.config.get('platform.host', {}) as { name?: string; address?: string; phone?: string };
  if (!host.name?.trim()) return null;
  return { hebergeur_name: host.name.trim(), hebergeur_address: host.address?.trim() || null, hebergeur_phone: host.phone?.trim() || null };
}

const hostOf = (legal: Record<string, unknown> | null | undefined): Host => ({
  hebergeur_name: (legal?.hebergeur_name as string | null) ?? null,
  hebergeur_address: (legal?.hebergeur_address as string | null) ?? null,
  hebergeur_phone: (legal?.hebergeur_phone as string | null) ?? null,
});

/**
 * Middleware du document service : les champs hébergeur envoyés sont remplacés par ceux de la
 * plateforme (ou, sans configuration, par ceux déjà enregistrés sur le site).
 */
export const hostingMiddleware = (strapi: any) => async (ctx: any, next: () => Promise<any>) => {
  if (ctx.uid !== SITE || (ctx.action !== 'create' && ctx.action !== 'update')) return next();
  const data = ctx.params?.data;
  if (!data || typeof data !== 'object') return next();
  const configured = platformHost(strapi);

  if ('mentions_legales' in data && data.mentions_legales && typeof data.mentions_legales === 'object') {
    let host = configured;
    if (!host && ctx.action === 'update' && ctx.params.documentId) {
      const current = await strapi.documents(SITE).findOne({ documentId: ctx.params.documentId, populate: ['mentions_legales'] });
      host = hostOf(current?.mentions_legales);
    }
    data.mentions_legales = { ...data.mentions_legales, ...(host ?? hostOf(null)) };
  } else if (ctx.action === 'create' && configured) {
    data.mentions_legales = { ...configured };
  }
  return next();
};

/**
 * Démarrage : aligne l'hébergeur des sites existants sur la configuration. Écrit directement les
 * composants (sans passer par le document service : pas de mise en ligne déclenchée au démarrage).
 */
export async function syncHosting(strapi: any) {
  const host = platformHost(strapi);
  if (!host) return;
  const rows = await strapi.db.query(COMPONENT).findMany({ select: ['id', 'hebergeur_name', 'hebergeur_address', 'hebergeur_phone'] });
  let updated = 0;
  for (const row of rows) {
    const current = hostOf(row);
    if (current.hebergeur_name === host.hebergeur_name && current.hebergeur_address === host.hebergeur_address && current.hebergeur_phone === host.hebergeur_phone) continue;
    await strapi.db.query(COMPONENT).update({ where: { id: row.id }, data: host });
    updated += 1;
  }
  if (updated) strapi.log.info(`[hébergeur] ${updated} site(s) aligné(s) sur la configuration de la plateforme`);
}

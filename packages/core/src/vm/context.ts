/** Contexte de conversion : URL publique du site et URL des fichiers (Strapi ou CDN). */
export interface MapContext {
  /** URL publique du site, sans slash final (liens canoniques, JSON-LD) */
  siteUrl: string;
  /** Préfixe des URL relatives des fichiers envoyés (`/uploads/...`) */
  mediaUrl: string;
}

export const absoluteUrl = (ctx: MapContext, path: string) => (/^https?:\/\//.test(path) ? path : `${ctx.siteUrl}${path}`);

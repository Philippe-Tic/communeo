/// <reference path="../.astro/types.d.ts" />
interface ImportMetaEnv {
  readonly SITE_DOCUMENT_ID: string;
  readonly SITE_SLUG: string;
  readonly STRAPI_URL: string;
  readonly STRAPI_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

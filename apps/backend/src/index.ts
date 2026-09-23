import bootstrap from './bootstrap';
import { autoDeployMiddleware } from './services/auto-deploy';
import { stopBuildQueue } from './services/build-queue';
import { blocksValidationMiddleware } from './validation/blocks';
import { siteValidationMiddleware } from './validation/site';
import { slugsMiddleware } from './validation/slugs';
import { publicationDateMiddleware } from './validation/publication-date';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: any }) {
    // Validation des blocs de contenu, avant tout le reste (y compris l'auto-deploy)
    strapi.documents.use(blocksValidationMiddleware(strapi));
    strapi.documents.use(siteValidationMiddleware());
    strapi.documents.use(slugsMiddleware(strapi));
    strapi.documents.use(publicationDateMiddleware(strapi));

    // Mise en ligne automatique après une modification visible (debounce dans la file des builds)
    strapi.documents.use(autoDeployMiddleware(strapi));
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap,

  /** Ferme la connexion à la file des builds */
  async destroy() {
    await stopBuildQueue();
  },
};

/**
 * Validation de la page d'accueil du Site (textes riches, liens, limites) avec @communeo/core.
 * Le thème est validé par l'énumération du schéma Strapi, alignée sur le registre de @communeo/core.
 */
import { errors } from '@strapi/utils';
import { validateHomepage } from '@communeo/core';

export const siteValidationMiddleware = () => async (ctx: any, next: () => Promise<any>) => {
  if (ctx.uid !== 'api::site.site' || (ctx.action !== 'create' && ctx.action !== 'update')) return next();

  const homepage = ctx.params?.data?.homepage;
  if (homepage !== undefined) {
    const result = validateHomepage(homepage);
    if (!result.success) {
      const count = result.issues.length;
      throw new errors.ValidationError(`${count} erreur${count > 1 ? 's' : ''} dans la page d'accueil`, {
        errors: result.issues.map((issue) => ({
          path: ['homepage', ...issue.path],
          message: issue.message,
          name: 'ValidationError',
        })),
      });
    }
  }

  return next();
};

/**
 * Validation des réglages du Site (accueil, menus, horaires, textes légaux) avec @communeo/core.
 * Le thème est validé par l'énumération du schéma Strapi, alignée sur le registre de @communeo/core.
 */
import { errors } from '@strapi/utils';
import { validateSiteSettings } from '@communeo/core';

export const siteValidationMiddleware = () => async (ctx: any, next: () => Promise<any>) => {
  if (ctx.uid !== 'api::site.site' || (ctx.action !== 'create' && ctx.action !== 'update')) return next();

  const result = validateSiteSettings(ctx.params?.data);
  if (!result.success) {
    const count = result.issues.length;
    throw new errors.ValidationError(`${count} erreur${count > 1 ? 's' : ''} dans les réglages du site`, {
      errors: result.issues.map((issue) => ({ path: issue.path, message: issue.message, name: 'ValidationError' })),
    });
  }

  return next();
};

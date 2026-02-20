/**
 * page controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::page.page', ({ strapi }) => ({
  async findOne(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    // Inject self-referencing relations stripped by Strapi's anti-recursion sanitizer
    const populate = (sanitizedQuery.populate || {}) as Record<string, unknown>;
    populate.parent_page = { fields: ['documentId', 'title', 'slug'] };
    populate.child_pages = { fields: ['documentId', 'title', 'slug'] };
    sanitizedQuery.populate = populate;

    const { id } = ctx.params;
    const entity = await strapi.service('api::page.page').findOne(id, sanitizedQuery);
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async find(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    // Inject self-referencing relations stripped by Strapi's anti-recursion sanitizer
    const populate = (sanitizedQuery.populate || {}) as Record<string, unknown>;
    populate.parent_page = { fields: ['documentId', 'title', 'slug'] };
    populate.child_pages = { fields: ['documentId', 'title', 'slug'] };
    sanitizedQuery.populate = populate;

    const { results, pagination } = await strapi.service('api::page.page').find(sanitizedQuery);
    const sanitizedResults = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedResults, { pagination });
  },
}));

/**
 * Modèles de pages (#153) : pages de démarrage créées en brouillon, depuis l'assistant ou la liste
 * des pages. Les modèles (blocs) sont dans `@communeo/core` ; la commune y est reprise (nom,
 * coordonnées et horaires de la mairie).
 * GET  /api/page-templates → modèles, avec la page déjà créée depuis chacun
 * POST /api/page-templates { templates: string[], menu?: boolean } → pages créées ; `menu` : ajoutées
 *      au sous-menu « Vie pratique » (visibles sur le site une fois publiées)
 */
import { addPagesToMenu, PAGE_TEMPLATES, pageTemplate } from '@communeo/core';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';

const PAGE = 'api::page.page';

async function resolveSite(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Authentification requise');
    return null;
  }
  const site = await getEffectiveSite(ctx);
  if (!site) {
    ctx.forbidden('Aucun site assigné à ce compte');
    return null;
  }
  return site;
}

/** Pages déjà créées depuis un modèle, par modèle */
async function created(siteDocumentId: string) {
  const pages = await strapi.db.query(PAGE).findMany({
    where: { site: { documentId: siteDocumentId }, template: { $notNull: true } },
    select: ['documentId', 'title', 'template'],
  });
  return new Map(pages.map((page: any) => [page.template as string, { documentId: page.documentId, title: page.title }]));
}

export default {
  async list(ctx) {
    const site = await resolveSite(ctx);
    if (!site) return;
    const existing = await created(site.documentId);
    ctx.body = {
      data: PAGE_TEMPLATES.map(({ id, title, summary, suggested }) => ({
        id,
        title,
        summary,
        suggested,
        page: existing.get(id) ?? null,
      })),
    };
  },

  async create(ctx) {
    const site = await resolveSite(ctx);
    if (!site) return;
    const body = ctx.request.body ?? {};
    const ids: string[] = Array.isArray(body.templates) ? body.templates.filter((id) => typeof id === 'string') : [];
    const unknown = ids.filter((id) => !pageTemplate(id));
    if (!ids.length || unknown.length) return ctx.badRequest('Modèle de page inconnu');

    const full: any = await strapi.documents('api::site.site').findOne({
      documentId: site.documentId,
      populate: ['infos_pratiques'] as any,
    });
    const context = {
      communeName: full.name,
      address: full.address,
      phone: full.contact_phone,
      email: full.contact_mail,
      hours: full.infos_pratiques?.opening_hours ?? null,
    };
    const existing = await created(site.documentId);
    const pages: Array<{ documentId: string; title: string; template: string }> = [];
    for (const id of ids) {
      // Déjà créée depuis ce modèle : pas de doublon
      if (existing.has(id)) continue;
      const template = pageTemplate(id)!;
      const page: any = await strapi.documents(PAGE).create({
        // Commune par son documentId : l'adresse (slug) est alors générée depuis le titre, unique dans la commune
        data: { title: template.title, blocks: template.blocks(context), site: site.documentId, template: id } as any,
      });
      pages.push({ documentId: page.documentId, title: page.title, template: id });
    }

    let notInMenu: string[] = [];
    if (body.menu && pages.length) {
      const { config, left } = addPagesToMenu(full.navigation_config, pages.map((page) => page.documentId));
      await strapi.documents('api::site.site').update({ documentId: site.documentId, data: { navigation_config: config } as any });
      notInMenu = left;
    }
    ctx.body = { data: pages, meta: { notInMenu } };
  },
};

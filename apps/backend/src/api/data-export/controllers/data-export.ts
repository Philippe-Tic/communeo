/**
 * Export des données de la commune (#343), voir services/data-export.ts. Administrateurs de la commune
 * et équipe Communeo (dans l'administration de la commune, ou `?site=` depuis l'espace équipe : un lien
 * de téléchargement ne porte pas l'en-tête d'impersonation). Possible aussi après la fin de l'essai.
 *
 * GET  /api/data-export           → état de l'export
 * POST /api/data-export           → lance la préparation (une à la fois)
 * GET  /api/data-export/download  → l'archive prête (ZIP), tant qu'elle n'est pas périmée
 */
import fs from 'node:fs';
import { dataExportFileName } from '@communeo/core';
import { exportStateOf, readyExportFile, requestExport } from '../../../services/data-export';
import { recordActivity } from '../../../services/activity-log';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';

const SITE = 'api::site.site';

async function communeOf(ctx) {
  if (!hasRole(ctx, ['admin', 'super_admin'])) {
    ctx.forbidden("Réservé aux administrateurs de la commune");
    return null;
  }
  const teamSite = hasRole(ctx, ['super_admin']) && typeof ctx.query?.site === 'string' ? { documentId: ctx.query.site } : null;
  const effective = teamSite ?? (await getEffectiveSite(ctx));
  if (!effective) {
    ctx.forbidden('Aucun site assigné à ce compte');
    return null;
  }
  const site = await strapi.db.query(SITE).findOne({ where: { documentId: effective.documentId } });
  if (!site) ctx.notFound('Commune introuvable');
  return site;
}

/** Nom de la personne connectée ; l'équipe Communeo est nommée comme telle */
function authorOf(ctx): string {
  const user = ctx.state.user ?? {};
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Un administrateur';
  return user.municipality_role === 'super_admin' ? `L'équipe Communeo (${name})` : name;
}

export default {
  async state(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    ctx.body = { data: exportStateOf(site) };
  },

  async request(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    const updated = await requestExport(site, { name: authorOf(ctx), email: ctx.state.user?.email ?? null });
    ctx.status = 202;
    ctx.body = { data: exportStateOf(updated) };
  },

  async download(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    const file = readyExportFile(site);
    if (!file) return ctx.notFound("Aucun export prêt : préparez-en un depuis l'écran « Exporter les données ».");
    const stat = fs.statSync(file);
    await recordActivity({ action: 'data_export_download', siteDocumentId: site.documentId, target: { type: 'site', id: site.documentId, label: site.name } });
    ctx.set('Content-Type', 'application/zip');
    ctx.set('Content-Length', String(stat.size));
    ctx.set('Content-Disposition', `attachment; filename="${dataExportFileName(site.slug, site.data_export.finishedAt)}"`);
    ctx.set('Cache-Control', 'private, no-store');
    ctx.body = fs.createReadStream(file);
  },
};

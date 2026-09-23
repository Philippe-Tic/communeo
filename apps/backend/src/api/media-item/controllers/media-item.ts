/**
 * Médiathèque de la commune (#189). Une fiche (media-item) par fichier : nom, dossier, auteur de
 * l'envoi. Le texte alternatif, la légende et le crédit sont portés par le fichier lui-même, donc
 * repris par tous les contenus qui l'utilisent ; modifier un fichier utilisé attend la prochaine mise
 * en ligne. Un fichier utilisé ne peut pas être supprimé.
 */
import fs from 'node:fs/promises';
import { factories } from '@strapi/strapi';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';
import { log } from '../../../utils/logger';
import { checkMedia, sanitizeSvg } from '../../../utils/media-check';
import { mediaUsage } from '../../../services/media-usage';
import { recordPendingChange } from '../../../services/pending-changes';
import autoDeployService from '../../../services/auto-deploy';

const UID = 'api::media-item.media-item' as any;
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : undefined);
const displayName = (user: any) => [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || null;

async function readHead(path: string): Promise<Buffer> {
  const handle = await fs.open(path, 'r');
  try {
    const buffer = Buffer.alloc(512);
    const { bytesRead } = await handle.read(buffer, 0, 512, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/** Fiche de la médiathèque, fichier compris */
async function findItem(strapi: any, documentId: string) {
  return strapi.documents(UID).findOne({ documentId, populate: ['file', 'site'] });
}

export default factories.createCoreController(UID, ({ strapi }) => ({
  /**
   * Envoi d'un fichier dans la médiathèque de la commune (impersonation comprise).
   * POST /api/media-items/upload — multipart : files, name?, folder?, alt_text?, caption?, credit?
   */
  async upload(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Vous devez être connecté');
    const userSite = await getEffectiveSite(ctx);
    if (!userSite) return ctx.forbidden('Aucun site associé à votre compte');

    const files = ctx.request.files;
    const uploadedFile = files?.files || files?.file;
    if (!uploadedFile || Array.isArray(uploadedFile)) return ctx.badRequest(uploadedFile ? 'Un seul fichier à la fois' : 'Aucun fichier fourni');

    const file = uploadedFile as any;
    const path: string = file.filepath ?? file.path;
    const originalName: string = file.originalFilename ?? file.name ?? '';
    const mime: string = file.mimetype ?? file.type;
    const problem = checkMedia({ name: originalName, mime, size: file.size, head: await readHead(path) });
    if (problem) return ctx.badRequest(problem);

    // SVG : nettoyé avant d'être enregistré (scripts, événements, contenus étrangers)
    if (mime === 'image/svg+xml') {
      const clean = sanitizeSvg(await fs.readFile(path, 'utf8'));
      if (!clean) return ctx.badRequest('Ce SVG ne peut pas être utilisé : il ne contient pas de dessin exploitable.');
      await fs.writeFile(path, clean, 'utf8');
      file.size = Buffer.byteLength(clean);
    }

    const body = ctx.request.body ?? {};
    const name = text(body.name, 255) || originalName || 'Sans nom';
    const folder = text(body.folder, 100) || null;

    try {
      const uploadService = strapi.plugin('upload').service('upload');
      const uploaded = await uploadService.upload({
        data: { fileInfo: { name: originalName || name, alternativeText: text(body.alt_text, 255) || null, caption: text(body.caption, 500) || null } },
        files: file,
      });
      const strapiFile = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      if (!strapiFile) return ctx.badRequest("Échec de l'envoi du fichier");
      const credit = text(body.credit, 200);
      if (credit) await strapi.db.query('plugin::upload.file').update({ where: { id: strapiFile.id }, data: { credit } });

      const mediaItem = await strapi.documents(UID).create({
        data: { name, folder, uploaded_by_name: displayName(user), file: strapiFile.id, site: userSite.documentId },
        populate: ['file', 'site'],
      } as any);

      ctx.status = 201;
      return { data: mediaItem };
    } catch (error) {
      log.error('Media upload error:', error);
      return ctx.internalServerError("Erreur lors de l'envoi du fichier");
    }
  },

  /**
   * Modification d'une fiche : nom (fiche et fichier), dossier (fiche), texte alternatif, légende et crédit (fichier).
   * PUT /api/media-items/:id { data: { name?, folder?, alt_text?, caption?, credit? } }
   */
  async update(ctx: any) {
    const item: any = await findItem(strapi, ctx.params.id);
    if (!item?.file) return ctx.notFound();
    const data = ctx.request.body?.data ?? {};

    const itemData: Record<string, unknown> = {};
    if ('name' in data) {
      const name = text(data.name, 255);
      if (!name) return ctx.badRequest('Le nom du fichier est obligatoire');
      itemData.name = name;
    }
    if ('folder' in data) itemData.folder = text(data.folder, 100) || null;

    const fileData: Record<string, unknown> = {};
    // Le nom est aussi celui du fichier : c'est lui que montrent les blocs et le site public
    if (itemData.name && itemData.name !== item.file.name) fileData.name = itemData.name;
    if ('alt_text' in data) fileData.alternativeText = text(data.alt_text, 255) || null;
    if ('caption' in data) fileData.caption = text(data.caption, 500) || null;
    if ('credit' in data) fileData.credit = text(data.credit, 200) || null;

    if (Object.keys(fileData).length) await strapi.db.query('plugin::upload.file').update({ where: { id: item.file.id }, data: fileData });
    const updated = Object.keys(itemData).length
      ? await strapi.documents(UID).update({ documentId: item.documentId, data: itemData, populate: ['file'] } as any)
      : await strapi.documents(UID).findOne({ documentId: item.documentId, populate: ['file'] });

    // Texte du fichier modifié et fichier utilisé : les pages qui l'affichent changent
    if (Object.keys(fileData).length && item.site?.documentId) {
      const usages = await mediaUsage(strapi, item.file.id);
      if (usages.length) {
        await recordPendingChange({ uid: UID, documentId: item.documentId, siteDocumentId: item.site.documentId, action: 'update', entry: { title: `Fichier « ${updated.name} »` } });
        await autoDeployService.scheduleDeployIfEnabled(item.site.documentId);
      }
    }
    ctx.body = { data: updated };
  },

  /** Suppression : refusée tant que le fichier est utilisé ; le fichier est supprimé avec sa fiche */
  async delete(ctx: any) {
    const item: any = await findItem(strapi, ctx.params.id);
    if (!item) return ctx.notFound();
    if (item.file) {
      const usages = await mediaUsage(strapi, item.file.id);
      if (usages.length) {
        ctx.status = 409;
        ctx.body = {
          error: {
            status: 409,
            name: 'ConflictError',
            message: `Ce fichier est utilisé dans ${usages.length} contenu${usages.length > 1 ? 's' : ''} : retirez-le d'abord.`,
            details: { usages },
          },
        };
        return;
      }
    }
    await strapi.documents(UID).delete({ documentId: item.documentId });
    if (item.file) await strapi.plugin('upload').service('upload').remove(item.file);
    ctx.status = 204;
  },

  /**
   * Dossiers et compteurs de la commune : tous les fichiers, sans texte alternatif, par dossier.
   * GET /api/media-items/folders
   */
  async folders(ctx: any) {
    const site = await getEffectiveSite(ctx);
    if (!site) return ctx.forbidden('Aucun site associé à votre compte');
    const items: any[] = await strapi.db.query(UID).findMany({
      where: { site: { documentId: site.documentId } },
      select: ['folder'],
      populate: { file: { select: ['id', 'mime', 'alternativeText', 'size'] } },
    });
    const counts = new Map<string, number>();
    let missingAlt = 0;
    let bytes = 0;
    for (const item of items) {
      if (item.folder) counts.set(item.folder, (counts.get(item.folder) ?? 0) + 1);
      if (item.file?.mime?.startsWith('image/') && !item.file.alternativeText?.trim()) missingAlt += 1;
      bytes += (item.file?.size ?? 0) * 1024;
    }
    ctx.body = {
      data: {
        total: items.length,
        bytes: Math.round(bytes),
        missingAlt,
        folders: [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      },
    };
  },

  /**
   * Contenus qui utilisent un fichier de la commune : GET /api/media-items/usage?file=<id>
   */
  async usage(ctx: any) {
    const site = await getEffectiveSite(ctx);
    if (!site) return ctx.forbidden('Aucun site associé à votre compte');
    const fileId = Number(ctx.query.file);
    if (!Number.isInteger(fileId) || fileId <= 0) return ctx.badRequest('Fichier manquant');
    const owned = await strapi.db.query(UID).findOne({ where: { file: { id: fileId }, site: { documentId: site.documentId } } });
    if (!owned) return ctx.notFound();
    ctx.body = { data: await mediaUsage(strapi, fileId) };
  },
}));

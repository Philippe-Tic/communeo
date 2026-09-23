import { factories } from '@strapi/strapi';
import { getEffectiveSite } from '../../../utils/getEffectiveSite';
import { log } from '../../../utils/logger';

/** Formats acceptés dans la médiathèque : images, PDF, bureautique (Word, Excel, OpenDocument) */
export const ALLOWED_MEDIA_TYPES: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/svg+xml': 'SVG',
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.oasis.opendocument.text': 'OpenDocument',
  'application/vnd.oasis.opendocument.spreadsheet': 'OpenDocument',
};
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

export default factories.createCoreController('api::media-item.media-item' as any, ({ strapi }) => ({
  /**
   * Custom upload endpoint: receives file + metadata, uploads via Strapi upload plugin,
   * then creates a media-item linked to the authenticated user's site.
   *
   * POST /api/media-items/upload
   * Content-Type: multipart/form-data
   * Body: files (file), name, alt_text?, caption?, folder?
   */
  async upload(ctx: any) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    // Commune de l'utilisateur, ou celle consultée par un super admin
    const userSite = await getEffectiveSite(ctx);

    if (!userSite) {
      return ctx.forbidden('Aucun site associé à votre compte');
    }

    // Get uploaded file from multipart request
    const files = ctx.request.files;
    const uploadedFile = files?.files || files?.file;

    if (!uploadedFile || Array.isArray(uploadedFile)) {
      return ctx.badRequest(uploadedFile ? 'Un seul fichier à la fois' : 'Aucun fichier fourni');
    }
    const mime = (uploadedFile as any).mimetype ?? (uploadedFile as any).type;
    if (!ALLOWED_MEDIA_TYPES[mime]) {
      return ctx.badRequest('Format non accepté : images (JPG, PNG, WebP, SVG), PDF, Word, Excel ou OpenDocument.');
    }
    if ((uploadedFile as any).size > MAX_MEDIA_BYTES) {
      return ctx.badRequest('Fichier trop lourd : 20 Mo au maximum.');
    }

    const body = ctx.request.body;
    const name = body.name || (uploadedFile as any).name || 'Sans nom';
    const alt_text = body.alt_text || '';
    const caption = body.caption || '';
    const folder = body.folder || 'general';

    try {
      // Upload file via Strapi upload plugin
      const uploadService = strapi.plugin('upload').service('upload');
      const uploadedFiles = await uploadService.upload({
        data: {},
        files: uploadedFile,
      });

      const strapiFile = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;

      if (!strapiFile) {
        return ctx.badRequest('Échec de l\'upload du fichier');
      }

      // Create media-item linked to the user's site
      const mediaItem = await strapi.documents('api::media-item.media-item' as any).create({
        data: {
          name: name.trim(),
          alt_text: alt_text.trim(),
          caption: caption.trim(),
          folder: folder.trim(),
          file: strapiFile.id,
          site: userSite.documentId,
        },
        populate: ['file', 'site'],
      } as any);

      ctx.status = 201;
      return { data: mediaItem };
    } catch (error) {
      log.error('Media upload error:', error);
      return ctx.internalServerError('Erreur lors de l\'upload du média');
    }
  },
}));

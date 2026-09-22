import { factories } from '@strapi/strapi';
import { log } from '../../../utils/logger';

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

    // Ensure we have the user's site
    let userSite = user.site;
    if (!userSite) {
      const completeUser = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: user.id }, populate: ['site'] });
      userSite = (completeUser as any)?.site;
    }

    if (!userSite) {
      return ctx.forbidden('Aucun site associé à votre compte');
    }

    // Get uploaded file from multipart request
    const files = ctx.request.files;
    const uploadedFile = files?.files || files?.file;

    if (!uploadedFile) {
      return ctx.badRequest('Aucun fichier fourni');
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

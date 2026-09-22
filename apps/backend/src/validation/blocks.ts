/**
 * Validation des blocs de contenu (dynamic zone `blocks`) avec les schémas partagés de @communeo/core.
 *
 * - À chaque enregistrement : structure (nœuds de texte autorisés, limites hautes), brouillons compris.
 * - À la publication : complétude (champs obligatoires, minimums, texte alternatif des images).
 */
import { errors } from '@strapi/utils';
import { validateBlocks, type ValidationMode } from '@communeo/core';

export const BLOCKS_CONTENT_TYPES = ['api::page.page', 'api::article.article', 'api::evenement.evenement'];

const DRAFT_POPULATE = { blocks: { populate: '*' } };

/**
 * À la publication, remplace les références d'images (ids) par les fichiers de la médiathèque,
 * pour que le texte alternatif soit vérifié même quand les blocs arrivent avec de simples ids.
 */
async function withResolvedImages(strapi: any, blocks: unknown): Promise<unknown> {
  if (!Array.isArray(blocks)) return blocks;
  const isRef = (value: unknown) => typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
  const refId = (value: unknown) => (typeof value === 'object' && value !== null ? (value as any).id : Number(value));

  const ids = new Set<number>();
  for (const block of blocks as any[]) {
    if (block?.__component === 'blocks.image' && (isRef(block.image) || block.image?.id)) ids.add(refId(block.image));
    if (block?.__component === 'blocks.gallery' && Array.isArray(block.images)) {
      for (const image of block.images) if (isRef(image) || image?.id) ids.add(refId(image));
    }
  }
  if (!ids.size) return blocks;

  const files = await strapi.db.query('plugin::upload.file').findMany({
    where: { id: { $in: [...ids] } },
    select: ['id', 'alternativeText', 'mime'],
  });
  const byId = new Map(files.map((file: any) => [file.id, file]));
  const resolve = (value: unknown) => byId.get(refId(value)) ?? value;

  return (blocks as any[]).map((block) => {
    if (block?.__component === 'blocks.image' && block.image) return { ...block, image: resolve(block.image) };
    if (block?.__component === 'blocks.gallery' && Array.isArray(block.images)) {
      return { ...block, images: block.images.map(resolve) };
    }
    return block;
  });
}

function assertValid(blocks: unknown, mode: ValidationMode) {
  const result = validateBlocks(blocks, mode);
  if (result.success) return;

  const count = result.issues.length;
  const message =
    mode === 'publish'
      ? `${count} erreur${count > 1 ? 's' : ''} empêche${count > 1 ? 'nt' : ''} la publication`
      : `${count} erreur${count > 1 ? 's' : ''} dans les blocs`;

  throw new errors.ValidationError(message, {
    errors: result.issues.map((issue) => ({
      path: ['blocks', issue.index, ...issue.path].filter((part) => part !== -1),
      message: issue.message,
      name: 'ValidationError',
      component: issue.component,
    })),
  });
}

export const blocksValidationMiddleware = (strapi: any) => async (ctx: any, next: () => Promise<any>) => {
  if (!BLOCKS_CONTENT_TYPES.includes(ctx.uid)) return next();

  const publishing = ctx.params?.status === 'published';

  if (ctx.action === 'create' || ctx.action === 'update') {
    let blocks = ctx.params?.data?.blocks;
    // Mise à jour + publication sans envoyer les blocs : on valide ceux du brouillon existant
    if (blocks === undefined && publishing && ctx.action === 'update') {
      const draft = await strapi.documents(ctx.uid).findOne({
        documentId: ctx.params.documentId,
        status: 'draft',
        populate: DRAFT_POPULATE,
      });
      blocks = draft?.blocks;
    }
    if (blocks !== undefined) {
      assertValid(publishing ? await withResolvedImages(strapi, blocks) : blocks, publishing ? 'publish' : 'draft');
    }
  }

  if (ctx.action === 'publish') {
    const draft = await strapi.documents(ctx.uid).findOne({
      documentId: ctx.params.documentId,
      status: 'draft',
      populate: DRAFT_POPULATE,
    });
    assertValid(draft?.blocks ?? [], 'publish');
  }

  return next();
};

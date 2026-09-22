import type { Article } from '../generated/strapi';
import { CALLOUT_LABELS } from './labels';
import type { MapContext } from './context';
import { mapEmail, mapFile, mapImage, mapLink, mapPhone } from './media';
import { AnchorRegistry, mapRichText } from './rich-text';
import type { BlockVM, ImageVM, TocEntryVM, VideoProvider } from './types';

type StrapiBlock = NonNullable<Article['blocks']>[number];

const VIDEO_PROVIDERS: Array<{ provider: VideoProvider; label: string; match: RegExp; embed: (id: string) => string; watch: (id: string) => string }> = [
  {
    provider: 'youtube',
    label: 'YouTube',
    match: /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i,
    embed: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
    watch: (id) => `https://www.youtube.com/watch?v=${id}`,
  },
  {
    provider: 'dailymotion',
    label: 'Dailymotion',
    match: /(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-z0-9]+)/i,
    embed: (id) => `https://www.dailymotion.com/embed/video/${id}`,
    watch: (id) => `https://www.dailymotion.com/video/${id}`,
  },
  {
    provider: 'vimeo',
    label: 'Vimeo',
    match: /vimeo\.com\/(?:video\/)?(\d+)/i,
    embed: (id) => `https://player.vimeo.com/video/${id}?dnt=1`,
    watch: (id) => `https://vimeo.com/${id}`,
  },
];

export function parseVideoUrl(url: string) {
  for (const provider of VIDEO_PROVIDERS) {
    const id = url.match(provider.match)?.[1];
    if (id) return { provider: provider.provider, providerLabel: provider.label, embedUrl: provider.embed(id), watchUrl: provider.watch(id) };
  }
  return null;
}

const images = (ctx: MapContext, list: Parameters<typeof mapImage>[1][] | undefined) =>
  (list ?? []).map((media) => mapImage(ctx, media)).filter((image): image is ImageVM => image !== null);

/**
 * Convertit les blocs d'un contenu. Les blocs incomplets (brouillon, fichier supprimé) sont ignorés
 * plutôt que rendus à moitié. Retourne aussi le sommaire construit à partir des titres.
 */
export function mapBlocks(ctx: MapContext, blocks: StrapiBlock[] | undefined, anchors = new AnchorRegistry()): { blocks: BlockVM[]; toc: TocEntryVM[] } {
  const result: BlockVM[] = [];

  (blocks ?? []).forEach((block, index) => {
    const id = `bloc-${index + 1}`;
    switch (block.__component) {
      case 'blocks.text': {
        const body = mapRichText(block.body, anchors);
        if (body) result.push({ type: 'text', id, body });
        break;
      }
      case 'blocks.image': {
        const image = mapImage(ctx, block.image, { caption: block.caption });
        if (image) result.push({ type: 'image', id, image, width: block.width === 'full' ? 'full' : 'normal' });
        break;
      }
      case 'blocks.buttons': {
        const buttons = (block.buttons ?? []).flatMap((button) => {
          const link = mapLink(ctx, button.label, button.url);
          return link ? [{ ...link, style: button.style === 'secondary' ? ('secondary' as const) : ('primary' as const) }] : [];
        });
        if (buttons.length) result.push({ type: 'buttons', id, buttons });
        break;
      }
      case 'blocks.callout': {
        const body = mapRichText(block.body, anchors, { toc: false });
        const variant = block.variant ?? 'info';
        if (body) result.push({ type: 'callout', id, variant, variantLabel: CALLOUT_LABELS[variant], title: block.title?.trim() || null, body });
        break;
      }
      case 'blocks.documents': {
        const files = (block.files ?? []).map((file) => mapFile(ctx, file)).filter((file) => file !== null);
        if (files.length) result.push({ type: 'documents', id, title: block.title?.trim() || null, files });
        break;
      }
      case 'blocks.gallery': {
        const list = images(ctx, block.images);
        if (list.length) result.push({ type: 'gallery', id, title: block.title?.trim() || null, images: list });
        break;
      }
      case 'blocks.faq': {
        const items = (block.items ?? []).flatMap((item, itemIndex) => {
          const answer = mapRichText(item.answer, anchors, { toc: false });
          return item.question?.trim() && answer ? [{ id: `${id}-q${itemIndex + 1}`, question: item.question.trim(), answer }] : [];
        });
        if (items.length) result.push({ type: 'faq', id, title: block.title?.trim() || null, items });
        break;
      }
      case 'blocks.contact': {
        if (!block.name?.trim()) break;
        const address = block.address?.trim() || null;
        result.push({
          type: 'contact',
          id,
          name: block.name.trim(),
          address,
          phone: mapPhone(block.phone),
          email: mapEmail(block.email),
          hours: block.hours?.trim() || null,
          map: block.show_map && address ? { query: address } : null,
        });
        break;
      }
      case 'blocks.video': {
        const video = block.url ? parseVideoUrl(block.url) : null;
        if (video && block.title?.trim()) {
          result.push({ type: 'video', id, title: block.title.trim(), ...video, transcript: block.transcript?.trim() || null });
        }
        break;
      }
    }
  });

  return { blocks: result, toc: anchors.toc };
}

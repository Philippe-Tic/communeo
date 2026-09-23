import type { Media } from '../generated/strapi';
import { formatFileLabel, formatFileSize, formatFileType } from '../format';
import type { MapContext } from './context';
import type { ContactPointVM, FileVM, ImageVM, LinkVM } from './types';

const mediaSrc = (ctx: MapContext, url: string) => (/^https?:\/\//.test(url) ? url : `${ctx.mediaUrl}${url}`);

export function mapImage(ctx: MapContext, media: Media | null | undefined, options: { caption?: string | null } = {}): ImageVM | null {
  if (!media?.url) return null;
  const formats = Object.values(media.formats ?? {})
    .filter((format) => format?.url && format.width)
    .sort((a, b) => a.width - b.width);
  const srcset = formats.length
    ? [...formats.map((f) => `${mediaSrc(ctx, f.url)} ${f.width}w`), ...(media.width ? [`${mediaSrc(ctx, media.url)} ${media.width}w`] : [])].join(', ')
    : null;
  return {
    src: mediaSrc(ctx, media.url),
    alt: media.alternativeText?.trim() ?? '',
    width: media.width ?? null,
    height: media.height ?? null,
    srcset,
    caption: options.caption?.trim() || media.caption?.trim() || null,
    credit: media.credit?.trim() || null,
  };
}

export function mapFile(ctx: MapContext, media: Media | null | undefined): FileVM | null {
  if (!media?.url) return null;
  return {
    name: media.caption?.trim() || media.name.replace(/\.[^.]+$/, ''),
    href: mediaSrc(ctx, media.url),
    type: formatFileType(media.ext),
    size: formatFileSize(media.size),
    label: formatFileLabel(media.ext, media.size),
  };
}

export function mapLink(ctx: MapContext, label: string | null | undefined, url: string | null | undefined): LinkVM | null {
  if (!label?.trim() || !url?.trim()) return null;
  const href = url.trim();
  const external = /^https?:\/\//i.test(href) && !href.startsWith(ctx.siteUrl);
  return { label: label.trim(), href, external };
}

/** 02 41 00 00 00 → tel:+33241000000 */
export function mapPhone(phone: string | null | undefined): ContactPointVM | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  const international = /^0\d{9}$/.test(digits) ? `+33${digits.slice(1)}` : digits;
  return { label: phone.trim(), href: `tel:${international}` };
}

export function mapEmail(email: string | null | undefined): ContactPointVM | null {
  if (!email?.trim()) return null;
  return { label: email.trim(), href: `mailto:${email.trim()}` };
}

import type { Article, Association, Evenement, OfficialDocument, Page, TeamMember } from '../generated/strapi';
import { formatDate, formatEventPeriod, isMultiDay } from '../format';
import { slugify } from '../site/slug';
import { SECTIONS } from '../site/navigation';
import { mapBlocks } from './blocks';
import { blocksExcerpt, describe, mairieOf } from './seo';
import { absoluteUrl, type MapContext } from './context';
import {
  ARTICLE_CATEGORY_LABELS,
  ASSOCIATION_CATEGORY_LABELS,
  DOCUMENT_TYPE_LABELS,
  EVENT_CATEGORY_LABELS,
  TEAM_GROUPS,
  TEAM_ROLE_TITLES,
} from './labels';
import { mapEmail, mapFile, mapImage, mapLink, mapPhone } from './media';
import type {
  ArticleCardVM,
  ArticleVM,
  AssociationCardVM,
  AssociationVM,
  DateVM,
  DocumentVM,
  EventCardVM,
  EventVM,
  FileVM,
  ImageVM,
  LinkVM,
  PageVM,
  SeoVM,
  TeamMemberVM,
  TeamVM,
} from './types';

export const dateVM = (iso: string): DateVM => ({ iso, label: formatDate(iso) });
const text = (value: string | null | undefined) => value?.trim() || null;
const HOME: LinkVM = { label: 'Accueil', href: '/', external: false };

export function breadcrumb(...items: Array<{ label: string; href: string }>): LinkVM[] {
  return [HOME, ...items.map((item) => ({ ...item, external: false }))];
}

/** La mairie, éditrice du site (données structurées) */
const publisher = (ctx: MapContext) => ({ '@type': 'GovernmentOrganization', name: ctx.siteName ? mairieOf(ctx.siteName) : 'Mairie', url: ctx.siteUrl });

export function seo(
  ctx: MapContext,
  options: { title: string; description?: string | null; path: string; image?: ImageVM | null; jsonLd?: Record<string, unknown>[]; noindex?: boolean; type?: SeoVM['type'] },
): SeoVM {
  return {
    title: options.title,
    type: options.type ?? 'website',
    description: describe(options.description),
    canonical: absoluteUrl(ctx, options.path),
    image: options.image ?? null,
    jsonLd: options.jsonLd ?? [],
    noindex: options.noindex ?? false,
  };
}

// --- Pages ---------------------------------------------------------------------------------------

export function mapPage(ctx: MapContext, page: Page): PageVM {
  const href = `/${page.slug}`;
  const { blocks, toc } = mapBlocks(ctx, page.blocks);
  const image = mapImage(ctx, page.featured_image);
  const trail = breadcrumb({ label: page.title, href });
  return {
    id: page.documentId,
    title: page.title,
    href,
    lead: text(page.lead),
    image,
    blocks,
    toc,
    updatedAt: dateVM(page.updatedAt),
    breadcrumb: trail,
    // Le fil d'Ariane des données structurées est ajouté par le document, pour toutes les pages
    seo: seo(ctx, { title: page.title, description: describe(page.meta_description, page.lead, blocksExcerpt(blocks)), path: href, image }),
  };
}

// --- Actualités ----------------------------------------------------------------------------------

/**
 * Date affichée d'un article : sa date de publication (remplie par Strapi à la première publication).
 * Un brouillon jamais publié (preview) prend la date qu'il aura s'il est publié maintenant.
 */
const articleDate = (ctx: MapContext, article: Article) =>
  article.publication_date ?? article.publishedAt ?? ctx.now ?? article.createdAt;

export function mapArticleCard(ctx: MapContext, article: Article): ArticleCardVM {
  return {
    id: article.documentId,
    title: article.title,
    href: `${SECTIONS.actualites.path}/${article.slug}`,
    summary: text(article.summary),
    image: mapImage(ctx, article.image),
    date: dateVM(articleDate(ctx, article)),
    category: { key: article.category, label: ARTICLE_CATEGORY_LABELS[article.category] },
    featured: !!article.featured,
  };
}

export function mapArticle(ctx: MapContext, article: Article, related: Article[] = []): ArticleVM {
  const card = mapArticleCard(ctx, article);
  const { blocks, toc } = mapBlocks(ctx, article.blocks);
  const trail = breadcrumb({ label: SECTIONS.actualites.label, href: SECTIONS.actualites.path }, { label: article.title, href: card.href });
  return {
    ...card,
    author: text(article.author),
    blocks,
    toc,
    breadcrumb: trail,
    related: related.filter((other) => other.documentId !== article.documentId).map((other) => mapArticleCard(ctx, other)),
    seo: seo(ctx, {
      title: article.title,
      description: describe(article.meta_description, article.summary, blocksExcerpt(blocks)),
      path: card.href,
      image: card.image,
      type: 'article',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: article.title,
          datePublished: card.date.iso,
          dateModified: article.updatedAt,
          ...(card.image ? { image: card.image.src } : {}),
          // Sans auteur nommé, la mairie signe l'article
          author: article.author ? { '@type': 'Person', name: article.author } : publisher(ctx),
          publisher: publisher(ctx),
          mainEntityOfPage: absoluteUrl(ctx, card.href),
        },
      ],
    }),
  };
}

// --- Agenda --------------------------------------------------------------------------------------

export function mapEventCard(ctx: MapContext, event: Evenement): EventCardVM {
  return {
    id: event.documentId,
    title: event.title,
    href: `${SECTIONS.agenda.path}/${event.slug}`,
    image: mapImage(ctx, event.image),
    category: { key: event.category, label: EVENT_CATEGORY_LABELS[event.category] ?? event.category },
    start: dateVM(event.start_date),
    end: event.end_date ? dateVM(event.end_date) : null,
    period: formatEventPeriod(event.start_date, event.end_date),
    multiDay: isMultiDay(event.start_date, event.end_date),
    location: text(event.location),
    featured: !!event.featured,
  };
}

/** Tarif lisible : « Free » (valeur V1) ou vide → « Gratuit ». */
const formatPrice = (price: string | null) => (!price?.trim() || /^(free|gratuit|0 ?€?)$/i.test(price.trim()) ? 'Gratuit' : price.trim());

export function mapEvent(ctx: MapContext, event: Evenement): EventVM {
  const card = mapEventCard(ctx, event);
  const { blocks, toc } = mapBlocks(ctx, event.blocks);
  const trail = breadcrumb({ label: SECTIONS.agenda.label, href: SECTIONS.agenda.path }, { label: event.title, href: card.href });
  const address = text(event.address);
  return {
    ...card,
    address,
    price: formatPrice(event.price),
    organizer: text(event.organizer),
    contact: { email: mapEmail(event.contact_email), phone: mapPhone(event.contact_phone) },
    externalLink: mapLink(ctx, 'Site de l’organisateur', event.external_link),
    registration:
      event.registration_required || event.max_participants
        ? {
            required: !!event.registration_required,
            deadline: event.registration_deadline ? dateVM(event.registration_deadline) : null,
            places: event.max_participants ?? null,
          }
        : null,
    icsHref: `${card.href}.ics`,
    blocks,
    toc,
    breadcrumb: trail,
    seo: seo(ctx, {
      title: event.title,
      // « Samedi 3 octobre, de 14 h à 18 h · Salle des fêtes. » puis le début du contenu
      description: describe(`${[card.period, card.location].filter(Boolean).join(' · ')}. ${blocksExcerpt(blocks, 120) ?? ''}`),
      path: card.href,
      image: card.image,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.title,
          startDate: event.start_date,
          ...(event.end_date ? { endDate: event.end_date } : {}),
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          eventStatus: 'https://schema.org/EventScheduled',
          ...(card.location || address
            ? { location: { '@type': 'Place', name: card.location ?? address, ...(address ? { address } : {}) } }
            : {}),
          ...(card.image ? { image: card.image.src } : {}),
          isAccessibleForFree: formatPrice(event.price) === 'Gratuit',
          organizer: event.organizer ? { '@type': 'Organization', name: event.organizer } : publisher(ctx),
        },
      ],
    }),
  };
}

// --- Documents officiels -------------------------------------------------------------------------

export function mapDocument(ctx: MapContext, doc: OfficialDocument): DocumentVM {
  return {
    id: doc.documentId,
    title: doc.title,
    href: `${SECTIONS.documents.path}/${doc.slug}`,
    type: { key: doc.document_type, label: DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type },
    date: dateVM(doc.document_date),
    sessionDate: doc.session_date ? dateVM(doc.session_date) : null,
    reference: text(doc.reference_number),
    year: doc.year,
    description: text(doc.description),
    file: mapFile(ctx, doc.file),
    attachments: (doc.additional_files ?? []).map((file) => mapFile(ctx, file)).filter((file): file is FileVM => file !== null),
  };
}

// --- Équipe municipale ---------------------------------------------------------------------------

export function mapTeamMember(ctx: MapContext, member: TeamMember): TeamMemberVM {
  const firstName = member.first_name.trim();
  const lastName = member.last_name.trim();
  return {
    id: member.documentId,
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    title: text(member.title) ?? TEAM_ROLE_TITLES[member.role] ?? member.role,
    delegation: text(member.delegation),
    bio: text(member.bio),
    photo: mapImage(ctx, member.photo),
    initials: `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase(),
    email: mapEmail(member.email),
    officeHours: text(member.office_hours),
  };
}

export function mapTeam(ctx: MapContext, members: TeamMember[]): TeamVM {
  const sorted = [...members].sort(
    (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999) || a.last_name.localeCompare(b.last_name, 'fr'),
  );
  const groups = TEAM_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    members: sorted.filter((member) => (group.roles as readonly string[]).includes(member.role)).map((member) => mapTeamMember(ctx, member)),
  })).filter((group) => group.members.length > 0);
  return { groups, total: groups.reduce((sum, group) => sum + group.members.length, 0) };
}

// --- Associations --------------------------------------------------------------------------------

/** Adresse d'une association : son nom en slug, suffixé si deux associations portent le même nom. */
export function associationSlugs(associations: Pick<Association, 'documentId' | 'name'>[]): Map<string, string> {
  const used = new Set<string>();
  const slugs = new Map<string, string>();
  for (const association of [...associations].sort((a, b) => a.documentId.localeCompare(b.documentId))) {
    const base = slugify(association.name) || 'association';
    let slug = base;
    for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;
    used.add(slug);
    slugs.set(association.documentId, slug);
  }
  return slugs;
}

const summarize = (value: string | null, max = 180) => {
  const clean = text(value);
  if (!clean || clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(' ', max))}…`;
};

export function mapAssociationCard(ctx: MapContext, association: Association, slug: string): AssociationCardVM {
  return {
    id: association.documentId,
    name: association.name,
    href: `${SECTIONS.associations.path}/${slug}`,
    category: { key: association.category, label: ASSOCIATION_CATEGORY_LABELS[association.category] ?? association.category },
    summary: summarize(association.description),
    logo: mapImage(ctx, association.logo),
  };
}

export function mapAssociation(ctx: MapContext, association: Association, slug: string): AssociationVM {
  const card = mapAssociationCard(ctx, association, slug);
  const trail = breadcrumb({ label: SECTIONS.associations.label, href: SECTIONS.associations.path }, { label: association.name, href: card.href });
  return {
    ...card,
    description: text(association.description),
    contact: { name: text(association.contact_name), email: mapEmail(association.contact_email), phone: mapPhone(association.contact_phone) },
    website: mapLink(ctx, 'Site de l’association', association.website),
    address: text(association.address),
    breadcrumb: trail,
    seo: seo(ctx, { title: association.name, description: card.summary, path: card.href, image: card.logo }),
  };
}

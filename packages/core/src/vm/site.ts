import type { Page, Site } from '../generated/strapi';
import { navigationConfigSchema, SECTIONS } from '../site/navigation';
import { openingHoursSchema, summarizeWeek } from '../site/opening-hours';
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from '../site/themes';
import type { MapContext } from './context';
import { ACCESSIBILITY_LEVEL_LABELS, LEGAL_PAGES } from './labels';
import { mapEmail, mapImage, mapPhone } from './media';
import { AnchorRegistry, mapRichText } from './rich-text';
import type { LinkVM, NavItemVM, NavVM, SiteVM } from './types';

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  autre: 'Réseau social',
};

const text = (value: string | null | undefined) => value?.trim() || null;

export function mapSite(ctx: MapContext, site: Site): SiteVM {
  const info = site.infos_pratiques;
  const hours = openingHoursSchema.safeParse(info?.opening_hours);
  const legal = site.mentions_legales;
  const rgpd = site.rgpd;
  const accessibility = site.accessibilite;
  const level = accessibility?.accessibility_level ?? 'non-conforme';
  // Chaque texte légal est une page à part : ses ancres sont indépendantes
  const richText = (value: unknown) => mapRichText(value, new AnchorRegistry());

  return {
    id: site.documentId,
    name: site.name,
    slug: site.slug,
    theme: (THEME_IDS as string[]).includes(site.theme) ? (site.theme as ThemeId) : DEFAULT_THEME,
    url: ctx.siteUrl,
    logo: mapImage(ctx, site.logo),
    favicon: mapImage(ctx, site.favicon),
    population: info?.population ?? null,
    contact: {
      email: mapEmail(site.contact_mail) ?? { label: site.contact_mail, href: `mailto:${site.contact_mail}` },
      phone: mapPhone(site.contact_phone),
      address: text(site.address),
      coordinates: info?.latitude != null && info?.longitude != null ? { lat: info.latitude, lng: info.longitude } : null,
      hours: hours.success ? hours.data : null,
      hoursSummary: hours.success ? summarizeWeek(hours.data) : [],
      formIntro: text(info?.contact_form_intro),
    },
    social: (site.social_links ?? [])
      .filter((link) => link.url?.trim())
      .map((link) => ({
        platform: link.platform,
        label: text(link.label) ?? SOCIAL_LABELS[link.platform] ?? link.platform,
        href: link.url.trim(),
        external: true,
      })),
    legal: {
      siret: text(legal?.siret),
      publicationDirector: text(legal?.publication_director)
        ? { name: legal!.publication_director!.trim(), title: text(legal?.publication_director_title) }
        : null,
      host: text(legal?.hebergeur_name)
        ? { name: legal!.hebergeur_name!.trim(), address: text(legal?.hebergeur_address), phone: text(legal?.hebergeur_phone) }
        : null,
      credits: richText(legal?.credits),
      extra: richText(legal?.mentions_legales_extra),
      privacyPolicy: richText(rgpd?.rgpd_policy),
      dpo:
        rgpd && (rgpd.dpo_name || rgpd.dpo_email || rgpd.dpo_phone)
          ? { name: text(rgpd.dpo_name), email: mapEmail(rgpd.dpo_email), phone: mapPhone(rgpd.dpo_phone) }
          : null,
      accessibility: {
        level,
        levelLabel: ACCESSIBILITY_LEVEL_LABELS[level],
        declaration: richText(accessibility?.accessibility_declaration),
        schemaUrl: text(accessibility?.accessibility_schema_url),
        actionPlanUrl: text(accessibility?.accessibility_action_plan_url),
      },
    },
    services: {
      demarches: {
        enabled: !!site.comarquage_enabled && !!site.code_insee,
        inseeCode: text(site.code_insee),
        audiences: Array.isArray(site.comarquage_audiences) ? (site.comarquage_audiences as string[]) : ['particuliers'],
      },
      openData: { enabled: !!site.open_data_enabled && !!site.open_data_url, url: text(site.open_data_url) },
    },
  };
}

/**
 * Menus : liens vers des pages publiées, des rubriques du site ou des sites externes.
 * Une entrée vers une page non publiée (ou supprimée) est ignorée.
 */
export function mapNavigation(ctx: MapContext, site: Site, pages: Pick<Page, 'documentId' | 'title' | 'slug'>[]): NavVM {
  const config = navigationConfigSchema.safeParse(site.navigation_config ?? {});
  const pagesById = new Map(pages.map((page) => [page.documentId, page]));

  const link = (item: { type: string; label?: string | null; pageDocumentId?: string; section?: keyof typeof SECTIONS; url?: string }): LinkVM | null => {
    if (item.type === 'page') {
      const page = pagesById.get(item.pageDocumentId!);
      return page ? { label: item.label?.trim() || page.title, href: `/${page.slug}`, external: false } : null;
    }
    if (item.type === 'section') {
      const section = SECTIONS[item.section!];
      if (item.section === 'demarches' && !site.comarquage_enabled) return null;
      if (item.section === 'open-data' && !site.open_data_enabled) return null;
      return { label: item.label?.trim() || section.label, href: section.path, external: false };
    }
    return item.url ? { label: item.label!.trim(), href: item.url, external: !item.url.startsWith(ctx.siteUrl) } : null;
  };

  const main: NavItemVM[] = [];
  const footer: LinkVM[] = [];
  if (config.success) {
    for (const item of config.data.main) {
      if (item.type === 'group') {
        const children = item.children.map(link).filter((child): child is LinkVM => child !== null);
        if (children.length) main.push({ kind: 'group', label: item.label, children });
      } else {
        const resolved = link(item);
        if (resolved) main.push({ kind: 'link', ...resolved });
      }
    }
    for (const item of config.data.footer) {
      const resolved = link(item);
      if (resolved) footer.push(resolved);
    }
  }

  // Menu par défaut si la commune n'a rien configuré : accueil et rubriques principales
  if (!main.length) {
    main.push(
      { kind: 'link', label: 'Actualités', href: SECTIONS.actualites.path, external: false },
      { kind: 'link', label: 'Agenda', href: SECTIONS.agenda.path, external: false },
      { kind: 'link', label: 'Mairie', href: SECTIONS.equipe.path, external: false },
      { kind: 'link', label: 'Contact', href: SECTIONS.contact.path, external: false },
    );
  }

  const legal: LinkVM[] = [
    { label: LEGAL_PAGES.mentions.label, href: LEGAL_PAGES.mentions.path, external: false },
    { label: LEGAL_PAGES.privacy.label, href: LEGAL_PAGES.privacy.path, external: false },
    {
      label: `${LEGAL_PAGES.accessibility.label} : ${ACCESSIBILITY_LEVEL_LABELS[site.accessibilite?.accessibility_level ?? 'non-conforme'].toLowerCase()}`,
      href: LEGAL_PAGES.accessibility.path,
      external: false,
    },
    { label: LEGAL_PAGES.rights.label, href: LEGAL_PAGES.rights.path, external: false },
    { label: LEGAL_PAGES.cookies.label, href: LEGAL_PAGES.cookies.path, external: false },
    { label: LEGAL_PAGES.sitemap.label, href: LEGAL_PAGES.sitemap.path, external: false },
  ];

  return { main, footer, legal };
}

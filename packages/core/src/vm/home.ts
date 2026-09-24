import type { Alerte, Article, Association, Evenement, HomepageHomepage, SchoolMenu, Site, WasteSchedule } from '../generated/strapi';
import { isoDay } from '../format';
import type { MapContext } from './context';
import { associationSlugs, mapArticleCard, mapAssociationCard, mapEventCard, seo } from './content';
import { mapImage, mapLink } from './media';
import { isAlertVisible, mapAlert, mapCanteenWeek, mapWasteSchedules } from './practical';
import { AnchorRegistry, mapRichText } from './rich-text';
import type { HomeVM, PracticalVM } from './types';

export interface HomeData {
  articles: Article[];
  events: Evenement[];
  alerts: Alerte[];
  waste: WasteSchedule[];
  canteen: SchoolMenu[];
  associations: Association[];
}

const enabled = (section: { enabled?: boolean | null } | null | undefined) => !!section?.enabled;
const nonEmpty = <T>(list: T[]) => (list.length ? list : null);

/** Accès rapides, météo et prochaines collectes : sections d'accueil, reprises sur chaque page. */
export function mapPractical(ctx: MapContext, site: Site, waste: WasteSchedule[], now: Date): PracticalVM {
  const home: Partial<HomepageHomepage> = site.homepage ?? {};
  return {
    quickLinks: enabled(home.quick_links)
      ? nonEmpty(
          (home.quick_links!.items ?? []).flatMap((item) => {
            const link = mapLink(ctx, item.label, item.url);
            return link ? [{ ...link, description: item.description?.trim() || null, icon: item.icon ?? null }] : [];
          }),
        )
      : null,
    weather:
      enabled(home.weather) && site.infos_pratiques?.latitude != null && site.infos_pratiques?.longitude != null
        ? { lat: site.infos_pratiques.latitude, lng: site.infos_pratiques.longitude }
        : null,
    wasteCollection: enabled(home.waste_collection) ? nonEmpty(mapWasteSchedules(waste, now)) : null,
  };
}

/**
 * Accueil : chaque section vaut `null` si la commune l'a désactivée ou si elle n'a rien à montrer.
 * Le thème choisit ensuite l'ordre, la forme et l'emplacement des sections présentes.
 */
export function mapHome(ctx: MapContext, site: Site, data: HomeData, now: Date): HomeVM {
  const home: Partial<HomepageHomepage> = site.homepage ?? {};
  const anchors = new AnchorRegistry();

  const hero = home.hero;
  const mayor = home.mayor_word;
  const mayorBody = enabled(mayor) ? mapRichText(mayor!.body, anchors, { toc: false }) : null;
  const free = home.free_content;
  const freeBody = enabled(free) ? mapRichText(free!.body, anchors, { toc: false }) : null;

  // Actualités : les « à la une » d'abord, puis les plus récentes
  const articles = [...data.articles].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  const today = isoDay(now);
  const upcomingEvents = data.events.filter((event) => isoDay(event.end_date ?? event.start_date) >= today);
  const slugs = associationSlugs(data.associations);
  const practical = mapPractical(ctx, site, data.waste, now);
  const currentMenu = data.canteen
    .filter((menu) => menu.week_start <= today)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))[0];

  return {
    hero: enabled(hero)
      ? {
          title: hero!.title?.trim() || `Bienvenue à ${site.name}`,
          subtitle: hero!.subtitle?.trim() || null,
          image: mapImage(ctx, hero!.image),
          primary: mapLink(ctx, hero!.primary_label, hero!.primary_url),
          secondary: mapLink(ctx, hero!.secondary_label, hero!.secondary_url),
        }
      : null,
    quickLinks: practical.quickLinks,
    featuredNews: enabled(home.featured_news)
      ? nonEmpty(articles.slice(0, home.featured_news!.count ?? 3).map((article) => mapArticleCard(ctx, article)))
      : null,
    agenda: enabled(home.agenda) ? nonEmpty(upcomingEvents.slice(0, home.agenda!.count ?? 3).map((event) => mapEventCard(ctx, event))) : null,
    mayorWord: mayorBody
      ? {
          title: mayor!.title?.trim() || 'Le mot du maire',
          body: mayorBody,
          photo: mapImage(ctx, mayor!.photo),
          signature: { name: mayor!.signature_name?.trim() || null, role: mayor!.signature_role?.trim() || null },
        }
      : null,
    keyFigures: enabled(home.key_figures)
      ? nonEmpty((home.key_figures!.items ?? []).map((item) => ({ value: item.value, label: item.label, icon: item.icon ?? null })))
      : null,
    practicalInfo: enabled(home.practical_info),
    weather: practical.weather,
    wasteCollection: practical.wasteCollection,
    disruptions: enabled(home.disruptions)
      ? nonEmpty(data.alerts.filter((alert) => isAlertVisible(alert, now)).map((alert) => mapAlert(ctx, alert)))
      : null,
    canteen: enabled(home.canteen) && currentMenu ? mapCanteenWeek(ctx, currentMenu) : null,
    associations: enabled(home.associations)
      ? nonEmpty(
          data.associations
            .slice(0, home.associations!.count ?? 3)
            .map((association) => mapAssociationCard(ctx, association, slugs.get(association.documentId)!)),
        )
      : null,
    partners: enabled(home.partners)
      ? nonEmpty(
          (home.partners!.items ?? []).map((partner) => ({
            name: partner.name,
            logo: mapImage(ctx, partner.logo),
            href: partner.url?.trim() || null,
          })),
        )
      : null,
    newsletter: enabled(home.newsletter),
    freeContent: freeBody ? { title: free!.title?.trim() || null, body: freeBody } : null,
    seo: seo(ctx, {
      title: site.name,
      description: home.meta_description ?? (hero?.subtitle || null),
      path: '/',
      image: mapImage(ctx, hero?.image),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: site.name,
          url: ctx.siteUrl,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${ctx.siteUrl}/recherche?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    }),
  };
}

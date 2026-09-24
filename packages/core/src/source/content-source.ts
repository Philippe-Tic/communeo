import { isoDay } from '../format';
import type { MapContext } from '../vm/context';
import {
  associationSlugs,
  mapArticle,
  mapAssociation,
  mapDocument,
  mapEvent,
  mapPage,
  mapTeam,
} from '../vm/content';
import { mapHome, mapPractical } from '../vm/home';
import { isAlertVisible, mapAlert, mapCanteenWeek, mapWasteSchedules } from '../vm/practical';
import { mapNavigation, mapSite } from '../vm/site';
import type { ContentSource, RawLoader } from './types';

/** Mémorise chaque chargement : une seule requête par type de contenu pendant un build. */
function memo<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;
  return () => (promise ??= load());
}

export interface ContentSourceOptions {
  /** Instant de référence (alertes, prochaines collectes, événements à venir). Par défaut : maintenant. */
  now?: Date;
}

export function createContentSource(loader: RawLoader, baseCtx: MapContext, options: ContentSourceOptions = {}): ContentSource {
  const now = options.now ?? new Date();
  const ctx: MapContext = { ...baseCtx, now: baseCtx.now ?? now.toISOString() };
  const raw = {
    site: memo(() => loader.site()),
    pages: memo(() => loader.pages()),
    articles: memo(() => loader.articles()),
    events: memo(() => loader.events()),
    documents: memo(() => loader.documents()),
    team: memo(() => loader.team()),
    associations: memo(() => loader.associations()),
    alerts: memo(() => loader.alerts()),
    waste: memo(() => loader.waste()),
    canteen: memo(() => loader.canteen()),
  };

  const articles = memo(async () => {
    const list = await raw.articles();
    return list.map((article) => mapArticle(ctx, article, list.slice(0, 4)));
  });

  return {
    site: memo(async () => mapSite(ctx, await raw.site())),
    navigation: memo(async () => mapNavigation(ctx, await raw.site(), await raw.pages())),
    home: memo(async () => {
      const [site, articleList, events, alerts, waste, canteen, associations] = await Promise.all([
        raw.site(),
        raw.articles(),
        raw.events(),
        raw.alerts(),
        raw.waste(),
        raw.canteen(),
        raw.associations(),
      ]);
      return mapHome(ctx, site, { articles: articleList, events, alerts, waste, canteen, associations }, now);
    }),
    practical: memo(async () => mapPractical(ctx, await raw.site(), await raw.waste(), now)),
    pages: memo(async () => (await raw.pages()).map((page) => mapPage(ctx, page))),
    articles,
    events: memo(async () => (await raw.events()).map((event) => mapEvent(ctx, event))),
    documents: memo(async () => (await raw.documents()).map((doc) => mapDocument(ctx, doc))),
    team: memo(async () => mapTeam(ctx, await raw.team())),
    associations: memo(async () => {
      const list = await raw.associations();
      const slugs = associationSlugs(list);
      return list.map((association) => mapAssociation(ctx, association, slugs.get(association.documentId)!));
    }),
    alerts: memo(async () => (await raw.alerts()).filter((alert) => isAlertVisible(alert, now)).map((alert) => mapAlert(ctx, alert))),
    waste: memo(async () => mapWasteSchedules(await raw.waste(), now)),
    wasteNotes: memo(async () => (await raw.site()).waste_notes?.trim() || null),
    canteen: memo(async () => {
      // Semaine en cours (commencée il y a moins de 7 jours) et semaines à venir, dans l'ordre
      const weekAgo = isoDay(new Date(now.getTime() - 6 * 24 * 3600 * 1000));
      return (await raw.canteen())
        .filter((menu) => menu.week_start >= weekAgo)
        .sort((a, b) => a.week_start.localeCompare(b.week_start))
        .map((menu) => mapCanteenWeek(ctx, menu));
    }),
  };
}

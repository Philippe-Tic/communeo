import { describe, expect, it } from 'vitest';
import type { Article, Evenement, Media, Page, SchoolMenu, Site, TeamMember } from '../generated/strapi';
import { createContentSource } from '../source/content-source';
import type { RawLoader } from '../source/types';
import { mapBlocks, parseVideoUrl } from './blocks';
import { mapArticleCard, mapEvent, mapTeam } from './content';
import { wasteFrequencyLabel } from './labels';
import { mapCanteenWeek, nextCollections } from './practical';
import { mapNavigation, mapSite } from './site';

const ctx = { siteUrl: 'https://saint-aubin.example', mediaUrl: 'https://api.example' };
const base = { id: 1, documentId: 'doc', createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-02T08:00:00.000Z' };
const p = (text: string) => ({ type: 'paragraph' as const, content: [{ type: 'text' as const, text }] });
const h = (level: 2 | 3, text: string) => ({ type: 'heading' as const, attrs: { level }, content: [{ type: 'text' as const, text }] });

const media = (over: Partial<Media> = {}): Media => ({
  ...base,
  name: 'salle.jpg',
  alternativeText: 'La salle des fêtes',
  caption: null,
  width: 1600,
  height: 1067,
  formats: { small: { name: 's', hash: 'h', ext: '.jpg', mime: 'image/jpeg', width: 500, height: 333, size: 20, url: '/uploads/small_salle.jpg' } },
  hash: 'h',
  ext: '.jpg',
  mime: 'image/jpeg',
  size: 1234.5,
  url: '/uploads/salle.jpg',
  ...over,
});

const site = (over: Partial<Site> = {}): Site =>
  ({
    ...base,
    documentId: 'site-a',
    name: 'Saint-Aubin-sur-Loire',
    slug: 'saint-aubin',
    theme: 'institutionnel',
    contact_mail: 'contact@saint-aubin.example',
    contact_phone: '02 41 00 00 00',
    address: '1 place de la Mairie',
    navigation_config: null,
    accessibilite: { id: 1, accessibility_level: 'partiellement-conforme', accessibility_declaration: null, accessibility_schema_url: null, accessibility_action_plan_url: null },
    ...over,
  }) as Site;

describe('blocs', () => {
  it('convertit les 9 blocs, ignore les blocs incomplets et construit le sommaire', () => {
    const { blocks, toc } = mapBlocks(ctx, [
      { id: 1, __component: 'blocks.text', body: { type: 'doc', content: [h(2, 'Tarifs'), p('x'), h(3, 'Caution'), h(2, 'Tarifs')] } },
      { id: 2, __component: 'blocks.image', image: media(), caption: 'Vue de la scène', width: 'full' },
      { id: 3, __component: 'blocks.image', image: null, caption: null, width: null },
      { id: 4, __component: 'blocks.buttons', buttons: [{ id: 1, label: 'Réserver', url: 'https://resa.example', style: 'primary' }] },
      { id: 5, __component: 'blocks.callout', variant: 'warning', title: 'Caution', body: { type: 'doc', content: [p('500 €')] } },
      { id: 6, __component: 'blocks.documents', title: null, files: [media({ name: 'reglement.pdf', ext: '.pdf', mime: 'application/pdf', size: 240 })] },
      { id: 7, __component: 'blocks.gallery', title: null, images: [media(), media(), media()] },
      { id: 8, __component: 'blocks.faq', title: 'FAQ', items: [{ id: 1, question: 'Anniversaire ?', answer: { type: 'doc', content: [p('Oui')] } }] },
      { id: 9, __component: 'blocks.contact', name: 'Espace Loire', address: '12 rue du Stade', phone: '02 41 00 00 02', email: null, hours: null, show_map: true },
      { id: 10, __component: 'blocks.video', url: 'https://youtu.be/abc123XYZ', title: 'Visite', transcript: null },
    ] as any);

    expect(blocks.map((b) => b.type)).toEqual(['text', 'image', 'buttons', 'callout', 'documents', 'gallery', 'faq', 'contact', 'video']);
    expect(toc).toEqual([
      { id: 'tarifs', label: 'Tarifs', level: 2 },
      { id: 'caution', label: 'Caution', level: 3 },
      { id: 'tarifs-2', label: 'Tarifs', level: 2 },
    ]);
    const image = blocks[1] as any;
    expect(image.image).toMatchObject({ src: 'https://api.example/uploads/salle.jpg', alt: 'La salle des fêtes', caption: 'Vue de la scène' });
    expect(image.image.srcset).toContain('500w');
    expect((blocks[2] as any).buttons[0]).toMatchObject({ external: true, style: 'primary' });
    expect((blocks[3] as any).variantLabel).toBe('Attention');
    expect((blocks[4] as any).files[0]).toMatchObject({ name: 'reglement', label: 'PDF – 240 Ko' });
    expect((blocks[7] as any).phone).toEqual({ label: '02 41 00 00 02', href: 'tel:+33241000002' });
    expect((blocks[7] as any).map).toEqual({ query: '12 rue du Stade' });
    expect((blocks[8] as any).embedUrl).toBe('https://www.youtube-nocookie.com/embed/abc123XYZ');
  });

  it('ignore un texte riche invalide plutôt que de le rendre', () => {
    const { blocks } = mapBlocks(ctx, [{ id: 1, __component: 'blocks.text', body: '<script>alert(1)</script>' }] as any);
    expect(blocks).toEqual([]);
  });

  it('reconnaît les trois fournisseurs vidéo', () => {
    expect(parseVideoUrl('https://www.dailymotion.com/video/x8abc')?.embedUrl).toBe('https://www.dailymotion.com/embed/video/x8abc');
    expect(parseVideoUrl('https://vimeo.com/123456')?.embedUrl).toBe('https://player.vimeo.com/video/123456?dnt=1');
    expect(parseVideoUrl('https://evil.example/video')).toBeNull();
  });
});

describe('site et navigation', () => {
  it('prépare contact, horaires et accessibilité', () => {
    const vm = mapSite(ctx, site({ infos_pratiques: { id: 1, opening_hours: { days: { monday: [{ open: '09:00', close: '12:00' }], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] } }, population: 3240, contact_form_intro: null, latitude: null, longitude: null } }));
    expect(vm.contact.phone?.href).toBe('tel:+33241000000');
    expect(vm.contact.hoursSummary).toEqual([{ days: 'Lun', hours: '9h–12h' }]);
    expect(vm.legal.accessibility.levelLabel).toBe('Partiellement conforme');
  });

  it('construit les menus et ignore les pages non publiées', () => {
    const pages = [{ documentId: 'p1', title: 'Salle des fêtes', slug: 'salle-des-fetes' }];
    const nav = mapNavigation(
      ctx,
      site({
        navigation_config: {
          main: [
            { type: 'section', section: 'actualites' },
            { type: 'group', label: 'Vie pratique', children: [{ type: 'page', pageDocumentId: 'p1' }, { type: 'page', pageDocumentId: 'supprimee' }] },
            { type: 'external', url: 'https://cc.example', label: 'Communauté de communes' },
          ],
          footer: [{ type: 'section', section: 'contact' }],
        },
      }),
      pages as any,
    );
    expect(nav.main).toEqual([
      { kind: 'link', label: 'Actualités', href: '/actualites', external: false },
      { kind: 'group', label: 'Vie pratique', children: [{ label: 'Salle des fêtes', href: '/salle-des-fetes', external: false }] },
      { kind: 'link', label: 'Communauté de communes', href: 'https://cc.example', external: true },
    ]);
    expect(nav.footer).toEqual([{ label: 'Contact', href: '/contact', external: false }]);
    expect(nav.legal.map((l) => l.href)).toContain('/accessibilite');
    expect(nav.legal[2]?.label).toBe('Accessibilité : partiellement conforme');
  });
});

describe('contenus', () => {
  it('prépare un événement sur plusieurs jours', () => {
    const vm = mapEvent(ctx, {
      ...base,
      publishedAt: base.createdAt,
      title: 'Fête de la Loire',
      slug: 'fete-de-la-loire',
      start_date: '2026-07-12T08:00:00.000Z',
      end_date: '2026-07-14T20:00:00.000Z',
      category: 'celebration',
      price: 'Free',
      location: 'Quais',
      registration_required: false,
      max_participants: null,
    } as unknown as Evenement);
    expect(vm).toMatchObject({ period: 'Du 12 au 14 juillet 2026', multiDay: true, price: 'Gratuit', href: '/agenda/fete-de-la-loire', icsHref: '/agenda/fete-de-la-loire.ics' });
    expect(vm.category.label).toBe('Fête');
    expect(vm.registration).toBeNull();
  });

  it("regroupe l'équipe municipale et calcule les initiales", () => {
    const member = (first: string, last: string, role: string, order: number, title: string | null = null) =>
      ({ ...base, documentId: last, first_name: first, last_name: last, role, display_order: order, title, photo: null }) as unknown as TeamMember;
    const team = mapTeam(ctx, [
      member('Sophie', 'Bernard', 'adjoint', 2, '2e adjointe'),
      member('Claire', 'Martin', 'maire', 1),
      member('Marc', 'Lefèvre', 'adjoint', 1, '1er adjoint'),
      member('Isabelle', 'Renard', 'dgs', 1),
    ]);
    expect(team.groups.map((g) => g.key)).toEqual(['maire', 'adjoints', 'services']);
    expect(team.groups[1]?.members.map((m) => m.title)).toEqual(['1er adjoint', '2e adjointe']);
    expect(team.groups[0]?.members[0]).toMatchObject({ title: 'Maire', initials: 'CM' });
  });
});

describe('vie pratique', () => {
  const now = new Date('2026-09-22T10:00:00+02:00'); // mardi

  it('calcule les prochaines collectes', () => {
    expect(nextCollections({ weekday: 4, frequency: 'hebdomadaire', startDate: null }, now)).toEqual(['2026-09-24', '2026-10-01', '2026-10-08']);
    expect(nextCollections({ weekday: 2, frequency: 'hebdomadaire', startDate: null }, now)[0]).toBe('2026-09-22');
    expect(nextCollections({ weekday: 3, frequency: 'bimensuel', startDate: '2026-09-02' }, now)).toEqual(['2026-09-30', '2026-10-14', '2026-10-28']);
    expect(nextCollections({ weekday: 2, frequency: 'mensuel', startDate: '2026-09-08' }, now)).toEqual(['2026-10-13', '2026-11-10', '2026-12-08']);
  });

  it('semaines paires / impaires, rang dans le mois, saison, sans jour', () => {
    // 24 septembre 2026 : semaine ISO 39 (impaire)
    expect(nextCollections({ weekday: 4, frequency: 'semaines-impaires', startDate: null }, now)).toEqual(['2026-09-24', '2026-10-08', '2026-10-22']);
    expect(nextCollections({ weekday: 4, frequency: 'semaines-paires', startDate: null }, now)).toEqual(['2026-10-01', '2026-10-15', '2026-10-29']);
    expect(nextCollections({ weekday: 3, frequency: 'mensuel', startDate: null, monthRank: 1 }, now)).toEqual(['2026-10-07', '2026-11-04', '2026-12-02']);
    expect(nextCollections({ weekday: 5, frequency: 'mensuel', startDate: null, monthRank: 5 }, now)).toEqual(['2026-09-25', '2026-10-30', '2026-11-27']);
    // D'avril à novembre : après le dernier lundi de novembre, reprise en avril
    const late = new Date('2026-11-20T10:00:00+01:00');
    expect(nextCollections({ weekday: 1, frequency: 'hebdomadaire', startDate: null, seasonStart: 4, seasonEnd: 11 }, late)).toEqual(['2026-11-23', '2026-11-30', '2027-04-05']);
    expect(nextCollections({ weekday: -1, frequency: 'apport-volontaire', startDate: null }, now)).toEqual([]);
    expect(nextCollections({ weekday: 2, frequency: 'sur-rendez-vous', startDate: null }, now)).toEqual([]);
  });

  it('libellés de fréquence', () => {
    expect(wasteFrequencyLabel({ frequency: 'mensuel', collection_day: 'mercredi', month_rank: 1 })).toBe('Le 1er mercredi du mois');
    expect(wasteFrequencyLabel({ frequency: 'mensuel', collection_day: 'vendredi', month_rank: 5 })).toBe('Le dernier vendredi du mois');
    expect(wasteFrequencyLabel({ frequency: 'hebdomadaire', season_start_month: 4, season_end_month: 11 })).toBe("Chaque semaine, d'avril à novembre");
    expect(wasteFrequencyLabel({ frequency: 'semaines-paires', season_start_month: 11, season_end_month: 3 })).toBe('Semaines paires, de novembre à mars');
    expect(wasteFrequencyLabel({ frequency: 'apport-volontaire' })).toBe("Points d'apport volontaire");
  });

  it('prépare la semaine de cantine', () => {
    const week = mapCanteenWeek(ctx, {
      ...base,
      week_start: '2026-09-28',
      menu_mode: 'manual',
      school_name: null,
      meals: [
        { id: 1, day: 'lundi', starter: 'Carottes râpées', main_course: 'Poulet basquaise', side_dish: 'Riz', dairy: null, dessert: 'Pomme', snack: null, labels: { main: ['bio', 'local'] } },
      ],
    } as unknown as SchoolMenu);
    expect(week.label).toBe('Semaine du 28 septembre au 2 octobre');
    expect(week.days[0]?.courses.find((c) => c.key === 'main')?.badges).toEqual(['Bio', 'Local']);
    expect(week.days[2]?.closed).toBe(true);
  });
});

describe('source de contenus', () => {
  it('charge chaque type une seule fois et produit les view-models', async () => {
    const calls: string[] = [];
    const list = <T>(name: string, items: T[]) => async () => {
      calls.push(name);
      return items;
    };
    const article = { ...base, documentId: 'a1', publishedAt: base.createdAt, title: 'Réouverture', slug: 'reouverture', category: 'vie-municipale', summary: null, publication_date: '2026-09-15T08:00:00.000Z' } as unknown as Article;
    const page = { ...base, documentId: 'p1', publishedAt: base.createdAt, title: 'Salle', slug: 'salle', lead: null, blocks: [] } as unknown as Page;
    const loader: RawLoader = {
      site: async () => {
        calls.push('site');
        return site({ homepage: { id: 1, featured_news: { id: 1, enabled: true, count: 3 } } as any });
      },
      pages: list('pages', [page]),
      articles: list('articles', [article]),
      events: list('events', []),
      documents: list('documents', []),
      team: list('team', []),
      associations: list('associations', []),
      alerts: list('alerts', []),
      waste: list('waste', []),
      canteen: list('canteen', []),
    };

    const source = createContentSource(loader, ctx, { now: new Date('2026-09-22T10:00:00Z') });
    const [home, nav, articles] = await Promise.all([source.home(), source.navigation(), source.articles()]);
    await source.site();

    expect(home.featuredNews?.[0]?.title).toBe('Réouverture');
    expect(home.hero).toBeNull();
    expect(nav.main.length).toBeGreaterThan(0);
    expect(articles[0]?.seo.canonical).toBe('https://saint-aubin.example/actualites/reouverture');
    expect(calls.filter((c) => c === 'site')).toHaveLength(1);
    expect(calls.filter((c) => c === 'articles')).toHaveLength(1);
  });
});

describe('date des articles', () => {
  const article = (extra: Partial<Article>) =>
    ({ documentId: 'a1', title: 'Brocante', slug: 'brocante', category: 'vie-locale', createdAt: '2026-01-02T10:00:00.000Z', ...extra }) as Article;

  it('prend la date de publication, puis la date où le document a été publié', () => {
    expect(mapArticleCard(ctx, article({ publication_date: '2026-03-01T08:00:00.000Z', publishedAt: '2026-03-05T08:00:00.000Z' })).date.iso).toBe('2026-03-01T08:00:00.000Z');
    expect(mapArticleCard(ctx, article({ publishedAt: '2026-03-05T08:00:00.000Z' })).date.iso).toBe('2026-03-05T08:00:00.000Z');
  });

  it("montre en preview la date qu'aura un brouillon jamais publié s'il est publié maintenant", () => {
    const draft = article({ publishedAt: null as unknown as string });
    expect(mapArticleCard({ ...ctx, now: '2026-04-10T09:30:00.000Z' }, draft).date.iso).toBe('2026-04-10T09:30:00.000Z');
  });
});

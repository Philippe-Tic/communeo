import { describe, expect, it } from 'vitest';
import { createContentSource, validateBlocks, validateSiteSettings } from '@communeo/core';
import { createFixtureLoader, FIXTURE_CONTEXT, FIXTURE_NOW } from './index';
import * as saintAubin from './saint-aubin';

const source = (options = {}) => createContentSource(createFixtureLoader(options), FIXTURE_CONTEXT, { now: FIXTURE_NOW });

describe('les fixtures respectent les règles du backend', () => {
  it('réglages du site valides (accueil, menus, horaires, textes légaux)', () => {
    expect(validateSiteSettings(saintAubin.site() as never).issues).toEqual([]);
  });

  it('blocs publiables', () => {
    for (const item of [...saintAubin.pages(), ...saintAubin.articles(), ...saintAubin.events()]) {
      expect(validateBlocks(item.blocks, 'publish').issues, item.title).toEqual([]);
    }
  });
});

describe('commune complète', () => {
  it("contient tous les cas limites du brief", async () => {
    const s = source();
    const [home, articles, events, team, associations, alerts, pages] = await Promise.all([
      s.home(),
      s.articles(),
      s.events(),
      s.team(),
      s.associations(),
      s.alerts(),
      s.pages(),
    ]);
    expect(articles.some((a) => a.title.length > 85)).toBe(true);
    expect(articles.some((a) => a.image === null)).toBe(true);
    // Plusieurs thèmes, dont un partagé par deux actualités (filtre du site non trivial)
    expect(articles.filter((a) => a.category.key === 'travaux')).toHaveLength(2);
    expect(events.some((e) => e.multiDay)).toBe(true);
    expect(team.groups.flatMap((g) => g.members).some((m) => m.photo === null)).toBe(true);
    expect(associations.some((a) => a.logo === null)).toBe(true);
    expect(associations.map((a) => a.name)).not.toContain('Club de pétanque');
    expect(alerts.map((a) => a.title)).toEqual(['Coupure d’eau', 'Travaux rue des Écoles']);
    expect(pages.find((p) => p.href === '/salle-des-fetes')?.blocks.map((b) => b.type)).toEqual([
      'text', 'image', 'callout', 'text', 'buttons', 'documents', 'gallery', 'faq', 'contact', 'video',
    ]);
    // Accueil : toutes les sections présentes
    expect(Object.entries(home).filter(([key, value]) => key !== 'seo' && !value).map(([key]) => key)).toEqual([]);
  });

  it("l'agenda d'accueil ne montre que les événements à venir", async () => {
    const home = await source().home();
    expect(home.agenda?.map((e) => e.title)).not.toContain('Fête de la Loire');
  });
});

describe('variantes', () => {
  it("minimale : accueil réduit et aucune image", async () => {
    const s = source({ variant: 'minimal' });
    const home = await s.home();
    expect(home.hero?.image).toBeNull();
    expect(home.quickLinks).toBeNull();
    expect(home.featuredNews?.length).toBeGreaterThan(0);
    expect((await s.articles()).every((a) => a.image === null)).toBe(true);
  });

  it('vide : états vides', async () => {
    const s = source({ variant: 'empty' });
    expect(await s.articles()).toEqual([]);
    expect((await s.home()).featuredNews).toBeNull();
    expect((await s.team()).groups).toEqual([]);
  });

  it('blason et alerte urgente', async () => {
    const s = source({ logo: 'blason', criticalAlert: true });
    expect((await s.site()).logo?.src).toBe('/fixtures/logo-blason.svg');
    expect((await s.alerts())[0]?.severity.label).toBe('Urgent');
  });
});

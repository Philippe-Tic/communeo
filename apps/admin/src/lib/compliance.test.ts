import { describe, expect, it } from 'vitest';
import { remainingText, screensToComplete } from './compliance';
import type { SiteSettings } from './site-settings';

const site = (fields: Record<string, unknown>) =>
  ({
    address: '1 place de la Mairie',
    mentions_legales: { publication_director: 'Claire Martin' },
    accessibilite: {
      accessibility_level: 'partiellement-conforme',
      accessibility_schema_url: 'https://exemple.fr/schema.pdf',
    },
    ...fields,
  }) as unknown as SiteSettings;

describe('réglages à compléter pour la conformité', () => {
  it('rien à signaler quand les champs requis sont là', () => {
    expect([...screensToComplete(site({}))]).toEqual([]);
  });
  it('adresse, directeur de publication, accessibilité', () => {
    expect([...screensToComplete(site({ address: ' ' }))]).toEqual(['informations']);
    expect([...screensToComplete(site({ mentions_legales: {} }))]).toEqual(['legal']);
    expect([...screensToComplete(site({ accessibilite: { accessibility_level: 'non-conforme' } }))]).toEqual([
      'accessibilite',
    ]);
    // Site conforme : pas de schéma pluriannuel exigé par ce repère des réglages
    expect([...screensToComplete(site({ accessibilite: { accessibility_level: 'conforme' } }))]).toEqual([]);
  });
  it('points restants', () => {
    expect(remainingText({ done: 13, total: 18 })).toBe('5 points à compléter');
    expect(remainingText({ done: 17, total: 18 })).toBe('1 point à compléter');
  });
});

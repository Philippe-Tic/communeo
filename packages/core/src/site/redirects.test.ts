import { describe, expect, it } from 'vitest';
import { isValidDestination, normalizeOldAddress, sitemapLocations, suggestDestination, type RedirectDestination } from './redirects';

describe('anciennes adresses', () => {
  it.each([
    ['https://www.mairie-x.fr/horaires.html', '/horaires.html'],
    ['http://mairie-x.fr/services/etat-civil/', '/services/etat-civil'],
    ['/index.php?page=etat-civil#haut', '/index.php?page=etat-civil'],
    ['actualites/2024/brocante', '/actualites/2024/brocante'],
    ['https://mairie-x.fr/', null],
    ['   ', null],
    ['javascript:alert(1)', null],
  ])('%s → %s', (input, expected) => {
    expect(normalizeOldAddress(input)).toBe(expected);
  });

  it('destinations : adresses du site seulement', () => {
    expect(isValidDestination('/contact')).toBe(true);
    expect(isValidDestination('//autre.fr')).toBe(false);
    expect(isValidDestination('https://autre.fr')).toBe(false);
  });
});

describe('proposition automatique', () => {
  const destinations: RedirectDestination[] = [
    { path: '/actualites', label: 'Actualités', kind: 'Rubrique' },
    { path: '/contact', label: 'Contact', kind: 'Rubrique' },
    { path: '/documents', label: 'Documents officiels', kind: 'Rubrique' },
    { path: '/collecte-des-dechets', label: 'Collecte des déchets', kind: 'Rubrique' },
    { path: '/etat-civil', label: 'État civil', kind: 'Page' },
    { path: '/salle-des-fetes', label: 'Location de la salle des fêtes', kind: 'Page' },
    { path: '/actualites/brocante-d-automne', label: 'Brocante d’automne', kind: 'Actualité' },
  ];
  const to = (from: string) => suggestDestination(from, destinations);

  it('même page, nouvelle adresse : sûre', () => {
    expect(to('/services/etat-civil.html')).toEqual({ from: '/services/etat-civil.html', to: '/etat-civil', confidence: 'sure' });
    expect(to('/index.php?page=etat-civil').to).toBe('/etat-civil');
    expect(to('/vie-locale/la-salle-des-fetes').to).toBe('/salle-des-fetes');
  });

  it('mots courants des sites de mairie : probable', () => {
    expect(to('/horaires-d-ouverture.html')).toMatchObject({ to: '/contact', confidence: 'probable' });
    expect(to('/conseil-municipal/comptes-rendus')).toMatchObject({ to: '/documents', confidence: 'probable' });
    expect(to('/ordures-menageres').to).toBe('/collecte-des-dechets');
  });

  it('rien de ressemblant : la commune choisit', () => {
    expect(to('/node/123')).toEqual({ from: '/node/123', to: null, confidence: null });
  });

  it('plan du site : les adresses', () => {
    expect(sitemapLocations('<urlset><url><loc> https://x.fr/a?b=1&amp;c=2 </loc></url><url><loc>https://x.fr/d</loc></url></urlset>')).toEqual([
      'https://x.fr/a?b=1&c=2',
      'https://x.fr/d',
    ]);
  });
});

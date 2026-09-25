import { describe, expect, it } from 'vitest';
import { isReservedSiteSlug, isValidSlug, slugify } from './slug';

describe('slugify', () => {
  it('retire les accents et la ponctuation', () => {
    expect(slugify('Fête de la Musique 2026 !')).toBe('fete-de-la-musique-2026');
    expect(slugify("L'Œuvre de l'école")).toBe('l-oeuvre-de-l-ecole');
    expect(slugify('  Réouverture — médiathèque  ')).toBe('reouverture-mediatheque');
  });

  it('produit toujours un slug valide', () => {
    for (const text of ['Été 2026', 'ÇA VA ?', 'a---b', 'Saint-Aubin-sur-Loire']) {
      expect(isValidSlug(slugify(text)), text).toBe(true);
    }
  });

  it('refuse les slugs invalides', () => {
    for (const slug of ['Fete', 'fête', 'a--b', '-a', 'a-', 'a b', '']) {
      expect(isValidSlug(slug), slug).toBe(false);
    }
  });
});

describe('adresses de commune réservées', () => {
  it('réserve les sous-domaines de la plateforme, pas les noms de commune', () => {
    expect(isReservedSiteSlug('doc')).toBe(true);
    expect(isReservedSiteSlug('demo')).toBe(true);
    expect(isReservedSiteSlug('saint-aubin-sur-loire')).toBe(false);
  });
});

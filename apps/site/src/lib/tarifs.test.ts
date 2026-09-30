import { describe, expect, it } from 'vitest';
import { TRANCHES, trancheFor } from './tarifs';

describe('grille des tarifs du site', () => {
  it('reprend la grille des devis, avec le prix mensuel arrondi', () => {
    expect(TRANCHES.map((t) => [t.label, t.price, t.month])).toEqual([
      ['Moins de 500 habitants', '290', 24],
      ['De 500 à 1 999 habitants', '390', 33],
      ['De 2 000 à 4 999 habitants', '590', 49],
      ['De 5 000 à 9 999 habitants', '890', 74],
      ['10 000 habitants et plus', '1 290', 108],
    ]);
  });

  it('trouve la tranche d’une population', () => {
    expect(trancheFor(499).price).toBe('290');
    expect(trancheFor(500).price).toBe('390');
    expect(trancheFor(12_000).price).toBe('1 290');
  });
});

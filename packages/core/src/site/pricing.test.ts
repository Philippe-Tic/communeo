import { describe, expect, it } from 'vitest';
import { formatEuros, isValidSiret, pricingTier, quoteAmounts, tierLabel } from './pricing';

describe('offre Communeo', () => {
  it('tranche selon la population, bornes comprises', () => {
    expect(pricingTier(0).annualHT).toBe(290);
    expect(pricingTier(499).annualHT).toBe(290);
    expect(pricingTier(500).annualHT).toBe(390);
    expect(pricingTier(4_999).annualHT).toBe(590);
    expect(pricingTier(250_000).annualHT).toBe(1_290);
  });

  it('libellés des tranches', () => {
    expect(tierLabel(pricingTier(120))).toBe('moins de 500 habitants');
    expect(tierLabel(pricingTier(1_500))).toBe('de 500 à 1 999 habitants');
    expect(tierLabel(pricingTier(12_000))).toBe('10 000 habitants et plus');
  });

  it('montants : franchise de TVA ou TVA à 20 %', () => {
    expect(quoteAmounts(390, 0)).toEqual({ ht: 390, vatRate: 0, vat: 0, ttc: 390 });
    expect(quoteAmounts(390, 0.2)).toEqual({ ht: 390, vatRate: 0.2, vat: 78, ttc: 468 });
    expect(formatEuros(1290)).toBe('1 290,00 €');
  });

  it('SIRET : 14 chiffres et clé de contrôle', () => {
    expect(isValidSiret('217 500 016 00019')).toBe(true);
    expect(isValidSiret('21750001600018')).toBe(false);
    expect(isValidSiret('2175000160001')).toBe(false);
    // La Poste : somme des chiffres multiple de 5
    expect(isValidSiret('35600000049837')).toBe(true);
  });
});

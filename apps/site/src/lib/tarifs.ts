/** Grille des tarifs, reprise de @communeo/core (la même que les devis) */
import { formatNumber, PRICING_TIERS, pricingTier, tierLabel, type PricingTier } from '@communeo/core';

export interface Tranche {
  /** « Moins de 500 habitants » */
  label: string;
  /** « 1 290 » */
  price: string;
  /** Prix mensuel arrondi à l'euro, pour comparer */
  month: number;
  annualHT: number;
  from: number;
  to: number | null;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const tranche = (tier: PricingTier): Tranche => ({
  label: capitalize(tierLabel(tier)),
  price: formatNumber(tier.annualHT),
  month: Math.round(tier.annualHT / 12),
  annualHT: tier.annualHT,
  from: tier.from,
  to: tier.to,
});

export const TRANCHES = PRICING_TIERS.map(tranche);

export const trancheFor = (population: number) => tranche(pricingTier(population));

export const PRIX_MIN = TRANCHES[0]!.price;
export const PRIX_MAX = TRANCHES.at(-1)!.price;

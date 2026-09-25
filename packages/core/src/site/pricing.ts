/**
 * Offre Communeo (#312) : abonnement annuel, sans frais de mise en service, selon la population
 * municipale INSEE. Tarifs d'exemple, à confirmer (#315) : un seul endroit à modifier.
 *
 * Repères (septembre 2026) : Campagnol (AMRF) 120 à 220 € TTC/an ; LaPageLocale 199 € HT + 0,10 €
 * par habitant ; MaCommune 410 à 1 250 € HT/an + 150 € de mise en service ; agences 1 300 à 4 000 €
 * HT de création puis 450 à 500 € HT/an. Analyse : docs/business-plan-couts.md.
 */
export interface PricingTier {
  /** Population minimale de la tranche (incluse) */
  from: number;
  /** Population maximale (incluse), `null` : sans limite */
  to: number | null;
  /** Prix annuel hors taxes, en euros */
  annualHT: number;
}

export const PRICING_TIERS: readonly PricingTier[] = [
  { from: 0, to: 499, annualHT: 290 },
  { from: 500, to: 1_999, annualHT: 390 },
  { from: 2_000, to: 4_999, annualHT: 590 },
  { from: 5_000, to: 9_999, annualHT: 890 },
  { from: 10_000, to: null, annualHT: 1_290 },
];

/** Durée de validité d'un devis */
export const QUOTE_VALIDITY_DAYS = 30;

/**
 * Ce que comprend l'abonnement (écran « Passer en live », devis). Un devis engage : rien n'y figure que
 * la plateforme ne fasse réellement (pas d'hébergement en France tant que les sites sont chez Netlify,
 * pas de sauvegardes tant qu'elles ne sont pas en place).
 */
export const OFFER_INCLUDES = [
  'Site internet de la commune, sur son adresse Communeo et sur le domaine de la commune, avec certificat HTTPS',
  'Tous les thèmes, modules et mises à jour, sans frais de mise en service',
  'Conformité : mentions légales, RGPD, déclaration d’accessibilité, démarches Service-Public',
  'Assistance par e-mail',
] as const;

/** Qualités courantes du signataire : le devis engage la commune */
export const SIGNATORY_ROLES = [
  'Maire',
  'Maire délégué(e)',
  'Adjoint(e) au maire',
  'Secrétaire de mairie',
  'Directeur(trice) général(e) des services',
] as const;

export function pricingTier(population: number): PricingTier {
  return PRICING_TIERS.find((tier) => population >= tier.from && (tier.to === null || population <= tier.to)) ?? PRICING_TIERS.at(-1)!;
}

/** « moins de 500 habitants », « de 500 à 1 999 habitants », « 10 000 habitants et plus » */
/** Séparateur de milliers : espace simple (les polices standard du PDF n'ont pas l'espace fine) */
export const formatNumber = (value: number) => value.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');

export function tierLabel(tier: PricingTier): string {
  const n = formatNumber;
  if (tier.from === 0) return `moins de ${n(tier.to! + 1)} habitants`;
  if (tier.to === null) return `${n(tier.from)} habitants et plus`;
  return `de ${n(tier.from)} à ${n(tier.to)} habitants`;
}

export interface QuoteAmounts {
  ht: number;
  /** Taux de TVA (0 : franchise en base, art. 293 B du CGI) */
  vatRate: number;
  vat: number;
  ttc: number;
}

const cents = (value: number) => Math.round(value * 100) / 100;

export function quoteAmounts(annualHT: number, vatRate: number): QuoteAmounts {
  const vat = cents(annualHT * vatRate);
  return { ht: annualHT, vatRate, vat, ttc: cents(annualHT + vat) };
}

/** « 1 290,00 € » (espaces simples, comme formatNumber) */
export const formatEuros = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value).replace(/[\u202f\u00a0]/g, ' ');

/** SIRET : 14 chiffres, clé de Luhn (La Poste : 356 000 000 XXXXX, somme multiple de 5) */
export function isValidSiret(value: string): boolean {
  const siret = value.replace(/\s/g, '');
  if (!/^\d{14}$/.test(siret)) return false;
  if (siret.startsWith('356000000')) return [...siret].reduce((sum, digit) => sum + Number(digit), 0) % 5 === 0;
  let sum = 0;
  for (let index = 0; index < 14; index += 1) {
    let digit = Number(siret[13 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

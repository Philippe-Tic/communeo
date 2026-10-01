/**
 * Données structurées (JSON-LD, schema.org) de communeo.fr : qui édite Communeo, ce qu'est le logiciel
 * et ses prix, les questions-réponses, le fil d'Ariane, les vidéos. Elles aident Google et les moteurs
 * de réponse (IA) à comprendre et citer Communeo. Uniquement des faits publiés ailleurs sur le site
 * (mentions légales, tarifs) : rien d'inventé.
 */
import { CONTACT_EMAIL, TRIAL_URL } from './site';
import { TRANCHES } from './tarifs';

export type JsonLd = Record<string, unknown>;

const SITE = 'https://communeo.fr';
const ORGANISATION = `${SITE}/#organisation`;
const LOGICIEL = `${SITE}/#logiciel`;

/** Phrase de définition de Communeo, reprise par la page d'accueil, llms.txt et les données structurées */
export const DEFINITION =
  'Communeo est un logiciel en ligne français pour créer et tenir à jour le site internet d’une mairie, sans compétence technique : un site web prêt en une journée, construit pour les obligations des communes (accessibilité RGAA, RGPD, mentions légales) et pensé pour les petites communes et les communes rurales.';

export function organisation(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': ORGANISATION,
    name: 'Communeo',
    url: `${SITE}/`,
    logo: `${SITE}/apple-touch-icon.png`,
    email: CONTACT_EMAIL,
    description: DEFINITION,
    founder: { '@type': 'Person', name: 'Philippe Chevreul' },
    // SIREN de l'entreprise individuelle qui édite Communeo (mentions légales)
    identifier: { '@type': 'PropertyValue', propertyID: 'SIREN', value: '911592764' },
    address: { '@type': 'PostalAddress', streetAddress: '10 rue du Général de Gaulle', postalCode: '76250', addressLocality: 'Déville-lès-Rouen', addressCountry: 'FR' },
    areaServed: { '@type': 'Country', name: 'France' },
  };
}

export function siteWeb(): JsonLd {
  return { '@type': 'WebSite', '@id': `${SITE}/#site`, url: `${SITE}/`, name: 'Communeo', inLanguage: 'fr-FR', publisher: { '@id': ORGANISATION } };
}

/** Le logiciel et son offre : une offre par tranche de population, prix HT annuels de la grille */
export function logiciel(): JsonLd {
  const prix = TRANCHES.map((t) => t.annualHT);
  return {
    '@type': 'SoftwareApplication',
    '@id': LOGICIEL,
    name: 'Communeo',
    description: DEFINITION,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Site internet de mairie',
    operatingSystem: 'Web',
    inLanguage: 'fr-FR',
    url: `${SITE}/`,
    publisher: { '@id': ORGANISATION },
    audience: { '@type': 'Audience', audienceType: 'Mairies et collectivités territoriales' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: Math.min(...prix),
      highPrice: Math.max(...prix),
      offerCount: TRANCHES.length,
      offers: TRANCHES.map((t) => ({
        '@type': 'Offer',
        name: `Abonnement annuel, ${t.label.toLowerCase()}`,
        price: t.annualHT,
        priceCurrency: 'EUR',
        url: `${SITE}/tarifs`,
        priceSpecification: { '@type': 'UnitPriceSpecification', price: t.annualHT, priceCurrency: 'EUR', unitText: 'an', valueAddedTaxIncluded: false },
        eligibleQuantity: { '@type': 'QuantitativeValue', minValue: t.from, ...(t.to === null ? {} : { maxValue: t.to }), unitText: 'habitants' },
      })),
    },
    potentialAction: { '@type': 'RegisterAction', name: 'Essai gratuit de 30 jours', target: TRIAL_URL },
  };
}

export function faq(questions: Array<{ q: string; a: string }>): JsonLd {
  return {
    '@type': 'FAQPage',
    mainEntity: questions.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

/** Fil d'Ariane : l'accueil, puis la page */
export function filAriane(page: { nom: string; url: string }): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: page.nom, item: page.url },
    ],
  };
}

/** Un ou plusieurs objets JSON-LD dans un seul graphe */
export const graphe = (objets: JsonLd[]) => JSON.stringify({ '@context': 'https://schema.org', '@graph': objets }).replace(/</g, '\\u003c');

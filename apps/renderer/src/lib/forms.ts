/** Formulaires envoyés à l'API Strapi (URL publique, jamais le token de build). */
import { ASSOCIATION_CATEGORY_LABELS, type KeyLabel } from '@communeo/core';
import type { FormConfig } from '@communeo/theme-contract';

const apiUrl = () => (process.env.STRAPI_PUBLIC_URL ?? process.env.STRAPI_URL ?? 'http://localhost:1337').replace(/\/$/, '');
const options = (labels: Record<string, string>): KeyLabel[] => Object.entries(labels).map(([key, label]) => ({ key, label }));

export const CONTACT_CATEGORIES: Record<string, string> = {
  general: 'Question générale',
  urbanisme: 'Urbanisme',
  'etat-civil': 'État civil',
  voirie: 'Voirie, propreté, éclairage',
  associations: 'Associations',
  rgpd: 'Données personnelles',
  autre: 'Autre',
};

export const contactForm = (siteId: string): FormConfig => ({
  action: `${apiUrl()}/api/contact-submissions/public`,
  siteId,
  options: options(CONTACT_CATEGORIES),
});

export const associationForm = (siteId: string): FormConfig => ({
  action: `${apiUrl()}/api/associations/public`,
  siteId,
  options: options(ASSOCIATION_CATEGORY_LABELS),
});

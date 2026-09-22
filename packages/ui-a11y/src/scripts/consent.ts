/**
 * Consentement aux contenus tiers (vidéos, cartes), conforme aux recommandations de la CNIL :
 * refuser est aussi simple qu'accepter, rien n'est chargé avant le choix, le choix est modifiable.
 * Le site ne dépose aucun traceur ; seul le choix est mémorisé (localStorage, 6 mois).
 */
export interface Consent {
  media: boolean;
  decidedAt: string;
}

const KEY = 'communeo-consent-v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 182;
export const CONSENT_EVENT = 'communeo:consent';

export function getConsent(): Consent | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Consent | null;
    if (!value || Date.now() - new Date(value.decidedAt).getTime() > MAX_AGE_MS) return null;
    return value;
  } catch {
    return null;
  }
}

export function setConsent(media: boolean) {
  const consent: Consent = { media, decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(consent));
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la page
  }
  document.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
}

export function onConsent(callback: (consent: Consent | null) => void) {
  callback(getConsent());
  document.addEventListener(CONSENT_EVENT, (event) => callback((event as CustomEvent<Consent>).detail));
}

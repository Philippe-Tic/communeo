/**
 * Référencement au passage sur le domaine (#336) : ce qui pèse le plus pour être bien trouvé n'est pas
 * technique, ce sont trois liens vers le site officiel, que seule la mairie peut mettre à jour :
 * l'Annuaire de l'administration (service-public.fr), la fiche Google de la mairie et Wikipédia
 * (par Wikidata). L'Annuaire et Wikidata se vérifient automatiquement ; la fiche Google, non.
 */

export type SeoChecklistId = 'annuaire' | 'google' | 'wikipedia';

/** Fait et vérifié (le lien est bien là), fait d'après la commune (vérification en attente), ou à faire */
export type SeoChecklistState = 'verified' | 'declared' | 'todo';

export interface SeoChecklistItem {
  id: SeoChecklistId;
  title: string;
  why: string;
  steps: string[];
  links: Array<{ label: string; href: string }>;
  state: SeoChecklistState;
  /** « L'Annuaire indique encore http://ancien-site.fr » */
  detail: string | null;
  /** Vérifiable automatiquement : sinon, la commune coche elle-même */
  checkable: boolean;
}

export const SEO_CHECKLIST_IDS: SeoChecklistId[] = ['annuaire', 'google', 'wikipedia'];

/** « www.mairie-x.fr/ » et « https://mairie-x.fr » désignent le même site */
export function sameSite(url: string | null | undefined, siteUrl: string): boolean {
  const host = (value: string) => {
    try {
      return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return '';
    }
  };
  return !!url && host(url) !== '' && host(url) === host(siteUrl);
}

export interface SeoChecklistInput {
  siteUrl: string;
  communeName: string;
  /** Page de la mairie dans l'Annuaire, et sites qu'il affiche (`null` : Annuaire injoignable) */
  annuaire: { pageUrl: string | null; websites: string[] } | null;
  /** Fiche Wikidata de la commune, son article Wikipédia et son « site officiel » (`null` : injoignable) */
  wikidata: { itemUrl: string | null; articleUrl: string | null; website: string | null } | null;
  /** Démarches déclarées faites par la commune */
  declared: Partial<Record<SeoChecklistId, string>>;
}

const stateOf = (verified: boolean, declared: boolean): SeoChecklistState => (verified ? 'verified' : declared ? 'declared' : 'todo');

export function seoChecklist(input: SeoChecklistInput): SeoChecklistItem[] {
  const { siteUrl, communeName, annuaire, wikidata, declared } = input;
  const annuaireOk = !!annuaire?.websites.some((website) => sameSite(website, siteUrl));
  const wikiOk = sameSite(wikidata?.website, siteUrl);
  const google = encodeURIComponent(`Mairie ${communeName}`);

  return [
    {
      id: 'annuaire',
      title: 'Annuaire de l’administration (service-public.fr)',
      why: 'C’est la référence officielle : de nombreux sites et Google s’en servent pour trouver le site de la mairie.',
      steps: [
        'Ouvrez la fiche de votre mairie dans l’Annuaire.',
        `Suivez le lien de mise à jour proposé sur la fiche, et indiquez le site internet : ${siteUrl}.`,
        'La modification est vérifiée par l’administration : elle peut prendre quelques jours.',
      ],
      links: [
        ...(annuaire?.pageUrl ? [{ label: 'Fiche de la mairie dans l’Annuaire', href: annuaire.pageUrl }] : []),
      ],
      state: stateOf(annuaireOk, !!declared.annuaire),
      detail: annuaire
        ? annuaireOk
          ? 'L’Annuaire indique bien votre site.'
          : annuaire.websites.length
            ? `L’Annuaire indique encore : ${annuaire.websites.join(', ')}.`
            : 'L’Annuaire n’indique pas encore de site internet.'
        : null,
      checkable: true,
    },
    {
      id: 'google',
      title: 'Fiche Google de la mairie',
      why: 'C’est l’encadré affiché dans Google et Maps quand on cherche « mairie de … » : horaires, téléphone et lien vers le site.',
      steps: [
        'Cherchez « Mairie de votre commune » dans Google et ouvrez l’encadré de la mairie.',
        'Revendiquez la fiche si elle ne l’est pas encore (« Vous êtes le propriétaire de cet établissement ? »), puis vérifiez-la.',
        `Dans les informations de la fiche, indiquez le site : ${siteUrl}, et vérifiez les horaires.`,
      ],
      links: [
        { label: 'Chercher la fiche dans Google', href: `https://www.google.com/search?q=${google}` },
        { label: 'Google Business Profile', href: 'https://business.google.com/' },
      ],
      state: stateOf(false, !!declared.google),
      detail: null,
      checkable: false,
    },
    {
      id: 'wikipedia',
      title: 'Wikipédia',
      why: 'L’article de la commune affiche son site officiel ; il le lit dans Wikidata, la base de données de Wikipédia.',
      steps: [
        'Ouvrez la fiche Wikidata de la commune (il faut un compte Wikipédia, gratuit).',
        `Dans « site officiel », indiquez ${siteUrl} (ou remplacez l’ancienne adresse), avec une référence si possible.`,
        'L’article Wikipédia de la commune affiche en général ce site automatiquement.',
      ],
      links: [
        ...(wikidata?.itemUrl ? [{ label: 'Fiche Wikidata de la commune', href: wikidata.itemUrl }] : []),
        ...(wikidata?.articleUrl ? [{ label: 'Article Wikipédia', href: wikidata.articleUrl }] : []),
      ],
      state: stateOf(wikiOk, !!declared.wikipedia),
      detail: wikidata
        ? wikiOk
          ? 'Wikidata indique bien votre site.'
          : wikidata.website
            ? `Wikidata indique encore : ${wikidata.website}.`
            : 'Wikidata n’indique pas encore de site officiel.'
        : null,
      checkable: true,
    },
  ];
}

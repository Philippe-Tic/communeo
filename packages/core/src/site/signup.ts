/**
 * Inscription d'une mairie en libre-service (#309, #337) : quand l'adresse de la personne qui
 * s'inscrit suffit-elle à prouver qu'elle parle au nom de la mairie ?
 *
 * La mairie doit approuver la demande depuis son adresse officielle (Annuaire de l'administration),
 * sauf si la personne s'inscrit avec cette adresse même, ou avec une adresse du même domaine quand
 * ce domaine est celui de la mairie (`mairie-saint-aubin.fr`) et non une messagerie grand public
 * (`orange.fr`, `gmail.com`…) où n'importe qui peut ouvrir une boîte.
 */

/** Messageries ouvertes au public : un même domaine n'y prouve rien */
export const PUBLIC_MAIL_DOMAINS: ReadonlySet<string> = new Set([
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'sfr.fr',
  'neuf.fr',
  'cegetel.net',
  'club-internet.fr',
  'aliceadsl.fr',
  'numericable.fr',
  'bbox.fr',
  'laposte.net',
  'gmail.com',
  'googlemail.com',
  'hotmail.fr',
  'hotmail.com',
  'outlook.fr',
  'outlook.com',
  'live.fr',
  'live.com',
  'msn.com',
  'yahoo.fr',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'aol.fr',
  'gmx.fr',
  'gmx.com',
  'protonmail.com',
  'proton.me',
  'mailo.com',
  'netcourrier.com',
  'ymail.com',
]);

const domainOf = (email: string) => email.trim().toLowerCase().split('@')[1] ?? '';

export type SignupApproval = 'same_email' | 'same_domain' | 'townhall' | 'team';

/**
 * Qui doit approuver la demande : personne (`same_email`, `same_domain`), la mairie depuis son
 * adresse officielle (`townhall`), ou l'équipe Communeo si aucune adresse officielle n'est connue.
 */
export function signupApproval(email: string, officialEmail: string | null | undefined): SignupApproval {
  const official = officialEmail?.trim().toLowerCase();
  if (!official) return 'team';
  if (email.trim().toLowerCase() === official) return 'same_email';
  const domain = domainOf(official);
  if (domain && domain === domainOf(email) && !PUBLIC_MAIL_DOMAINS.has(domain)) return 'same_domain';
  return 'townhall';
}

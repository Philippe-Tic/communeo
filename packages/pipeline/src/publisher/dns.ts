/**
 * Helpers DNS indépendants de l'hébergeur.
 */

/** Un apex a exactement deux labels (domaine.tld). */
export function isApexDomain(domain: string): boolean {
  return domain.split('.').length === 2;
}

/** Domaine de base : les deux derniers labels (ex. mairie-lyon.fr). */
export function baseDomain(domain: string): string {
  return domain.split('.').slice(-2).join('.');
}

/** Nom d'hôte à saisir chez le fournisseur DNS : `@` pour l'apex, sinon le nom sans le domaine de base. */
export function displayName(fullName: string, base: string): string {
  if (fullName === base) return '@';
  const suffix = `.${base}`;
  return fullName.endsWith(suffix) ? fullName.slice(0, -suffix.length) : fullName;
}

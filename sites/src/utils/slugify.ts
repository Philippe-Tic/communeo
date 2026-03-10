/**
 * Génère un slug URL-safe à partir d'un texte.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Génère un slug unique en ajoutant un suffixe numérique si nécessaire.
 */
export function slugifyUnique(text: string, usedSlugs: Set<string>): string {
  let slug = slugify(text);
  if (!usedSlugs.has(slug)) {
    usedSlugs.add(slug);
    return slug;
  }
  let i = 2;
  while (usedSlugs.has(`${slug}-${i}`)) i++;
  slug = `${slug}-${i}`;
  usedSlugs.add(slug);
  return slug;
}

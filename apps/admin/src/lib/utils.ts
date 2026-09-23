import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Initiales d'une commune ou d'une personne : « Saint-Aubin-sur-Loire » → « SA » */
export function initials(name: string): string {
  const words = name.split(/[\s-]+/).filter((word) => word && !['sur', 'le', 'la', 'les', 'de', 'du', 'des', 'en', "l'", "d'"].includes(word.toLowerCase()));
  return words.slice(0, 2).map((word) => word[0]!.toUpperCase()).join('') || '?';
}

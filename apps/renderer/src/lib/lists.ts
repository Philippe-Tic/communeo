/** Filtres par catégorie et pagination des listes (actualités, agenda, associations). */
import type { KeyLabel } from '@communeo/core';
import type { FilterOption, PaginationLinks } from '@communeo/theme-contract';

export const PAGE_SIZE = 10;

export function categoryFilters(items: Array<{ category: KeyLabel }>, base: string, current: string | null): FilterOption[] {
  const counts = new Map<string, FilterOption>();
  for (const { category } of items) {
    const entry = counts.get(category.key) ?? { ...category, href: `${base}/categorie/${category.key}`, count: 0, current: category.key === current };
    entry.count += 1;
    counts.set(category.key, entry);
  }
  return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

export function paginate<T>(items: T[], page: number, base: string): { items: T[]; pagination: PaginationLinks } {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const href = (n: number) => (n === 1 ? base : `${base}/page/${n}`);
  return {
    items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    pagination: {
      page,
      pageCount,
      total: items.length,
      previous: page > 1 ? href(page - 1) : null,
      next: page < pageCount ? href(page + 1) : null,
      pages: Array.from({ length: pageCount }, (_, i) => ({ page: i + 1, href: href(i + 1), current: i + 1 === page })),
    },
  };
}

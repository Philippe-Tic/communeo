/**
 * Pagination (handoff) : « 1–20 sur 48 » à gauche, boutons 32 px, page courante sur fond vert,
 * « précédent » désactivé au début.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Pages affichées : la première, la dernière, et deux autour de la page courante */
export function pageItems(page: number, pageCount: number): Array<number | 'gap'> {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((value) => value >= 1 && value <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1]! > 1 ? ['gap' as const, value] : [value]));
}

export function Pagination({ page, pageCount, pageSize, total, onPage }: { page: number; pageCount: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const button = 'grid size-11 place-items-center rounded-lg text-[13px] font-medium md:size-8';
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-3 border-t border-border-row px-4 py-3">
      <p className="text-[13px] text-secondary">
        {first}–{last} sur {total}
      </p>
      {pageCount > 1 && (
        <ul className="ml-auto flex items-center gap-1">
          <li>
            <button type="button" aria-label="Page précédente" disabled={page <= 1} onClick={() => onPage(page - 1)} className={cn(button, 'border border-border-input hover:bg-surface-hover disabled:opacity-40')}>
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
          </li>
          {pageItems(page, pageCount).map((item, index) =>
            item === 'gap' ? (
              <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-secondary">
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? 'page' : undefined}
                  onClick={() => onPage(item)}
                  className={cn(button, item === page ? 'bg-brand-button text-on-brand' : 'hover:bg-surface-hover')}
                >
                  {item}
                </button>
              </li>
            ),
          )}
          <li>
            <button type="button" aria-label="Page suivante" disabled={page >= pageCount} onClick={() => onPage(page + 1)} className={cn(button, 'border border-border-input hover:bg-surface-hover disabled:opacity-40')}>
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
}

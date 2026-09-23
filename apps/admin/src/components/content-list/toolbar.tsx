/**
 * Barre de filtres (handoff 6.2) : recherche, filtres en pastilles (actif = vert, X pour le retirer),
 * tri en texte, bascule « Compact ». Remplacée par la barre d'actions groupées pendant une sélection.
 */
import { ArrowDown, ArrowUp, ChevronDown, Rows3, Search, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { indefinite, type Noun } from './types';

export interface PillFilter {
  key: string;
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
}

export function Toolbar({
  noun,
  query,
  onQuery,
  filters,
  onFilter,
  sortText,
  order,
  compact,
  onCompact,
  searchLabel,
  stacked,
  toggles = [],
}: {
  noun: Noun;
  query: string;
  onQuery: (value: string) => void;
  filters: PillFilter[];
  onFilter: (key: string, value: string | undefined) => void;
  /** Tri et densité : absents des listes simples (abonnés) */
  sortText?: string;
  order?: 'asc' | 'desc';
  compact?: boolean;
  onCompact?: (compact: boolean) => void;
  /** Libellé de la recherche, s'il précise les champs : « Rechercher (nom, objet, référence) » */
  searchLabel?: string;
  /** Volet étroit (boîte de réception) : recherche sur toute la largeur, filtres dessous */
  stacked?: boolean;
  /** Bascules avant les filtres (« Non lus ») */
  toggles?: Array<{ label: string; pressed: boolean; onChange: (pressed: boolean) => void }>;
}) {
  const searchId = useId();
  const [text, setText] = useState(query);
  // Recherche envoyée après une courte pause de frappe
  useEffect(() => {
    if (text === query) return;
    const timer = setTimeout(() => onQuery(text), 300);
    return () => clearTimeout(timer);
  }, [text, query, onQuery]);
  // Effacée ailleurs (« Effacer la recherche et les filtres ») : le champ suit
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setText(query);
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-border-row p-3',
        stacked ? 'md:px-5' : 'md:gap-3 md:px-4',
      )}
    >
      <div className={cn('relative w-full', !stacked && 'md:w-[280px]')}>
        <label htmlFor={searchId} className="sr-only">
          {searchLabel ?? `Rechercher ${indefinite(noun)}`}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary"
        />
        <input
          id={searchId}
          type="search"
          value={text}
          placeholder={searchLabel ?? `Rechercher ${indefinite(noun)}`}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onQuery(text);
          }}
          className="h-11 w-full rounded-lg border border-border-input bg-surface pr-9 pl-9 placeholder:text-secondary md:h-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => {
              setText('');
              onQuery('');
            }}
            className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-secondary hover:bg-surface-hover"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <div className="-mx-3 flex max-w-[calc(100%+1.5rem)] flex-1 gap-2 overflow-x-auto px-3 md:mx-0 md:max-w-none md:flex-none md:overflow-visible md:px-0">
        {toggles.map((toggle) => (
          <button
            key={toggle.label}
            type="button"
            aria-pressed={toggle.pressed}
            onClick={() => toggle.onChange(!toggle.pressed)}
            className={cn(
              'inline-flex h-11 shrink-0 items-center rounded-full border px-3.5 text-[13px] md:h-8',
              toggle.pressed
                ? 'border-brand bg-brand-soft font-semibold text-brand'
                : 'border-border-input hover:bg-surface-hover',
            )}
          >
            {toggle.label}
          </button>
        ))}
        {filters.map((filter) => (
          <FilterPill key={filter.key} filter={filter} onChange={(value) => onFilter(filter.key, value)} />
        ))}
      </div>

      {sortText && onCompact && (
        <div className="ml-auto hidden items-center gap-3 text-[13px] text-secondary md:flex">
          <span>
            Trié par {sortText}{' '}
            {order === 'desc' ? (
              <ArrowDown aria-label="décroissant" className="inline size-3.5" />
            ) : (
              <ArrowUp aria-label="croissant" className="inline size-3.5" />
            )}
          </span>
          <button
            type="button"
            aria-pressed={compact}
            onClick={() => onCompact(!compact)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-medium',
              compact
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-border-input text-text hover:bg-surface-hover',
            )}
          >
            <Rows3 aria-hidden="true" className="size-4" />
            Compact
          </button>
        </div>
      )}
    </div>
  );
}

function FilterPill({ filter, onChange }: { filter: PillFilter; onChange: (value: string | undefined) => void }) {
  const active = filter.options.find((option) => option.value === filter.value);
  if (active) {
    return (
      <span className="inline-flex h-11 shrink-0 items-center rounded-full border border-brand bg-brand-soft text-[13px] font-semibold text-brand md:h-8">
        <DropdownMenu>
          <DropdownMenuTrigger className="h-full rounded-l-full pr-1 pl-3.5">
            {filter.label} : {active.label}
          </DropdownMenuTrigger>
          <FilterOptions filter={filter} onChange={onChange} />
        </DropdownMenu>
        <button
          type="button"
          aria-label={`Retirer le filtre ${filter.label} : ${active.label}`}
          onClick={() => onChange(undefined)}
          className="grid h-full place-items-center rounded-r-full pr-2.5 pl-1"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-border-input px-3.5 text-[13px] hover:bg-surface-hover md:h-8">
        {filter.label}
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </DropdownMenuTrigger>
      <FilterOptions filter={filter} onChange={onChange} />
    </DropdownMenu>
  );
}

function FilterOptions({ filter, onChange }: { filter: PillFilter; onChange: (value: string | undefined) => void }) {
  return (
    <DropdownMenuContent align="start" aria-label={filter.label}>
      <DropdownMenuRadioGroup value={filter.value ?? ''} onValueChange={(value) => onChange(value || undefined)}>
        {filter.options.map((option) => (
          <DropdownMenuRadioItem key={option.value} value={option.value}>
            {option.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  );
}

/**
 * Un plat de la grille de la cantine : le nom et ses labels en pastilles ; un clic ouvre une petite
 * fenêtre (popover) avec le nom et les labels en cases à cocher. « — » quand il n'y a rien.
 */
import { Popover } from 'radix-ui';
import { useId, useState, type ReactNode } from 'react';
import { CANTEEN_BADGE_LABELS } from '@communeo/core';
import { Button } from '@/components/ui/button';
import { LABELS, type MealLabel } from '@/lib/canteen';
import { cn } from '@/lib/utils';

const PILL: Record<MealLabel, string> = {
  bio: 'bg-success-bg text-success',
  local: 'bg-info-bg text-info',
  'fait-maison': 'bg-warning-bg text-warning',
  vegetarien: 'bg-neutral-bg text-neutral',
};

export function LabelPills({ labels, className }: { labels: MealLabel[]; className?: string }) {
  if (!labels.length) return null;
  return (
    <span className={cn('mt-1 flex flex-wrap gap-1', className)}>
      {labels.map((label) => (
        <span key={label} className={cn('rounded-full px-1.5 py-px text-[10px] leading-4 font-semibold', PILL[label])}>
          {CANTEEN_BADGE_LABELS[label]}
        </span>
      ))}
    </span>
  );
}

export function DishCell({
  label,
  dish,
  labels,
  onChange,
  children,
  className,
  invalid,
}: {
  /** « Lundi, Entrée » : nom accessible du bouton et titre de la fenêtre */
  label: string;
  dish: string;
  labels: MealLabel[];
  onChange: (dish: string, labels: MealLabel[]) => void;
  /** Contenu du bouton (par défaut le plat et ses labels) */
  children?: ReactNode;
  className?: string;
  /** Plat obligatoire manquant (plat principal d'un jour ouvert) */
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(dish);
  const [chosen, setChosen] = useState<MealLabel[]>(labels);
  const id = useId();
  const apply = () => {
    onChange(text.trim(), text.trim() ? chosen : []);
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(value) => {
        // À l'ouverture : les valeurs actuelles
        if (value) {
          setText(dish);
          setChosen(labels);
        }
        setOpen(value);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${label} : ${dish || 'aucun plat'}${labels.length ? ` (${labels.map((item) => CANTEEN_BADGE_LABELS[item]).join(', ')})` : ''}${invalid ? ', plat obligatoire' : ''}. Modifier`}
          className={cn(
            'block w-full rounded-md border px-2 py-1.5 text-left text-[13px] hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            dish ? 'border-border-input bg-surface dark:bg-bg' : 'border-transparent text-center text-secondary',
            open && 'ring-2 ring-brand',
            invalid && 'border-2 border-danger bg-danger-alert-bg',
            className,
          )}
        >
          {children ?? (
            <>
              <span className="block break-words">{dish || '—'}</span>
              <LabelPills labels={labels} />
            </>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          aria-labelledby={`${id}-titre`}
          className="z-50 w-[280px] rounded-xl border border-border-dialog bg-surface p-4 text-text shadow-dialog"
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              (event.target as HTMLElement).tagName === 'INPUT' &&
              (event.target as HTMLInputElement).type === 'text'
            ) {
              event.preventDefault();
              apply();
            }
          }}
        >
          <p id={`${id}-titre`} className="font-semibold">
            {label}
          </p>
          <label htmlFor={`${id}-plat`} className="mt-3 block text-[13px] font-medium">
            Plat
          </label>
          <input
            id={`${id}-plat`}
            type="text"
            value={text}
            maxLength={200}
            autoComplete="off"
            onChange={(event) => setText(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-border-input bg-surface px-3 dark:bg-bg"
          />
          <fieldset className="mt-3">
            <legend className="text-[13px] font-medium">Labels</legend>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {LABELS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={chosen.includes(item)}
                    onChange={(event) =>
                      setChosen((current) =>
                        event.target.checked ? [...current, item] : current.filter((entry) => entry !== item),
                      )
                    }
                    className="size-4 accent-brand"
                  />
                  {CANTEEN_BADGE_LABELS[item]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 flex justify-end gap-2">
            <Popover.Close asChild>
              <Button type="button" variant="secondary" size="sm">
                Annuler
              </Button>
            </Popover.Close>
            <Button type="button" size="sm" onClick={apply}>
              Valider
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

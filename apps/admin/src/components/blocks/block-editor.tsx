/**
 * Éditeur de blocs (handoff 6.3) : liste de blocs encadrés, ajout depuis le catalogue à l'endroit voulu,
 * déplacement par glisser-déposer, au clavier (Espace saisit, flèches déplacent) ou par boutons,
 * duplication, suppression annulable. Les blocs vivent dans le formulaire du contenu (useFieldArray).
 */
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronDown, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useFieldArray, useFormContext, useFormState, useWatch, type FieldErrors } from 'react-hook-form';
import { flattenErrors } from '@/components/form/form';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { blockType, type Block } from './catalog';
import { BlockCatalog } from './block-catalog';
import { BlockForm } from './forms';

type Field = Block & { key: string };

const typeLabel = (block: Block | undefined) => (block ? (blockType(block.__component)?.label ?? 'Bloc') : 'Bloc');
const position = (index: number, total: number) => `position ${index + 1} sur ${total}`;
const errorCount = (error: unknown) => (error ? flattenErrors(error as FieldErrors).length || 1 : 0);

/** Retire les identifiants (bloc et sous-éléments) : une copie est un nouveau bloc */
function withoutIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutIds) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id').map(([key, item]) => [key, withoutIds(item)])) as T;
  }
  return value;
}

function focusBlock(key: string, target: 'header' | 'content' | string = 'header') {
  requestAnimationFrame(() => {
    const card = document.querySelector<HTMLElement>(`[data-block-key="${CSS.escape(key)}"]`);
    if (!card) return;
    const element =
      target === 'content'
        ? card.querySelector<HTMLElement>('[data-block-body] input, [data-block-body] select, [data-block-body] textarea, [data-block-body] [contenteditable="true"]')
        : card.querySelector<HTMLElement>(target === 'header' ? '[data-block-toggle]' : `[data-block-action="${target}"]`);
    (element ?? card.querySelector<HTMLElement>('[data-block-toggle]'))?.focus();
  });
}

function InsertButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="group relative flex h-6 items-center justify-center">
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <button
        type="button"
        onClick={onClick}
        className="relative inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-secondary opacity-70 hover:text-brand hover:opacity-100 focus-visible:opacity-100 dark:bg-sidebar"
      >
        <Plus aria-hidden="true" className="size-3.5" />
        <span className="sr-only">{label}</span>
        <span aria-hidden="true">Ajouter un bloc</span>
      </button>
    </div>
  );
}

function InsertionMarker() {
  return (
    <div className="flex items-center gap-2 py-1 text-[13px] font-semibold text-brand" role="note">
      <span aria-hidden="true" className="h-[3px] flex-1 rounded bg-brand" />
      Le bloc sera inséré ici
      <span aria-hidden="true" className="h-[3px] flex-1 rounded bg-brand" />
    </div>
  );
}

function BlockCard({
  before,
  field,
  block,
  index,
  total,
  path,
  expanded,
  errors,
  onToggle,
  onMove,
  onDuplicate,
  onRemove,
}: {
  before?: ReactNode;
  field: Field;
  block: Block;
  index: number;
  total: number;
  path: string;
  expanded: boolean;
  errors: number;
  onToggle: () => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const type = blockType(block.__component);
  const Icon = type?.icon;
  const label = typeLabel(block);
  const bodyId = useId();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: field.key });
  const summary = type?.summary(block) ?? '';

  return (
    <li ref={setNodeRef} data-block-key={field.key} style={{ transform: DndCSS.Transform.toString(transform), transition }} className={cn('list-none', isDragging && 'relative z-10')}>
      {before}
      <div
        className={cn(
          'rounded-[10px] border bg-surface dark:bg-sidebar',
          errors ? 'border-2 border-danger' : expanded ? 'border-brand' : 'border-border',
          isDragging && 'rotate-[-1deg] shadow-[0_12px_32px_rgb(28_27_24/0.22)]',
        )}
      >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Déplacer le bloc ${label}, ${position(index, total)}`}
          className="grid size-8 shrink-0 cursor-grab place-items-center rounded-md text-border-input hover:bg-surface-hover hover:text-text active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          data-block-toggle
          aria-label={`${label}, ${position(index, total)}${errors ? `, ${errors} erreur${errors > 1 ? 's' : ''}` : ''} : ${summary}`}
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-0.5 text-left"
        >
          <span aria-hidden="true" className={cn('grid size-7 shrink-0 place-items-center rounded-md', errors ? 'bg-danger-bg text-danger' : 'bg-brand-soft text-brand')}>
            {Icon && <Icon className="size-4" />}
          </span>
          <span className="shrink-0 font-semibold">{label}</span>
          {errors > 0 && (
            <span className="shrink-0 text-[13px] font-medium text-danger">
              {errors} erreur{errors > 1 ? 's' : ''}
            </span>
          )}
          <span className="min-w-0 truncate text-secondary">{summary}</span>
          <ChevronDown aria-hidden="true" className={cn('ml-auto size-4 shrink-0 text-secondary transition-transform', expanded && 'rotate-180')} />
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <ActionButton action="up" label={`Monter le bloc ${label}`} disabled={index === 0} onClick={() => onMove(index - 1)}>
            <ArrowUp aria-hidden="true" />
          </ActionButton>
          <ActionButton action="down" label={`Descendre le bloc ${label}`} disabled={index === total - 1} onClick={() => onMove(index + 1)}>
            <ArrowDown aria-hidden="true" />
          </ActionButton>
          <ActionButton action="duplicate" label={`Dupliquer le bloc ${label}`} onClick={onDuplicate}>
            <Copy aria-hidden="true" />
          </ActionButton>
          <ActionButton action="remove" label={`Supprimer le bloc ${label}`} onClick={onRemove} className="hover:text-danger">
            <Trash2 aria-hidden="true" />
          </ActionButton>
        </div>
      </div>
      <div id={bodyId} data-block-body hidden={!expanded} className="border-t border-border-row px-4 py-5 md:px-5">
        {expanded && <BlockForm block={block} path={path} />}
      </div>
      </div>
    </li>
  );
}

function ActionButton({ action, label, disabled, onClick, className, children }: { action: string; label: string; disabled?: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <Button type="button" variant="ghost" size="icon" data-block-action={action} aria-label={label} title={label} disabled={disabled} onClick={onClick} className={cn('size-8 text-secondary disabled:opacity-40', className)}>
      {children}
    </Button>
  );
}

export function BlockEditor({
  name = 'blocks',
  heading = 'Contenu de la page',
  emptyTitle = 'Cette page est vide. Ajoutez un premier bloc.',
}: {
  name?: string;
  heading?: string;
  emptyTitle?: string;
}) {
  const { control, getValues } = useFormContext();
  /** Valeur actuelle d'un bloc au moment d'une action (useWatch peut avoir un rendu de retard) */
  const current = (index: number) => getValues(`${name}.${index}`) as Block;
  const { fields, insert, remove, move } = useFieldArray({ control, name, keyName: 'key' });
  const values = (useWatch({ control, name }) as Block[] | undefined) ?? [];
  const { errors, submitCount } = useFormState({ control, name });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [catalogAt, setCatalogAt] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const headingId = useId();
  const catalogReturn = useRef<HTMLElement | null>(null);
  const items = fields as unknown as Field[];
  const blockErrors = (errors as Record<string, unknown>)[name] as unknown[] | undefined;
  const errorsAt = (index: number) => errorCount(Array.isArray(blockErrors) ? blockErrors[index] : undefined);

  const announce = (text: string) => {
    setMessage('');
    requestAnimationFrame(() => setMessage(text));
  };

  // À chaque soumission, les blocs en erreur s'ouvrent (état ajusté pendant le rendu, pas dans un effet)
  const [seenSubmit, setSeenSubmit] = useState(submitCount);
  if (submitCount !== seenSubmit) {
    setSeenSubmit(submitCount);
    if (Array.isArray(blockErrors)) {
      const next = new Set(expanded);
      blockErrors.forEach((error, index) => error && items[index] && next.add(items[index].key));
      setExpanded(next);
    }
  }

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const moveBlock = (from: number, to: number, via: 'button' | 'drag') => {
    if (to < 0 || to >= items.length || from === to) return;
    const key = items[from]!.key;
    const label = typeLabel(current(from));
    move(from, to);
    announce(`Bloc ${label} déplacé en ${position(to, items.length)}.`);
    if (via === 'button') {
      const edge = to === 0 ? 'down' : to === items.length - 1 ? 'up' : to < from ? 'up' : 'down';
      focusBlock(key, edge);
    }
  };

  const duplicate = (index: number) => {
    const copy = withoutIds(current(index));
    insert(index + 1, copy);
    announce(`Bloc ${typeLabel(copy)} dupliqué en ${position(index + 1, items.length + 1)}.`);
    requestAnimationFrame(() => {
      const key = (document.querySelectorAll<HTMLElement>('[data-block-key]')[index + 1]?.dataset.blockKey) ?? '';
      if (key) focusBlock(key);
    });
  };

  const removeBlock = (index: number) => {
    const removed = current(index);
    const label = typeLabel(removed);
    remove(index);
    const next = items[index + 1] ?? items[index - 1];
    if (next) focusBlock(next.key);
    else requestAnimationFrame(() => document.getElementById(`${headingId}-ajout`)?.focus());
    toast.success(`Bloc « ${label} » supprimé.`, {
      label: 'Annuler',
      onClick: () => {
        insert(index, removed);
        announce(`Bloc ${label} rétabli en ${position(index, items.length)}.`);
      },
    });
  };

  const openCatalog = (at: number) => {
    catalogReturn.current = document.activeElement as HTMLElement | null;
    setCatalogAt(at);
  };

  const addBlock = (block: Block) => {
    const at = catalogAt ?? items.length;
    insert(at, block);
    setCatalogAt(null);
    announce(`Bloc ${typeLabel(block)} ajouté en ${position(at, items.length + 1)}.`);
    requestAnimationFrame(() => {
      const key = document.querySelectorAll<HTMLElement>('[data-block-key]')[at]?.dataset.blockKey;
      if (!key) return;
      // Rendu immédiat : hors d'un événement React, le bloc ouvert n'existerait pas encore à l'image
      // suivante sur une machine lente, et le focus tomberait sur son en-tête au lieu du premier champ
      flushSync(() => setExpanded((current) => new Set(current).add(key)));
      focusBlock(key, 'content');
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const indexOf = (id: string | number) => items.findIndex((item) => item.key === id);
  const labelOf = (id: string | number) => typeLabel(current(indexOf(id)));
  // Pas d'annonce tant que la position visée ne change pas : les consignes de départ restent lues
  const lastOver = useRef<string | number | null>(null);
  // Nom du bloc saisi, lu au départ : à la fin, le formulaire a déjà changé d'ordre
  const dragged = useRef('');
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      lastOver.current = active.id;
      dragged.current = labelOf(active.id);
      return `Bloc ${dragged.current} saisi, ${position(indexOf(active.id), items.length)}. Flèches haut et bas pour le déplacer, Espace pour le déposer, Échap pour annuler.`;
    },
    onDragOver: ({ over }) => {
      if ((over?.id ?? null) === lastOver.current) return undefined;
      lastOver.current = over?.id ?? null;
      return over ? `Bloc ${dragged.current} en ${position(indexOf(over.id), items.length)}.` : `Bloc ${dragged.current} hors de la liste.`;
    },
    onDragEnd: ({ over }) => (over ? `Bloc ${dragged.current} déplacé en ${position(indexOf(over.id), items.length)}.` : `Bloc ${dragged.current} reposé.`),
    onDragCancel: ({ active: moved }) => `Déplacement annulé, bloc ${dragged.current} reste en ${position(indexOf(moved.id), items.length)}.`,
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      move(indexOf(active.id), indexOf(over.id));
    }
  };

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-[11px] font-semibold tracking-[0.06em] text-secondary uppercase">
        {heading} · {items.length} bloc{items.length > 1 ? 's' : ''}
      </h2>
      <div aria-live="polite" className="sr-only">
        {message}
      </div>

      {items.length === 0 ? (
        catalogAt === null ? (
          <div className="rounded-xl border-2 border-dashed border-border-input p-8 text-center">
            <p className="font-semibold">{emptyTitle}</p>
            <p className="mx-auto mt-1 max-w-md text-secondary">Un bloc est un élément du contenu : un texte, une image, des documents à télécharger…</p>
            <Button type="button" id={`${headingId}-ajout`} className="mt-4" onClick={() => openCatalog(0)}>
              <Plus aria-hidden="true" />
              Ajouter un bloc
            </Button>
          </div>
        ) : (
          <InsertionMarker />
        )
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable: 'Pour déplacer ce bloc, appuyez sur Espace ou Entrée, puis utilisez les flèches haut et bas. Espace ou Entrée pour déposer, Échap pour annuler.',
            },
          }}
        >
          <SortableContext items={items.map((item) => item.key)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-1">
              {items.map((field, index) => (
                  <BlockCard
                    key={field.key}
                    before={catalogAt === index ? <InsertionMarker /> : index > 0 && <InsertButton label={`Ajouter un bloc en ${position(index, items.length + 1)}`} onClick={() => openCatalog(index)} />}
                    field={field}
                    block={values[index] ?? field}
                    index={index}
                    total={items.length}
                    path={`${name}.${index}`}
                    expanded={expanded.has(field.key)}
                    errors={errorsAt(index)}
                    onToggle={() => toggle(field.key)}
                    onMove={(to) => moveBlock(index, to, 'button')}
                    onDuplicate={() => duplicate(index)}
                    onRemove={() => removeBlock(index)}
                  />
              ))}
            </ol>
            {catalogAt === items.length && <InsertionMarker />}
          </SortableContext>
        </DndContext>
      )}

      {items.length > 0 && (
        <button
          type="button"
          id={`${headingId}-ajout`}
          onClick={() => openCatalog(items.length)}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-border-input py-3 font-semibold text-brand hover:bg-surface-hover"
        >
          <Plus aria-hidden="true" className="size-4" />
          Ajouter un bloc
        </button>
      )}

      <BlockCatalog
        open={catalogAt !== null}
        position={catalogAt === null ? '' : position(catalogAt, items.length + 1)}
        onSelect={addBlock}
        onClose={() => {
          setCatalogAt(null);
          requestAnimationFrame(() => catalogReturn.current?.focus());
        }}
      />
    </section>
  );
}

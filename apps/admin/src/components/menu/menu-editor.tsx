/**
 * Menu du site (handoff 6.9, ticket #137) : menu principal (7 entrées, un niveau de sous-menu,
 * 10 liens par sous-menu) et liens de pied de page, selon les emplacements du thème.
 * - Limites affichées d'avance (« 5 entrées sur 7 », « 4 sous-entrées sur 10 ») ;
 * - chaque entrée : poignée (glisser-déposer), type, libellé, cible, Monter / Descendre,
 *   Indenter (seul moyen de créer un sous-menu) / Désindenter, Modifier, Supprimer ;
 * - aperçu en direct : la vraie page d'accueil du thème avec le menu non enregistré ;
 * - réglage : bouton « Enregistrer » explicite, garde des modifications non enregistrées.
 */
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type Announcements, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, GripVertical, IndentDecrease, IndentIncrease, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SECTIONS, THEMES } from '@communeo/core';
import { PreviewDrawer, PreviewFullscreen, PreviewView, type PreviewState } from '@/components/editor/preview-panel';
import { UnsavedChangesGuard } from '@/components/form';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/api';
import { formatListDate } from '@/lib/dates';
import { focusHeadingIfRequested } from '@/lib/focus';
import { previewQuery } from '@/lib/preview';
import { saveSiteSettings, type PageSummary, type SiteSettings } from '@/lib/site-settings';
import { themeName } from '@/lib/session';
import { rank, stepCoordinates } from '@/lib/dnd';
import { cn } from '@/lib/utils';
import { EntryDialog } from './entry-dialog';
import * as model from './model';
import type { ListId, MenuEntry, MenuState } from './model';

const sameList = (a: ListId, b: ListId) => (typeof a === 'string' || typeof b === 'string' ? a === b : a.group === b.group);

const TYPE_BADGES: Record<MenuEntry['type'], { label: string; className: string }> = {
  page: { label: 'Page', className: 'bg-neutral-bg text-neutral' },
  section: { label: 'Rubrique', className: 'bg-brand-soft text-brand' },
  external: { label: 'Lien externe', className: 'bg-warning-bg text-warning' },
  group: { label: 'Groupe', className: 'bg-brand-soft text-brand' },
};

interface Lookup {
  pages: Map<string, PageSummary>;
  unpublished: Set<string>;
  disabledSections: Set<string>;
}

function labelOf(entry: MenuEntry, lookup: Lookup): string {
  if (entry.label.trim()) return entry.label.trim();
  if (entry.type === 'page') return lookup.pages.get(entry.pageDocumentId)?.title ?? 'Page introuvable';
  if (entry.type === 'section') return SECTIONS[entry.section].label;
  return entry.label;
}

function targetOf(entry: MenuEntry, lookup: Lookup): string {
  if (entry.type === 'page') {
    const page = lookup.pages.get(entry.pageDocumentId);
    return page ? `/${page.slug}` : '';
  }
  if (entry.type === 'section') return SECTIONS[entry.section].path;
  if (entry.type === 'external') {
    try {
      const url = new URL(entry.url);
      return url.protocol.startsWith('http') ? url.host : entry.url;
    } catch {
      return entry.url;
    }
  }
  return `${entry.children.length} sous-entrée${entry.children.length > 1 ? 's' : ''} sur ${model.LIMITS.children}`;
}

/** Ce qui empêche l'entrée d'apparaître sur le site, dit en clair */
function noticeOf(entry: MenuEntry, lookup: Lookup): { text: string; danger?: boolean } | null {
  if (entry.type === 'page') {
    if (!lookup.pages.has(entry.pageDocumentId)) return { text: "Page introuvable (supprimée ?) : l'entrée n'apparaît pas sur le site.", danger: true };
    if (lookup.unpublished.has(entry.pageDocumentId)) return { text: 'Page en brouillon : elle apparaîtra dans le menu une fois publiée.' };
  }
  if (entry.type === 'section' && lookup.disabledSections.has(entry.section)) return { text: "Rubrique désactivée pour votre commune : l'entrée n'apparaît pas." };
  if (entry.type === 'group' && entry.children.length === 0) return { text: "Groupe vide : il n'apparaît pas tant qu'il ne contient aucun lien." };
  return null;
}

export function MenuEditor({ site, pages, unpublished }: { site: SiteSettings; pages: PageSummary[]; unpublished: Set<string> }) {
  const client = useQueryClient();
  const initial = useMemo(() => model.fromConfig(site.navigation_config), [site.navigation_config]);
  const [state, setState] = useState<MenuState>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(model.toConfig(initial)));
  const [savedAt, setSavedAt] = useState(site.updatedAt);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dialog, setDialog] = useState<{ list: ListId; entry: MenuEntry | null } | null>(null);
  const [preview, setPreview] = useState<'drawer' | 'fullscreen' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Entrée ajoutée ou modifiée : le focus y va quand la fenêtre se ferme
  const lastEdited = useRef<string | null>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Menu du site · Communeo';
  }, []);

  const config = model.toConfig(state);
  const serialized = JSON.stringify(config);
  const dirty = serialized !== saved;
  const theme = THEMES.find((entry) => entry.id === site.theme) ?? THEMES[0];
  const lookup: Lookup = {
    pages: new Map(pages.map((page) => [page.documentId, page])),
    unpublished,
    disabledSections: new Set([...(site.comarquage_enabled ? [] : ['demarches']), ...(site.open_data_enabled ? [] : ['open-data'])]),
  };

  // Aperçu : le menu non enregistré part au serveur de preview après une courte pause
  const [previewSettings, setPreviewSettings] = useState(() => JSON.stringify({ navigation_config: config }));
  useEffect(() => {
    const timer = setTimeout(() => setPreviewSettings(JSON.stringify({ navigation_config: JSON.parse(serialized) })), 400);
    return () => clearTimeout(timer);
  }, [serialized]);
  const [version, setVersion] = useState(0);
  const previewLink = useQuery(previewQuery({ type: 'home' }));
  const previewState: PreviewState = {
    url: previewLink.data?.url,
    unavailable: previewLink.isError ? 'Aperçu indisponible pour le moment.' : undefined,
    version,
    title: 'Accueil',
    themeName: themeName(site.theme),
    settings: previewSettings,
    caption: `Aperçu de l'accueil${dirty ? ' avec vos modifications' : ''} — thème ${themeName(site.theme)}`,
  };

  /** Applique une opération ; `focus` : bouton à refocaliser (l'entrée a changé de place) */
  const apply = (next: MenuState | null, announce: string, focus?: { key: string; action: string }) => {
    if (!next) return;
    setState(next);
    setMessage(announce);
    if (focus) {
      requestAnimationFrame(() => {
        const row = document.querySelector(`[data-entry="${focus.key}"]`);
        const target = row?.querySelector<HTMLButtonElement>(`[data-action="${focus.action}"]:not(:disabled)`) ?? row?.querySelector<HTMLButtonElement>('[data-action]:not(:disabled)');
        target?.focus();
      });
    }
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await saveSiteSettings(client, site.documentId, { navigation_config: config });
      setSaved(serialized);
      setSavedAt(new Date().toISOString());
      void client.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success('Menu enregistré. Il sera en ligne à la prochaine mise en ligne du site.');
      return true;
    } catch (error) {
      toast.error(`Le menu n'a pas pu être enregistré : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`, { label: 'Réessayer', onClick: () => void save() });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setState(model.fromConfig(JSON.parse(saved)));
    setMessage('Modifications annulées : le menu enregistré est rétabli.');
  };

  const listLabel = (list: ListId) => (list === 'main' ? 'menu' : list === 'footer' ? 'pied de page' : `groupe « ${labelOf(state.main.find((entry) => entry.key === list.group)!, lookup)} »`);

  /** `action` : bouton Monter / Descendre à refocaliser ; sans lui (glisser-déposer), dnd-kit annonce déjà */
  const moveEntry = (list: ListId, from: number, to: number, action?: string) => {
    const entries = model.listOf(state, list);
    const entry = entries[from]!;
    apply(model.move(state, list, from, to), action ? `« ${labelOf(entry, lookup)} » déplacé en ${rank(to, entries.length)}.` : '', action ? { key: entry.key, action } : undefined);
  };

  const rowProps = (list: ListId, entry: MenuEntry, index: number, total: number) => ({
    entry,
    index,
    total,
    label: labelOf(entry, lookup),
    target: targetOf(entry, lookup),
    notice: noticeOf(entry, lookup),
    onUp: () => moveEntry(list, index, index - 1, 'monter'),
    onDown: () => moveEntry(list, index, index + 1, 'descendre'),
    onEdit: () => setDialog({ list, entry }),
    onRemove: () => {
      apply(model.remove(state, list, entry.key), `« ${labelOf(entry, lookup)} » retiré du ${listLabel(list)}${entry.type === 'group' && entry.children.length ? `, avec ses ${entry.children.length} sous-entrées` : ''}.`);
      requestAnimationFrame(() => document.getElementById(list === 'footer' ? 'ajout-pied' : 'ajout-entree')?.focus());
    },
  });

  const mainCount = state.main.length;
  const mainFull = mainCount >= model.LIMITS.main;
  const footerFull = state.footer.length >= model.LIMITS.footer;

  return (
    <div className="-mx-4 -mt-6 md:-mx-8 md:-mt-7">
      {/* Barre d'enregistrement (écrans de réglages) */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-2.5 md:px-8 dark:bg-sidebar">
        <h1 ref={heading} className="flex-1 text-[15px] leading-tight font-semibold tracking-normal outline-none">
          Menu du site
        </h1>
        <p role="status" className="text-[13px] text-secondary">
          {dirty ? <span className="font-medium text-warning">Modifications non enregistrées</span> : `Dernier enregistrement : ${formatListDate(new Date(savedAt)).replace(/^./, (c) => c.toLowerCase())}`}
        </p>
        <Button type="button" variant="tertiary" className="hidden md:max-[1199px]:inline-flex" onClick={() => setPreview('drawer')}>
          <Eye aria-hidden="true" />
          Aperçu
        </Button>
        <Button type="button" variant="tertiary" className="md:hidden" onClick={() => setPreview('fullscreen')}>
          <Eye aria-hidden="true" />
          Aperçu
        </Button>
        {/* Enregistrement : dans la barre sur ordinateur, fixé en bas de l'écran sur mobile */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-surface p-3 md:static md:z-auto md:border-0 md:bg-transparent md:p-0 dark:bg-sidebar md:dark:bg-transparent">
          <Button type="button" variant="secondary" aria-label="Annuler les modifications" className="max-md:h-11 max-md:flex-1" disabled={!dirty || saving} onClick={cancel}>
            Annuler<span className="max-md:hidden">&nbsp;les modifications</span>
          </Button>
          <Button type="button" className="max-md:h-11 max-md:flex-1" disabled={!dirty || saving} onClick={() => void save()}>
            {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="flex">
        <div className="min-w-0 flex-1 px-4 pt-6 pb-28 md:px-8 md:py-7">
          <div className="mx-auto max-w-[760px]">
            <div role="status" className="sr-only">
              {message}
            </div>

            <section aria-labelledby="menu-principal">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="menu-principal" className="text-xl">
                    Menu principal
                  </h2>
                  <p className="mt-1 text-secondary">
                    {mainCount} entrée{mainCount > 1 ? 's' : ''} sur {model.LIMITS.main} · un seul niveau de sous-menu · {model.LIMITS.children} liens par sous-menu
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Button id="ajout-entree" type="button" disabled={mainFull} onClick={() => setDialog({ list: 'main', entry: null })}>
                    <Plus aria-hidden="true" />
                    Ajouter une entrée
                  </Button>
                  {mainFull && <p className="text-[13px] text-secondary">Menu complet : retirez une entrée pour en ajouter une.</p>}
                </div>
              </div>

              {mainCount === 0 ? (
                <div className="mt-4 rounded-xl border-2 border-dashed border-border-input p-8 text-center">
                  <p className="font-semibold">Le menu est vide.</p>
                  <p className="mx-auto mt-1 max-w-md text-secondary">Le site affiche un menu par défaut (Actualités, Agenda, Mairie, Contact) tant que vous n'ajoutez pas d'entrée.</p>
                </div>
              ) : (
                <SortableEntries list="main" entries={state.main} lookup={lookup} onMove={(from, to) => moveEntry('main', from, to)}>
                  {state.main.map((entry, index) =>
                    entry.type === 'group' ? (
                      <EntryRow key={entry.key} {...rowProps('main', entry, index, mainCount)} indent={{ blocker: 'Un groupe ne peut pas entrer dans un autre groupe : un seul niveau de sous-menu.', onClick: () => undefined }}>
                        <div className="mt-2 space-y-2 pl-6 md:pl-10">
                          {entry.children.length > 0 && (
                            <SortableEntries list={{ group: entry.key }} entries={entry.children} lookup={lookup} onMove={(from, to) => moveEntry({ group: entry.key }, from, to)}>
                              {entry.children.map((child, childIndex) => (
                                <EntryRow
                                  key={child.key}
                                  {...rowProps({ group: entry.key }, child, childIndex, entry.children.length)}
                                  nested
                                  outdent={{
                                    blocker: model.outdentBlocker(state),
                                    onClick: () =>
                                      apply(model.outdent(state, entry.key, childIndex), `« ${labelOf(child, lookup)} » sorti du groupe, en ${rank(index + 1, mainCount + 1)} du menu.`, { key: child.key, action: 'indenter' }),
                                  }}
                                />
                              ))}
                            </SortableEntries>
                          )}
                          <AddButton
                            label={`Ajouter dans « ${labelOf(entry, lookup)} »`}
                            disabled={entry.children.length >= model.LIMITS.children}
                            note={entry.children.length >= model.LIMITS.children ? `${model.LIMITS.children} sur ${model.LIMITS.children}` : undefined}
                            onClick={() => setDialog({ list: { group: entry.key }, entry: null })}
                          />
                        </div>
                      </EntryRow>
                    ) : (
                      <EntryRow
                        key={entry.key}
                        {...rowProps('main', entry, index, mainCount)}
                        indent={{
                          blocker: model.indentBlocker(state, index),
                          onClick: () => {
                            const group = state.main[index - 1]!;
                            apply(model.indent(state, index), `« ${labelOf(entry, lookup)} » placé dans le groupe « ${labelOf(group, lookup)} ».`, { key: entry.key, action: 'desindenter' });
                          },
                        }}
                      />
                    ),
                  )}
                </SortableEntries>
              )}
            </section>

            <section aria-labelledby="pied-de-page" className="mt-10">
              <h2 id="pied-de-page" className="text-[11px] font-semibold tracking-[0.06em] text-secondary uppercase">
                Liens de pied de page
              </h2>
              {theme.menus.footer ? (
                <>
                  <p className="mt-1 text-[13px] text-secondary">
                    {state.footer.length} lien{state.footer.length > 1 ? 's' : ''} sur {model.LIMITS.footer}. Les pages obligatoires (mentions légales, données personnelles, accessibilité, plan du site…) sont ajoutées
                    automatiquement.
                  </p>
                  <div className="mt-3 space-y-2">
                    {state.footer.length > 0 && (
                      <SortableEntries list="footer" entries={state.footer} lookup={lookup} onMove={(from, to) => moveEntry('footer', from, to)}>
                        {state.footer.map((entry, index) => (
                          <EntryRow key={entry.key} {...rowProps('footer', entry, index, state.footer.length)} />
                        ))}
                      </SortableEntries>
                    )}
                    <AddButton id="ajout-pied" label="Ajouter un lien de pied de page" disabled={footerFull} note={footerFull ? `${model.LIMITS.footer} sur ${model.LIMITS.footer}` : undefined} onClick={() => setDialog({ list: 'footer', entry: null })} />
                  </div>
                </>
              ) : (
                <p className="mt-1 text-[13px] text-secondary">Le thème {theme.name} n'affiche pas de liens de pied de page : seules les pages obligatoires y figurent.</p>
              )}
            </section>
          </div>
        </div>

        <div className="sticky top-[113px] hidden h-[calc(100dvh-113px)] w-[440px] shrink-0 border-l border-border min-[1200px]:flex">
          <aside aria-label="Aperçu du menu" className="min-w-0 flex-1 bg-surface dark:bg-sidebar">
            <PreviewView state={previewState} onReload={() => setVersion((value) => value + 1)} onFullscreen={() => setPreview('fullscreen')} />
          </aside>
        </div>
      </div>

      <EntryDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        entry={dialog?.entry ?? null}
        title={dialog?.entry ? `Modifier « ${labelOf(dialog.entry, lookup)} »` : dialog && dialog.list !== 'main' ? `Ajouter dans le ${listLabel(dialog.list)}` : 'Ajouter une entrée au menu'}
        allowGroup={dialog?.list === 'main'}
        pages={pages}
        unpublished={unpublished}
        disabledSections={lookup.disabledSections}
        onSubmit={(entry) => {
          if (!dialog) return;
          lastEdited.current = entry.key;
          if (dialog.entry) apply(model.replace(state, dialog.list, entry), `« ${labelOf(entry, lookup)} » modifié.`);
          else apply(model.add(state, dialog.list, entry), `« ${labelOf(entry, lookup)} » ajouté au ${listLabel(dialog.list)}.`);
        }}
        focusAfterSubmit={() => document.querySelector<HTMLElement>(`[data-entry="${lastEdited.current}"] [data-action="modifier"]`)}
      />
      <PreviewDrawer open={preview === 'drawer'} onOpenChange={(open) => setPreview(open ? 'drawer' : null)} state={previewState} onReload={() => setVersion((value) => value + 1)} onFullscreen={() => setPreview('fullscreen')} />
      <PreviewFullscreen open={preview === 'fullscreen'} onOpenChange={(open) => setPreview(open ? 'fullscreen' : null)} state={previewState} onReload={() => setVersion((value) => value + 1)} />
      <UnsavedChangesGuard when={dirty} onSave={save} />
    </div>
  );
}

function SortableEntries({ list, entries, lookup, onMove, children }: { list: ListId; entries: MenuEntry[]; lookup: Lookup; onMove: (from: number, to: number) => void; children: ReactNode }) {
  const keys = entries.map((entry) => entry.key);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: stepCoordinates(keys) }));
  const indexOf = (id: string | number) => entries.findIndex((entry) => entry.key === id);
  const lastOver = useRef<string | number | null>(null);
  const dragged = useRef('');
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      lastOver.current = active.id;
      dragged.current = labelOf(entries[indexOf(active.id)]!, lookup);
      return `« ${dragged.current} » saisi, ${rank(indexOf(active.id), entries.length)}. Flèches haut et bas pour le déplacer, Espace pour le déposer, Échap pour annuler.`;
    },
    onDragOver: ({ over }) => {
      if ((over?.id ?? null) === lastOver.current) return undefined;
      lastOver.current = over?.id ?? null;
      return over ? `« ${dragged.current} » en ${rank(indexOf(over.id), entries.length)}.` : `« ${dragged.current} » hors de la liste.`;
    },
    onDragEnd: ({ over }) => (over ? `« ${dragged.current} » déplacé en ${rank(indexOf(over.id), entries.length)}.` : `« ${dragged.current} » reposé.`),
    onDragCancel: ({ active }) => `Déplacement annulé, « ${dragged.current} » reste en ${rank(indexOf(active.id), entries.length)}.`,
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(indexOf(active.id), indexOf(over.id));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: 'Pour déplacer cette entrée, appuyez sur Espace ou Entrée, puis utilisez les flèches haut et bas. Espace ou Entrée pour déposer, Échap pour annuler.' },
      }}
    >
      <SortableContext items={entries.map((entry) => entry.key)} strategy={verticalListSortingStrategy}>
        <ol className={cn('space-y-2', sameList(list, 'main') && 'mt-4')}>{children}</ol>
      </SortableContext>
    </DndContext>
  );
}

interface Movement {
  blocker: string | null;
  onClick: () => void;
}

function EntryRow({
  entry,
  index,
  total,
  label,
  target,
  notice,
  nested,
  indent,
  outdent,
  onUp,
  onDown,
  onEdit,
  onRemove,
  children,
}: {
  entry: MenuEntry;
  index: number;
  total: number;
  label: string;
  target: string;
  notice: { text: string; danger?: boolean } | null;
  nested?: boolean;
  indent?: Movement;
  outdent?: Movement;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onRemove: () => void;
  children?: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: entry.key });
  const badge = TYPE_BADGES[entry.type];
  const group = entry.type === 'group';
  return (
    <li
      ref={setNodeRef}
      data-entry={entry.key}
      style={{ transform: DndCSS.Transform.toString(transform), transition }}
      className={cn(
        'list-none rounded-xl border bg-surface px-3 py-2.5 dark:bg-sidebar',
        group ? 'border-brand' : 'border-border',
        nested && 'rounded-[10px] bg-surface',
        isDragging && 'relative z-10 shadow-[0_12px_32px_rgb(28_27_24/0.22)]',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:flex-nowrap">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Déplacer « ${label} », ${rank(index, total)}`}
          className="grid size-8 shrink-0 cursor-grab place-items-center rounded-md text-border-input hover:bg-surface-hover hover:text-text active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
        <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold', badge.className)}>{badge.label}</span>
        <span className="flex min-w-0 flex-1 basis-40 items-baseline gap-3">
          <span className={cn('min-w-0 md:truncate', group ? 'font-semibold' : 'font-medium')}>{label}</span>
          {/* La cible prend la place du libellé sur petit écran : on ne la montre qu'à partir de 640 px */}
          <span title={target} className="ml-auto hidden min-w-0 shrink truncate text-[13px] text-secondary sm:inline">
            {target}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          <IconButton action="monter" label={`Monter « ${label} »`} disabled={index === 0} onClick={onUp} icon={<ArrowUp />} />
          <IconButton action="descendre" label={`Descendre « ${label} »`} disabled={index === total - 1} onClick={onDown} icon={<ArrowDown />} />
          {indent && <IconButton action="indenter" label={`Indenter « ${label} » (placer dans le groupe au-dessus)`} blocker={indent.blocker} onClick={indent.onClick} icon={<IndentIncrease />} />}
          {outdent && <IconButton action="desindenter" label={`Désindenter « ${label} » (sortir du groupe)`} blocker={outdent.blocker} onClick={outdent.onClick} icon={<IndentDecrease />} />}
          <IconButton action="modifier" label={`Modifier « ${label} »`} onClick={onEdit} icon={<Pencil />} />
          <IconButton action="supprimer" label={`Supprimer « ${label} »`} onClick={onRemove} icon={<Trash2 />} danger />
        </span>
      </div>
      {notice && <p className={cn('mt-1 pl-11 text-[13px]', notice.danger ? 'text-danger' : 'text-secondary')}>{notice.text}</p>}
      {children}
    </li>
  );
}

/**
 * Bouton icône. Une action bloquée par une règle (indenter sans groupe au-dessus…) reste focalisable
 * (`aria-disabled`) : sa raison est dans l'info-bulle, dans son nom accessible, et dans un message
 * si on l'active quand même.
 */
function IconButton({ action, label, icon, onClick, disabled, blocker, danger }: { action: string; label: string; icon: ReactNode; onClick: () => void; disabled?: boolean; blocker?: string | null; danger?: boolean }) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-action={action}
      aria-label={blocker ? `${label} — impossible : ${blocker}` : label}
      aria-disabled={blocker ? true : undefined}
      disabled={disabled}
      // Action bloquée : la raison s'affiche aussi au toucher (l'info-bulle n'existe pas sur mobile)
      onClick={blocker ? () => toast.error(`Impossible : ${blocker}`) : onClick}
      className={cn('size-8 disabled:opacity-35 aria-disabled:cursor-not-allowed aria-disabled:opacity-35', danger && 'text-danger')}
    >
      {icon}
    </Button>
  );
  return blocker ? (
    <Tooltip label={blocker} side="top">
      {button}
    </Tooltip>
  ) : (
    button
  );
}

function AddButton({ id, label, onClick, disabled, note }: { id?: string; label: string; onClick: () => void; disabled?: boolean; note?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-brand px-3 text-sm font-semibold text-brand hover:bg-brand-soft disabled:border-border-input disabled:text-secondary disabled:hover:bg-transparent"
      >
        <Plus aria-hidden="true" className="size-4" />
        {label}
      </button>
      {note && <span className="text-[13px] text-secondary">{note} : sous-menu complet</span>}
    </div>
  );
}

/**
 * Gabarit de liste des contenus (handoff 6.2, ticket #134), le même pour tous les types :
 * - titre, compteurs (« 12 pages · 2 brouillons · 1 programmée »), action principale ;
 * - recherche, filtres (Statut + ceux du type), tri au clic sur l'en-tête, 20 par page ou 50 en « Compact » ;
 * - sélection → barre d'actions groupées (Publier, Dépublier, Supprimer) à la place des filtres ;
 * - lignes et cartes cliquables par un vrai lien (le titre), menu ⋯ (Modifier, Dupliquer, Voir sur le site, Supprimer) ;
 * - états vide, aucun résultat, chargement (squelettes), erreur ; cartes et bouton fixé en bas sur mobile.
 * L'état (recherche, filtres, tri, page) est dans l'adresse ; la densité est mémorisée par type.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Copy, ExternalLink, FileText, ImageIcon, MoreHorizontal, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  deleteDocument,
  listQuery,
  publicationStatesQuery,
  publishDocument,
  refreshContent,
  unpublishDocument,
  type ListParams,
  type Publication,
  type StatusFilter,
} from '@/lib/content-list';
import { formatListDate } from '@/lib/dates';
import { sessionQuery } from '@/lib/session';
import { cn } from '@/lib/utils';
import { Pagination } from './pagination';
import { PublicationBadge } from './publication-badge';
import { Toolbar, type PillFilter } from './toolbar';
import { agree, countOf, type ContentListConfig, type ListRow, type ListSearch } from './types';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'publie', label: 'Publié' },
  { value: 'programme', label: 'Programmé' },
];

const DEFAULT_SORT = { field: 'updatedAt', order: 'desc' as const };

function useDensity(type: string, compactByDefault = false) {
  const key = `communeo.list-density.${type}`;
  const [compact, setCompact] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? stored === 'compact' : compactByDefault;
    } catch {
      return compactByDefault;
    }
  });
  const change = (value: boolean) => {
    setCompact(value);
    try {
      localStorage.setItem(key, value ? 'compact' : 'normal');
    } catch {
      /* navigation privée : non mémorisé */
    }
  };
  return [compact, change] as const;
}

export function ContentList<T extends ListRow>({
  config,
  search,
  onSearchChange,
  icon: EmptyIcon = FileText,
}: {
  config: ContentListConfig<T>;
  search: ListSearch;
  onSearchChange: (patch: Partial<ListSearch>, options?: { replace?: boolean }) => void;
  icon?: LucideIcon;
}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { noun, source } = config;
  const [compact, setCompact] = useDensity(source.type, config.compactByDefault);
  const sort = config.defaultSort ?? DEFAULT_SORT;
  const sortable = [
    { field: 'title', label: 'titre' },
    ...config.columns.filter((column) => column.sortField).map((column) => ({ field: column.sortField!, label: column.sortLabel ?? column.header.toLowerCase() })),
    { field: 'updatedAt', label: 'date de modification' },
  ];
  const sortField = sortable.some((entry) => entry.field === search.tri) ? search.tri! : sort.field;
  const order = search.ordre ?? (search.tri ? (sortField === 'title' ? 'asc' : 'desc') : sort.order);
  const sortText = sortable.find((entry) => entry.field === sortField)?.label ?? sortField;

  const filterValues = Object.fromEntries(
    (config.filters ?? []).flatMap((filter) => (typeof search[filter.key] === 'string' ? [[filter.field, search[filter.key] as string]] : [])),
  );
  const params: ListParams = {
    q: search.q ?? '',
    statut: search.statut,
    filters: filterValues,
    sort: sortField,
    order,
    page: search.page ?? 1,
    pageSize: compact ? 50 : 20,
  };
  const filtered = Boolean(params.q || params.statut || Object.keys(filterValues).length);

  const list = useQuery(listQuery<T>(client, source, params));
  const states = useQuery(publicationStatesQuery(source.type));
  const { data: session } = useQuery(sessionQuery);
  const liveUrl = session?.site?.live_url?.replace(/\/$/, '');
  const publication = (row: T): Publication => states.data?.[row.documentId] ?? { state: 'draft', scheduledAt: row.scheduled_at ?? null };

  // Page devenue vide (suppression de ses derniers éléments) : on recule
  const pageCount = list.data?.pageCount ?? 0;
  useEffect(() => {
    if (!list.isPlaceholderData && pageCount > 0 && params.page > pageCount) onSearchChange({ page: pageCount === 1 ? undefined : pageCount }, { replace: true });
  }, [pageCount, params.page, list.isPlaceholderData, onSearchChange]);

  // Sélection : vidée dès que la liste affichée change (recherche, filtre, tri, page)
  const paramsKey = JSON.stringify(params);
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({ key: paramsKey, ids: [] });
  const rows = list.data?.rows ?? [];
  const selected = selection.key === paramsKey ? selection.ids.filter((id) => rows.some((row) => row.documentId === id)) : [];
  const select = (ids: string[]) => setSelection({ key: paramsKey, ids });
  const [confirm, setConfirm] = useState<{ ids: string[]; title: string } | null>(null);

  const refresh = () => refreshContent(client, source.type);
  const titleOf = (id: string) => rows.find((row) => row.documentId === id)?.title ?? '';

  const bulk = async (kind: 'publish' | 'unpublish', ids: string[]) => {
    const targets = ids.filter((id) => {
      const { state } = publication(rows.find((row) => row.documentId === id)!);
      return kind === 'publish' ? state !== 'published' : state !== 'draft';
    });
    if (targets.length === 0) {
      toast.error(kind === 'publish' ? `${agree(noun, 'Déjà publié', ids.length)} : rien à publier.` : `${agree(noun, 'Aucun', 1)} n'est en ligne : rien à retirer.`);
      return;
    }
    const results = await Promise.allSettled(targets.map((id) => (kind === 'publish' ? publishDocument(source.type, id) : unpublishDocument(source.type, id))));
    const failed = targets.filter((_, index) => results[index]!.status === 'rejected');
    const done = targets.length - failed.length;
    await refresh();
    select(failed);
    if (done > 0) {
      toast.success(
        kind === 'publish'
          ? `${countOf(noun, done)} ${agree(noun, 'publié', done)}. Votre site sera mis à jour dans quelques instants.`
          : `${countOf(noun, done)} ${agree(noun, 'retiré', done)} du site, ${agree(noun, 'gardé', done)} en brouillon.`,
      );
    }
    if (failed.length > 0) {
      const first = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
      const reason = first.reason instanceof ApiError ? first.reason.message : 'erreur inattendue';
      toast.error(
        failed.length === 1
          ? `« ${titleOf(failed[0]!)} » n'a pas pu être ${agree(noun, kind === 'publish' ? 'publié' : 'retiré', 1)} : ${reason}`
          : `${countOf(noun, failed.length)} n'ont pas pu être ${agree(noun, kind === 'publish' ? 'publié' : 'retiré', failed.length)}. Ouvrez-les pour compléter les champs obligatoires.`,
      );
    }
  };

  const remove = async (ids: string[]) => {
    const results = await Promise.allSettled(ids.map((id) => deleteDocument(source.type, id)));
    const failed = ids.filter((_, index) => results[index]!.status === 'rejected');
    await refresh();
    select(failed);
    if (failed.length) throw new Error(`${countOf(noun, failed.length)} n'${failed.length > 1 ? 'ont' : 'a'} pas pu être ${agree(noun, 'supprimé', failed.length)}.`);
    toast.success(ids.length === 1 ? `« ${confirm?.title} » a été ${agree(noun, 'supprimé', 1)}.` : `${countOf(noun, ids.length)} ${agree(noun, 'supprimé', ids.length)}.`);
  };

  const duplicate = async (row: T) => {
    try {
      const documentId = await config.duplicate!(row, client);
      await refresh();
      toast.success(`Copie de « ${row.title} » créée en brouillon.`);
      await navigate({ to: config.editTo as never, params: { documentId } as never });
    } catch (error) {
      toast.error(`La copie n'a pas pu être créée : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`);
    }
  };

  const changeSort = (field: string) => {
    const nextOrder = field === sortField ? (order === 'asc' ? 'desc' : 'asc') : field === 'title' ? 'asc' : 'desc';
    onSearchChange({ tri: field, ordre: nextOrder, page: undefined });
  };

  const pills: PillFilter[] = [
    { key: 'statut', label: 'Statut', value: search.statut, options: STATUS_OPTIONS },
    ...(config.filters ?? []).map((filter) => ({ key: filter.key, label: filter.label, value: search[filter.key] as string | undefined, options: filter.options })),
  ];
  const clearAll = () => onSearchChange(Object.fromEntries(['q', 'statut', 'page', ...(config.filters ?? []).map((filter) => filter.key)].map((key) => [key, undefined])));

  const newButton = (className?: string) => (
    <Button asChild className={className}>
      <Link to={config.editTo as never} params={{ documentId: 'nouvelle' } as never}>
        <Plus aria-hidden="true" />
        {config.newLabel}
      </Link>
    </Button>
  );

  const counters = states.data ? summary(noun, Object.values(states.data)) : undefined;
  const empty = list.isSuccess && !filtered && list.data.total === 0;

  return (
    <div className="pb-24 md:pb-0">
      <PageHeader title={config.title} description={counters} actions={!empty && newButton('hidden md:inline-flex')} />

      {empty ? (
        <EmptyState icon={EmptyIcon} title={config.empty.title} text={config.empty.text} action={newButton()} />
      ) : (
        <div className="rounded-xl border border-border bg-surface md:overflow-hidden">
          {selected.length > 0 ? (
            <BulkBar
              label={`${countOf(noun, selected.length)} ${agree(noun, 'sélectionné', selected.length)}`}
              onPublish={() => void bulk('publish', selected)}
              onUnpublish={() => void bulk('unpublish', selected)}
              onDelete={() => setConfirm({ ids: selected, title: selected.length === 1 ? titleOf(selected[0]!) : '' })}
              onCancel={() => select([])}
            />
          ) : (
            <Toolbar
              noun={noun}
              query={params.q}
              onQuery={(q) => onSearchChange({ q: q || undefined, page: undefined }, { replace: true })}
              filters={pills}
              onFilter={(key, value) => onSearchChange({ [key]: value, page: undefined })}
              sortText={sortText}
              order={order}
              compact={compact}
              onCompact={(value) => {
                setCompact(value);
                onSearchChange({ page: undefined });
              }}
            />
          )}

          <p role="status" className="sr-only">
            {list.isSuccess && !list.isPlaceholderData ? `${countOf(noun, list.data.total)}, ${agree(noun, 'trié', list.data.total)} par ${sortText}, ${order === 'desc' ? 'ordre décroissant' : 'ordre croissant'}` : ''}
          </p>

          {list.isPending ? (
            <Skeleton label={`Chargement des ${noun.many}`} compact={compact} />
          ) : list.isError ? (
            <div role="alert" className="p-8 text-center">
              <p className="font-semibold">La liste n'a pas pu être chargée.</p>
              <Button variant="secondary" className="mt-3" onClick={() => void list.refetch()}>
                Réessayer
              </Button>
            </div>
          ) : list.data.total === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">
                Aucun{noun.feminine ? 'e' : ''} {noun.one} ne correspond {params.q ? `à « ${params.q} »` : 'aux filtres choisis'}
              </p>
              <p className="mt-1.5 text-secondary">Vérifiez l'orthographe ou élargissez la recherche.</p>
              <Button variant="secondary" className="mt-4" onClick={clearAll}>
                Effacer la recherche et les filtres
              </Button>
            </div>
          ) : (
            <div aria-busy={list.isFetching} className={cn(list.isPlaceholderData && 'opacity-60 motion-safe:transition-opacity')}>
              <table className="hidden w-full border-collapse md:table">
                <caption className="sr-only">
                  {config.title}, page {params.page} sur {pageCount}
                </caption>
                <thead>
                  <tr className="border-b border-border-row text-left text-xs font-semibold tracking-wide text-secondary uppercase">
                    <th scope="col" className="w-12 py-3 pl-4">
                      <SelectAll rows={rows} selected={selected} onChange={select} />
                    </th>
                    <SortHeader label="Titre" field="title" sortField={sortField} order={order} onSort={changeSort} />
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Statut
                    </th>
                    {config.columns.map((column) =>
                      column.sortField ? (
                        <SortHeader key={column.id} label={column.header} field={column.sortField} sortField={sortField} order={order} onSort={changeSort} className={cn(column.wideOnly && 'hidden min-[1200px]:table-cell')} />
                      ) : (
                        <th key={column.id} scope="col" className={cn('px-3 py-3 font-semibold', column.wideOnly && 'hidden min-[1200px]:table-cell')}>
                          {column.header}
                        </th>
                      ),
                    )}
                    <SortHeader label="Modifiée" field="updatedAt" sortField={sortField} order={order} onSort={changeSort} />
                    <th scope="col" className="w-14 py-3 pr-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isSelected = selected.includes(row.documentId);
                    const pub = publication(row);
                    return (
                      <tr key={row.documentId} className={cn('relative border-b border-border-row last:border-b-0 hover:bg-surface-hover', isSelected && 'bg-selected-row hover:bg-selected-row')}>
                        <td className={cn('relative z-[1] pl-4', compact ? 'py-1.5' : 'py-3')}>
                          <input
                            type="checkbox"
                            aria-label={`Sélectionner « ${row.title} »`}
                            checked={isSelected}
                            onChange={(event) => select(event.target.checked ? [...selected, row.documentId] : selected.filter((id) => id !== row.documentId))}
                            className="size-4 accent-brand"
                          />
                        </td>
                        <td className={cn('px-3', compact ? 'py-1.5' : 'py-3')}>
                          <div className="flex items-center gap-3">
                            {config.thumbnail && !compact && <Thumbnail media={config.thumbnail(row)} />}
                            <TitleLink config={config} row={row} className="line-clamp-2 max-w-[420px]" />
                          </div>
                        </td>
                        <td className="px-3">
                          <PublicationBadge state={pub.state} scheduledAt={pub.scheduledAt} />
                        </td>
                        {config.columns.map((column) => (
                          <td key={column.id} className={cn('px-3 text-[13px]', column.className, column.wideOnly && 'hidden min-[1200px]:table-cell')}>
                            {column.cell(row)}
                          </td>
                        ))}
                        <td className="px-3 text-[13px] whitespace-nowrap">{formatListDate(new Date(row.updatedAt))}</td>
                        <td className="relative z-[1] pr-4 text-right">
                          <RowMenu config={config} row={row} publication={pub} liveUrl={liveUrl} onDuplicate={() => void duplicate(row)} onDelete={() => setConfirm({ ids: [row.documentId], title: row.title })} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <ul className="space-y-3 p-3 md:hidden">
                {rows.map((row) => {
                  const pub = publication(row);
                  return (
                    <li key={row.documentId} className="relative rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-2">
                        <PublicationBadge state={pub.state} scheduledAt={pub.scheduledAt} />
                        <div className="relative z-[1] -mt-2 -mr-2">
                          <RowMenu config={config} row={row} publication={pub} liveUrl={liveUrl} onDuplicate={() => void duplicate(row)} onDelete={() => setConfirm({ ids: [row.documentId], title: row.title })} large />
                        </div>
                      </div>
                      <TitleLink config={config} row={row} className="mt-2 block text-[15px] font-semibold" />
                      <p className="mt-1.5 text-[13px] text-secondary">{[...(config.meta?.(row) ?? []), formatListDate(new Date(row.updatedAt))].filter(Boolean).join(' · ')}</p>
                    </li>
                  );
                })}
              </ul>

              <Pagination page={params.page} pageCount={pageCount} pageSize={params.pageSize} total={list.data.total} onPage={(page) => onSearchChange({ page: page === 1 ? undefined : page })} />
            </div>
          )}
        </div>
      )}

      {!empty && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pt-6 pb-4 md:hidden">
          {newButton('h-12 w-full text-[15px]')}
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm && confirm.ids.length > 1 ? `Supprimer ${countOf(noun, confirm.ids.length)} ?` : `Supprimer « ${confirm?.title} » ?`}
        description={`Cette action est définitive. ${confirm && confirm.ids.length > 1 ? `Les ${noun.many} disparaîtront` : `${capitalize(noun.definite)} disparaîtra`} du site à la prochaine mise en ligne.`}
        confirmLabel="Supprimer"
        onConfirm={() => remove(confirm!.ids)}
      />
    </div>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** « 12 pages · 2 brouillons · 1 programmée » */
function summary(noun: ContentListConfig<ListRow>['noun'], entries: Publication[]): string {
  const drafts = entries.filter((entry) => entry.state === 'draft' && !entry.scheduledAt).length;
  const scheduled = entries.filter((entry) => entry.scheduledAt).length;
  return [countOf(noun, entries.length), drafts ? `${drafts} brouillon${drafts > 1 ? 's' : ''}` : null, scheduled ? `${scheduled} ${agree(noun, 'programmé', scheduled)}` : null].filter(Boolean).join(' · ');
}

function TitleLink<T extends ListRow>({ config, row, className }: { config: ContentListConfig<T>; row: T; className?: string }) {
  // Toute la ligne (ou la carte) est cliquable : le lien s'étend sur elle, la case et le menu restent au-dessus
  return (
    <Link
      to={config.editTo as never}
      params={{ documentId: row.documentId } as never}
      className={cn('font-medium text-brand after:absolute after:inset-0 hover:underline focus-visible:outline-offset-4', className)}
    >
      {row.title || `${capitalize(config.noun.one)} sans titre`}
    </Link>
  );
}

function Thumbnail({ media }: { media: ReturnType<NonNullable<ContentListConfig<ListRow>['thumbnail']>> }) {
  if (!media) {
    return (
      <span aria-hidden="true" className="grid h-10 w-14 shrink-0 place-items-center rounded-md bg-border-row text-secondary">
        <ImageIcon className="size-4" />
      </span>
    );
  }
  return <img src={media.formats?.thumbnail?.url ?? media.url} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" loading="lazy" />;
}

function SelectAll<T extends ListRow>({ rows, selected, onChange }: { rows: T[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const all = rows.length > 0 && selected.length === rows.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = selected.length > 0 && !all;
  }, [selected.length, all]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Tout sélectionner sur cette page"
      checked={all}
      onChange={(event) => onChange(event.target.checked ? rows.map((row) => row.documentId) : [])}
      className="size-4 accent-brand"
    />
  );
}

function SortHeader({ label, field, sortField, order, onSort, className }: { label: string; field: string; sortField: string; order: 'asc' | 'desc'; onSort: (field: string) => void; className?: string }) {
  const active = field === sortField;
  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined} className={cn('px-3 py-3', className)}>
      <button type="button" onClick={() => onSort(field)} className={cn('inline-flex items-center gap-1 rounded uppercase hover:text-text', active && 'text-text')}>
        {label}
        {active && (order === 'asc' ? <ArrowUp aria-hidden="true" className="size-3.5" /> : <ArrowDown aria-hidden="true" className="size-3.5" />)}
      </button>
    </th>
  );
}

function RowMenu<T extends ListRow>({
  config,
  row,
  publication,
  liveUrl,
  onDuplicate,
  onDelete,
  large,
}: {
  config: ContentListConfig<T>;
  row: T;
  publication: Publication;
  liveUrl: string | undefined;
  onDuplicate: () => void;
  onDelete: () => void;
  large?: boolean;
}) {
  const navigate = useNavigate();
  const publicUrl = liveUrl && config.publicPath && publication.state !== 'draft' ? `${liveUrl}${config.publicPath(row)}` : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={large ? 'icon-lg' : 'icon'} aria-label={`Actions pour « ${row.title} »`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => void navigate({ to: config.editTo as never, params: { documentId: row.documentId } as never })}>
          <Pencil aria-hidden="true" />
          Modifier
        </DropdownMenuItem>
        {config.duplicate && (
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy aria-hidden="true" />
            Dupliquer
          </DropdownMenuItem>
        )}
        {publicUrl && (
          <DropdownMenuItem onSelect={() => window.open(publicUrl, '_blank', 'noopener')}>
            <ExternalLink aria-hidden="true" />
            Voir sur le site
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={onDelete}>
          <Trash2 aria-hidden="true" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BulkBar({ label, onPublish, onUnpublish, onDelete, onCancel }: { label: string; onPublish: () => void; onUnpublish: () => void; onDelete: () => void; onCancel: () => void }) {
  return (
    <div role="region" aria-label="Actions groupées" className="flex flex-wrap items-center gap-2 border-b border-border-row bg-brand-soft px-4 py-3">
      <p aria-live="polite" className="mr-2 font-semibold text-brand">
        {label}
      </p>
      <Button variant="secondary" size="sm" className="border-brand text-brand" onClick={onPublish}>
        Publier
      </Button>
      <Button variant="secondary" size="sm" className="border-brand text-brand" onClick={onUnpublish}>
        Dépublier
      </Button>
      <Button variant="destructive-outline" size="sm" onClick={onDelete}>
        Supprimer
      </Button>
      <Button variant="tertiary" size="sm" className="ml-auto" onClick={onCancel}>
        Annuler la sélection
      </Button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
      <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 text-[17px]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-secondary">{text}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}

function Skeleton({ label, compact }: { label: string; compact: boolean }) {
  return (
    <div aria-busy="true" className="divide-y divide-border-row">
      <span className="sr-only">{label}</span>
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} aria-hidden="true" className={cn('flex items-center gap-4 px-4 motion-safe:animate-pulse', compact ? 'h-10' : 'h-16')} style={{ animationDelay: `${index * 150}ms` }}>
          {!compact && <span className="h-10 w-14 rounded-md bg-border-row" />}
          <span className="h-3 w-2/5 rounded bg-border-row" />
          <span className="h-5 w-20 rounded-full bg-border-row" />
          <span className="h-3 w-24 rounded bg-border-row" />
        </div>
      ))}
    </div>
  );
}

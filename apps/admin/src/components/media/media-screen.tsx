/**
 * Médiathèque (handoff 6.11) : dossiers à gauche, fichiers au centre, fiche du fichier choisi à
 * droite (panneau latéral sous 1280 px). Recherche, type, filtre « Sans texte alternatif », grille ou
 * liste ; envoi par glisser-déposer ou « Envoyer des fichiers », avec progression par fichier.
 */
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from 'radix-ui';
import {
  CloudUpload,
  FileText,
  Folder,
  FolderPlus,
  Grid2x2,
  List,
  Loader2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { useId, useRef, useState, useSyncExternalStore, type DragEvent } from 'react';
import { Toolbar } from '@/components/content-list/toolbar';
import type { Noun } from '@/components/content-list/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useReturnFocus } from '@/components/ui/confirm-dialog';
import { formatShortDate } from '@/lib/dates';
import { describeFile } from '@/lib/media';
import {
  clearFinishedUploads,
  dismissUpload,
  foldersQuery,
  formatBytes,
  isImage,
  LIBRARY_TYPES,
  mediaListQuery,
  needsAlt,
  startUploads,
  thumbnailOf,
  useUploads,
  type MediaItem,
} from '@/lib/media-library';
import { cn } from '@/lib/utils';
import { MediaPanel } from './media-panel';

const NOUN: Noun = { one: 'fichier', many: 'fichiers', feminine: false, definite: 'le fichier' };

export interface MediaSearch {
  dossier?: string;
  q?: string;
  type?: 'images' | 'documents';
  alt?: boolean;
  vue?: 'liste';
  fichier?: string;
}

export function mediaSearch(raw: Record<string, unknown>): MediaSearch {
  const search: MediaSearch = {};
  if (typeof raw.dossier === 'string' && raw.dossier.trim() && raw.dossier.length <= 100) search.dossier = raw.dossier;
  if (typeof raw.q === 'string' && raw.q.trim()) search.q = raw.q;
  if (raw.type === 'images' || raw.type === 'documents') search.type = raw.type;
  if (raw.alt === true || raw.alt === 'true') search.alt = true;
  if (raw.vue === 'liste') search.vue = 'liste';
  if (typeof raw.fichier === 'string' && /^[\w-]{1,64}$/.test(raw.fichier)) search.fichier = raw.fichier;
  return search;
}

type Change = (patch: Partial<MediaSearch>, options?: { replace?: boolean }) => void;

export function MediaScreen({ search, onSearchChange }: { search: MediaSearch; onSearchChange: Change }) {
  const client = useQueryClient();
  const filters = { q: search.q ?? '', folder: search.dossier, kind: search.type, missingAlt: search.alt };
  const list = useInfiniteQuery(mediaListQuery(filters));
  const summary = useQuery(foldersQuery);
  const uploads = useUploads();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [newFolders, setNewFolders] = useState<string[]>([]);
  const items = list.data?.pages.flatMap((page) => page.data) ?? [];
  const total = list.data?.pages[0]?.meta.pagination.total ?? 0;
  const selected = items.find((item) => item.documentId === search.fichier) ?? null;
  const folderNames = [...new Set([...(summary.data?.folders.map((folder) => folder.name) ?? []), ...newFolders])].sort(
    (a, b) => a.localeCompare(b, 'fr'),
  );
  const empty = summary.isSuccess && summary.data.total === 0 && uploads.length === 0;
  const filtered = !!(search.q || search.type || search.alt);

  const upload = (files: FileList | File[] | null) => {
    if (files?.length) void startUploads(client, [...files], search.dossier ?? null);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    upload(event.dataTransfer.files);
  };
  const dragProps = {
    onDragOver: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
    },
    onDrop,
  };

  const picker = (
    <input
      ref={input}
      type="file"
      multiple
      tabIndex={-1}
      aria-hidden="true"
      accept={LIBRARY_TYPES.join(',')}
      className="hidden"
      onChange={(event) => {
        upload(event.target.files);
        event.target.value = '';
      }}
    />
  );

  return (
    <div>
      <PageHeader
        title="Médiathèque"
        description={
          summary.data
            ? `${summary.data.total} fichier${summary.data.total > 1 ? 's' : ''} · ${formatBytes(summary.data.bytes)}`
            : undefined
        }
        actions={
          !empty && (
            <Button onClick={() => input.current?.click()}>
              <Upload aria-hidden="true" />
              Envoyer des fichiers
            </Button>
          )
        }
      />
      {picker}

      {empty ? (
        <div
          {...dragProps}
          className={cn(
            'rounded-xl border-2 border-dashed border-border-input bg-surface px-6 py-16 text-center',
            dragging && 'border-brand bg-brand-soft',
          )}
        >
          <span
            aria-hidden="true"
            className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand"
          >
            <CloudUpload className="size-7" />
          </span>
          <h2 className="mt-4 text-[17px]">Déposez vos images et documents ici</h2>
          <p className="mx-auto mt-2 max-w-md text-secondary">
            JPG, PNG, SVG, PDF, Word et Excel. 20 Mo maximum par fichier. Vous pourrez les réutiliser dans toutes vos
            pages.
          </p>
          <Button className="mt-5" onClick={() => input.current?.click()}>
            Parcourir mes fichiers
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_320px]">
          <Folders
            summary={summary.data}
            names={folderNames}
            current={search.dossier}
            onPick={(dossier) => onSearchChange({ dossier, fichier: undefined })}
            onCreate={(name) => {
              setNewFolders((current) => [...current, name]);
              onSearchChange({ dossier: name, fichier: undefined });
            }}
          />

          <section
            aria-label="Fichiers"
            {...dragProps}
            className={cn(
              'relative min-w-0 rounded-xl border border-border bg-surface',
              dragging && 'ring-2 ring-brand',
            )}
          >
            <Toolbar
              noun={NOUN}
              query={search.q ?? ''}
              onQuery={(q) => onSearchChange({ q: q || undefined, fichier: undefined }, { replace: true })}
              toggles={[
                {
                  label: `Sans texte alternatif${summary.data ? ` · ${summary.data.missingAlt}` : ''}`,
                  pressed: !!search.alt,
                  onChange: (pressed) => onSearchChange({ alt: pressed || undefined, fichier: undefined }),
                },
              ]}
              filters={[
                {
                  key: 'type',
                  label: 'Type',
                  value: search.type,
                  options: [
                    { value: 'images', label: 'Images' },
                    { value: 'documents', label: 'Documents' },
                  ],
                },
              ]}
              onFilter={(_, value) => onSearchChange({ type: value as MediaSearch['type'], fichier: undefined })}
            />
            <div className="flex items-center justify-between gap-3 px-4 pt-3">
              <p role="status" className="text-[13px] text-secondary">
                {list.isSuccess
                  ? `${total} fichier${total > 1 ? 's' : ''}${search.dossier ? ` dans « ${search.dossier} »` : ''}`
                  : ''}
              </p>
              <div
                role="radiogroup"
                aria-label="Affichage"
                className="flex rounded-lg border border-border-input p-0.5"
              >
                {(
                  [
                    [undefined, 'Grille', Grid2x2],
                    ['liste', 'Liste', List],
                  ] as const
                ).map(([vue, label, Icon]) => (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={search.vue === vue}
                    aria-label={label}
                    onClick={() => onSearchChange({ vue })}
                    className={cn(
                      'grid size-8 place-items-center rounded-md',
                      search.vue === vue ? 'bg-brand-soft text-brand' : 'text-secondary hover:bg-surface-hover',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            <UploadBanner />

            <div className="p-4">
              {list.isPending ? (
                <p aria-busy="true" className="py-8 text-center text-secondary">
                  Chargement des fichiers…
                </p>
              ) : list.isError ? (
                <div role="alert" className="py-8 text-center">
                  <p className="font-semibold">Les fichiers n'ont pas pu être chargés.</p>
                  <Button variant="secondary" className="mt-3" onClick={() => void list.refetch()}>
                    Réessayer
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[15px] font-semibold">
                    {filtered
                      ? 'Aucun fichier ne correspond à la recherche.'
                      : search.dossier
                        ? `Le dossier « ${search.dossier} » est vide.`
                        : 'Aucun fichier.'}
                  </p>
                  <p className="mt-1.5 text-secondary">
                    Déposez des fichiers ici, ou utilisez « Envoyer des fichiers ».
                  </p>
                </div>
              ) : search.vue === 'liste' ? (
                <MediaTable
                  items={items}
                  selected={search.fichier}
                  onSelect={(fichier) => onSearchChange({ fichier })}
                />
              ) : (
                <ul
                  aria-label="Fichiers de la médiathèque"
                  className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3"
                >
                  {items.map((item) => (
                    <li key={item.documentId}>
                      <Tile
                        item={item}
                        selected={item.documentId === search.fichier}
                        onSelect={() => onSearchChange({ fichier: item.documentId })}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {list.hasNextPage && (
                <div className="mt-4 text-center">
                  <Button
                    variant="secondary"
                    disabled={list.isFetchingNextPage}
                    onClick={() => void list.fetchNextPage()}
                  >
                    {list.isFetchingNextPage && <Loader2 aria-hidden="true" className="animate-spin" />}
                    Afficher plus de fichiers
                  </Button>
                </div>
              )}
            </div>
            {dragging && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-brand-soft/80 text-lg font-semibold text-brand"
              >
                Déposez pour envoyer {search.dossier ? `dans « ${search.dossier} »` : 'dans la médiathèque'}
              </div>
            )}
          </section>

          {/* Fiche : colonne à partir de 1200 px, panneau latéral en dessous */}
          <aside
            aria-label="Fichier sélectionné"
            className="hidden rounded-xl border border-border bg-surface xl:block"
          >
            {selected ? (
              <MediaPanel
                item={selected}
                folders={folderNames}
                onDeleted={() => onSearchChange({ fichier: undefined })}
              />
            ) : (
              <p className="p-6 text-center text-[13px] text-secondary">Choisissez un fichier pour voir sa fiche.</p>
            )}
          </aside>
          <PanelSheet item={selected} folders={folderNames} onClose={() => onSearchChange({ fichier: undefined })} />
        </div>
      )}
    </div>
  );
}

function Folders({
  summary,
  names,
  current,
  onPick,
  onCreate,
}: {
  summary: { total: number; folders: Array<{ name: string; count: number }> } | undefined;
  names: string[];
  current: string | undefined;
  onPick: (folder: string | undefined) => void;
  onCreate: (name: string) => void;
}) {
  const id = useId();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const count = (folder: string) => summary?.folders.find((entry) => entry.name === folder)?.count ?? 0;
  const entry = (label: string, value: string | undefined, amount: number | undefined) => (
    <li key={label}>
      <button
        type="button"
        aria-current={current === value ? 'true' : undefined}
        onClick={() => onPick(value)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
          current === value ? 'bg-brand-soft font-semibold text-brand' : 'hover:bg-surface-hover',
        )}
      >
        <Folder aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {amount !== undefined && <span className="text-xs font-normal text-secondary">{amount}</span>}
      </button>
    </li>
  );
  return (
    <nav aria-label="Dossiers" className="min-w-0 rounded-xl border border-border bg-surface p-2 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">
        {entry('Tous les fichiers', undefined, summary?.total)}
        {names.map((folder) => entry(folder, folder, count(folder)))}
      </ul>
      {creating ? (
        <form
          className="mt-2 flex gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            onCreate(name.trim());
            setName('');
            setCreating(false);
          }}
        >
          <label htmlFor={`${id}-nom`} className="sr-only">
            Nom du dossier
          </label>
          <input
            id={`${id}-nom`}
            autoFocus
            value={name}
            maxLength={100}
            placeholder="Nom du dossier"
            onChange={(event) => setName(event.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-border-input bg-surface px-2 text-sm dark:bg-bg"
          />
          <Button type="submit" size="sm" variant="secondary">
            Créer
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Annuler" onClick={() => setCreating(false)}>
            <X aria-hidden="true" />
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand hover:bg-surface-hover"
        >
          <FolderPlus aria-hidden="true" className="size-4" />
          Nouveau dossier
        </button>
      )}
    </nav>
  );
}

function Tile({ item, selected, onSelect }: { item: MediaItem; selected: boolean; onSelect: () => void }) {
  const missing = needsAlt(item);
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${item.name}, ${describeFile(item.file)}${missing ? ', texte alternatif manquant' : ''}`}
      onClick={onSelect}
      className={cn(
        'block w-full overflow-hidden rounded-lg border text-left hover:border-brand',
        selected ? 'border-2 border-brand' : missing ? 'border-2 border-warning' : 'border-border',
      )}
    >
      <span className="relative grid h-[104px] place-items-center overflow-hidden bg-[repeating-linear-gradient(45deg,var(--border-row)_0_6px,transparent_6px_12px)]">
        {isImage(item.file) ? (
          <img
            src={thumbnailOf(item.file)}
            alt=""
            loading="lazy"
            // Logo SVG : entier, pas recadré
            className={cn('h-full w-full', item.file.mime === 'image/svg+xml' ? 'object-contain p-3' : 'object-cover')}
          />
        ) : (
          <FileText aria-hidden="true" className="size-8 text-secondary" />
        )}
        {missing && (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-warning-bg px-1.5 py-0.5 text-[11px] font-semibold text-warning">
            <TriangleAlert aria-hidden="true" className="size-3" />
            Alt manquant
          </span>
        )}
      </span>
      <span className="block px-2 py-1.5">
        <span className="block truncate text-[13px] font-semibold">{item.name}</span>
        <span className="block text-xs text-secondary">{describeFile(item.file)}</span>
      </span>
    </button>
  );
}

function MediaTable({
  items,
  selected,
  onSelect,
}: {
  items: MediaItem[];
  selected: string | undefined;
  onSelect: (documentId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[13px]">
        <caption className="sr-only">Fichiers de la médiathèque</caption>
        <thead>
          <tr className="border-b border-border-row text-left text-xs font-semibold tracking-wide text-secondary uppercase">
            <th scope="col" className="py-2 pr-3">
              Nom
            </th>
            <th scope="col" className="px-3 py-2">
              Format
            </th>
            <th scope="col" className="px-3 py-2">
              Dimensions
            </th>
            <th scope="col" className="px-3 py-2">
              Envoyé le
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.documentId}
              className={cn(
                'border-b border-border-row last:border-b-0',
                item.documentId === selected && 'bg-selected-row',
              )}
            >
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                <button
                  type="button"
                  aria-pressed={item.documentId === selected}
                  onClick={() => onSelect(item.documentId)}
                  className="font-semibold text-text underline-offset-2 hover:underline"
                >
                  {item.name}
                </button>
                {needsAlt(item) && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning-bg px-1.5 py-0.5 text-[11px] font-semibold text-warning">
                    <TriangleAlert aria-hidden="true" className="size-3" />
                    Alt manquant
                  </span>
                )}
              </th>
              <td className="px-3 whitespace-nowrap">{describeFile(item.file)}</td>
              <td className="px-3 whitespace-nowrap">
                {item.file.width && item.file.height ? `${item.file.width} × ${item.file.height}` : '—'}
              </td>
              <td className="px-3 whitespace-nowrap">{formatShortDate(new Date(item.createdAt))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Envois en cours : « Envoi de 3 fichiers en cours · 2 sur 3 terminés », une barre par fichier */
function UploadBanner() {
  const jobs = useUploads();
  if (!jobs.length) return null;
  const done = jobs.filter((job) => job.status === 'done').length;
  const running = jobs.some((job) => job.status === 'uploading' || job.status === 'waiting');
  return (
    <section aria-label="Envois" className="mx-4 mt-3 rounded-lg bg-sidebar p-3 dark:bg-bg">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold">
          <CloudUpload aria-hidden="true" className="size-4" />
          {running ? `Envoi de ${jobs.length} fichier${jobs.length > 1 ? 's' : ''} en cours` : 'Envois terminés'}
        </p>
        <p role="status" className="text-[13px] text-secondary">
          {done} sur {jobs.length} terminé{done > 1 ? 's' : ''}
        </p>
        {!running && (
          <Button variant="ghost" size="sm" onClick={clearFinishedUploads}>
            Masquer
          </Button>
        )}
      </div>
      <ul className="mt-2 space-y-1.5">
        {jobs.map((job) => (
          <li key={job.id} className="flex items-center gap-3 text-[13px]">
            <span className="w-40 min-w-0 shrink-0 truncate sm:w-56">{job.name}</span>
            {job.status === 'error' ? (
              <span role="alert" className="min-w-0 flex-1 font-medium text-danger">
                {job.error}
              </span>
            ) : (
              <>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border-row">
                  <span
                    className="block h-full rounded-full bg-brand-button"
                    style={{ width: `${Math.round(job.progress * 100)}%` }}
                  />
                </span>
                <span className="w-10 text-right text-secondary">
                  {job.status === 'done' ? 'fait' : `${Math.round(job.progress * 100)} %`}
                </span>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                job.status === 'uploading' || job.status === 'waiting'
                  ? `Annuler l'envoi de ${job.name}`
                  : `Retirer ${job.name} de la liste`
              }
              onClick={() => dismissUpload(job.id)}
            >
              <X aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const WIDE = '(min-width: 1280px)';
/** Écran assez large pour la colonne de la fiche (suit les changements de taille) */
const useWide = () =>
  useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener('change', listener);
      return () => query.removeEventListener('change', listener);
    },
    () => window.matchMedia(WIDE).matches,
  );

/** Sous 1280 px : la fiche en panneau latéral */
function PanelSheet({ item, folders, onClose }: { item: MediaItem | null; folders: string[]; onClose: () => void }) {
  const returnFocus = useReturnFocus();
  const wide = useWide();
  return (
    <Dialog.Root open={!!item && !wide} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content
          {...returnFocus}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-border bg-surface shadow-dialog dark:border-border-dialog dark:bg-sidebar"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <Dialog.Title className="text-[17px] font-semibold">Fichier</Dialog.Title>
            <Dialog.Description className="sr-only">
              Texte alternatif, légende, crédit et dossier du fichier.
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fermer">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1">
            {item && <MediaPanel item={item} folders={folders} onDeleted={onClose} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

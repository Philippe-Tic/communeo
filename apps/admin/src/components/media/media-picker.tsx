/**
 * Choisir un fichier de la médiathèque (handoff « 6.11 Sélection de média ») : onglets Médiathèque /
 * Envoyer un fichier, recherche, grille, panneau de droite avec l'aperçu et le texte alternatif —
 * saisi ici, au moment où l'on a l'image sous les yeux, enregistré avec le fichier et réutilisé
 * partout. « Insérer » reste désactivé sans sélection ; une image sans texte alternatif n'est pas
 * insérée.
 */
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from 'radix-ui';
import { Check, CloudUpload, FileText, Loader2, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useReturnFocus } from '@/components/ui/confirm-dialog';
import { ApiError } from '@/lib/api';
import { checkFile, describeFile, DOCUMENT_TYPES, IMAGE_TYPES } from '@/lib/media';
import {
  isImage,
  mediaListQuery,
  refreshMedia,
  thumbnailOf,
  updateMedia,
  uploadWithProgress,
  type LibraryFile,
  type MediaItem,
} from '@/lib/media-library';
import { cn } from '@/lib/utils';

export type PickerKind = 'image' | 'document';

const TYPES: Record<PickerKind, string[]> = { image: [...IMAGE_TYPES, 'image/svg+xml'], document: DOCUMENT_TYPES };

export function MediaPicker({
  open,
  onOpenChange,
  kind,
  multiple = false,
  title,
  confirmLabel,
  folder,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PickerKind;
  multiple?: boolean;
  title: string;
  /** « Insérer l'image », « Ajouter les images », « Ajouter les documents » */
  confirmLabel: string;
  /** Dossier des fichiers envoyés depuis la fenêtre */
  folder?: string;
  onInsert: (files: LibraryFile[]) => void;
}) {
  const client = useQueryClient();
  const returnFocus = useReturnFocus();
  const id = useId();
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [focused, setFocused] = useState<MediaItem | null>(null);
  // Textes alternatifs saisis dans la fenêtre, par fiche
  const [alts, setAlts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useInfiniteQuery({
    ...mediaListQuery({ q: query, kind: kind === 'image' ? 'images' : 'documents' }),
    enabled: open,
  });
  const items = list.data?.pages.flatMap((page) => page.data) ?? [];

  // Recherche envoyée après une courte pause de frappe
  useEffect(() => {
    const timer = setTimeout(() => setQuery(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const reset = () => {
    setTab('library');
    setQ('');
    setQuery('');
    setSelected([]);
    setFocused(null);
    setAlts({});
    setError(null);
  };

  const altOf = (item: MediaItem) => alts[item.documentId] ?? item.file.alternativeText ?? '';

  const toggle = (item: MediaItem) => {
    setError(null);
    setFocused(item);
    if (!multiple) return setSelected([item]);
    setSelected((current) =>
      current.some((entry) => entry.documentId === item.documentId)
        ? current.filter((entry) => entry.documentId !== item.documentId)
        : [...current, item],
    );
  };

  const insert = async () => {
    if (kind === 'image') {
      const missing = selected.filter((item) => !altOf(item).trim());
      if (missing.length) {
        setFocused(missing[0]!);
        setError(
          missing.length > 1
            ? `${missing.length} images sans texte alternatif : décrivez-les avant de les insérer.`
            : "Décrivez l'image avant de l'insérer : le texte alternatif est obligatoire.",
        );
        requestAnimationFrame(() => document.getElementById(`${id}-alt`)?.focus());
        return;
      }
    }
    setBusy(true);
    try {
      // Textes alternatifs modifiés : enregistrés avec le fichier
      const files: LibraryFile[] = [];
      for (const item of selected) {
        const alt = altOf(item).trim();
        if (kind === 'image' && alt !== (item.file.alternativeText ?? '')) {
          const updated = await updateMedia(item.documentId, { alt_text: alt });
          files.push(updated.file);
        } else files.push(item.file);
      }
      void refreshMedia(client);
      onInsert(files);
      onOpenChange(false);
      reset();
    } catch (failure) {
      setError(
        `Le texte alternatif n'a pas pu être enregistré : ${failure instanceof ApiError ? failure.message : 'erreur inattendue'}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          {...returnFocus}
          className="fixed inset-0 z-50 flex flex-col bg-surface text-text shadow-dialog md:inset-auto md:top-1/2 md:left-1/2 md:h-[min(620px,calc(100vh-48px))] md:w-[min(820px,calc(100vw-48px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border md:border-border-dialog"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <Dialog.Title className="text-[17px] font-semibold">{title}</Dialog.Title>
            <Dialog.Description className="sr-only">
              Choisissez un fichier de la médiathèque ou envoyez-en un nouveau.
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fermer">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <div role="tablist" aria-label="Source" className="flex gap-1 border-b border-border px-5">
            {(
              [
                ['library', 'Médiathèque'],
                ['upload', 'Envoyer un fichier'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`${id}-onglet-${value}`}
                aria-selected={tab === value}
                aria-controls={`${id}-panneau-${value}`}
                onClick={() => setTab(value)}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2.5 text-sm',
                  tab === value ? 'border-brand font-semibold text-brand' : 'border-transparent hover:text-brand',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div
              role="tabpanel"
              id={`${id}-panneau-${tab}`}
              aria-labelledby={`${id}-onglet-${tab}`}
              className="min-h-0 flex-1 overflow-y-auto p-4"
            >
              {tab === 'library' ? (
                <>
                  <div className="relative">
                    <label htmlFor={`${id}-recherche`} className="sr-only">
                      Rechercher dans la médiathèque
                    </label>
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary"
                    />
                    <input
                      id={`${id}-recherche`}
                      type="search"
                      value={q}
                      placeholder={`Rechercher dans ${list.data ? `${list.data.pages[0]?.meta.pagination.total ?? 0} fichiers` : 'la médiathèque'}`}
                      onChange={(event) => setQ(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border-input bg-surface pr-3 pl-9 dark:bg-bg"
                    />
                  </div>
                  {list.isPending ? (
                    <p aria-busy="true" className="py-8 text-center text-secondary">
                      Chargement…
                    </p>
                  ) : items.length === 0 ? (
                    <p className="py-8 text-center text-secondary">
                      {query
                        ? 'Aucun fichier ne correspond.'
                        : `Aucun ${kind === 'image' ? 'image' : 'document'} dans la médiathèque : envoyez-en un.`}
                    </p>
                  ) : (
                    <ul aria-label="Fichiers" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {items.map((item) => {
                        const chosen = selected.some((entry) => entry.documentId === item.documentId);
                        return (
                          <li key={item.documentId}>
                            <button
                              type="button"
                              aria-pressed={chosen}
                              onClick={() => toggle(item)}
                              className={cn(
                                'relative block w-full overflow-hidden rounded-lg border text-left hover:border-brand',
                                chosen ? 'border-2 border-brand' : 'border-border',
                              )}
                            >
                              <span className="grid h-[88px] place-items-center overflow-hidden bg-[repeating-linear-gradient(45deg,var(--border-row)_0_6px,transparent_6px_12px)]">
                                {isImage(item.file) ? (
                                  <img
                                    src={thumbnailOf(item.file)}
                                    alt=""
                                    loading="lazy"
                                    className={cn(
                                      'h-full w-full',
                                      item.file.mime === 'image/svg+xml' ? 'object-contain p-2' : 'object-cover',
                                    )}
                                  />
                                ) : (
                                  <FileText aria-hidden="true" className="size-7 text-secondary" />
                                )}
                              </span>
                              <span className="block truncate px-2 py-1.5 text-xs">{item.name}</span>
                              {chosen && (
                                <span
                                  aria-hidden="true"
                                  className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-brand-button text-on-brand"
                                >
                                  <Check className="size-3.5" />
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {list.hasNextPage && (
                    <div className="mt-3 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={list.isFetchingNextPage}
                        onClick={() => void list.fetchNextPage()}
                      >
                        Afficher plus
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <UploadTab
                  kind={kind}
                  multiple={multiple}
                  folder={folder}
                  onUploaded={(uploaded) => {
                    void refreshMedia(client);
                    setTab('library');
                    setSelected((current) => (multiple ? [...current, ...uploaded] : uploaded.slice(-1)));
                    setFocused(uploaded[uploaded.length - 1] ?? null);
                  }}
                />
              )}
            </div>

            <aside
              aria-label="Fichier choisi"
              className="border-t border-border p-4 md:w-[280px] md:border-t-0 md:border-l"
            >
              {focused ? (
                <div className="space-y-3">
                  <div className="grid h-20 place-items-center overflow-hidden rounded-lg border md:h-[140px] border-border bg-sidebar dark:bg-bg">
                    {isImage(focused.file) ? (
                      <img src={thumbnailOf(focused.file)} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <FileText aria-hidden="true" className="size-10 text-secondary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold break-all">{focused.name}</p>
                    <p className="text-[13px] text-secondary">
                      {[
                        describeFile(focused.file),
                        focused.file.width && focused.file.height
                          ? `${focused.file.width} × ${focused.file.height}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {kind === 'image' && (
                    <div>
                      <label htmlFor={`${id}-alt`} className="font-medium">
                        Texte alternatif{' '}
                        <span aria-hidden="true" className="text-danger">
                          *
                        </span>
                        <span className="sr-only">(obligatoire)</span>
                      </label>
                      <textarea
                        id={`${id}-alt`}
                        rows={3}
                        maxLength={255}
                        value={altOf(focused)}
                        aria-describedby={`${id}-alt-aide`}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAlts((current) => ({ ...current, [focused.documentId]: value }));
                          if (error && value.trim()) setError(null);
                        }}
                        className="mt-1 w-full resize-y rounded-lg border border-border-input bg-surface px-3 py-2 dark:bg-bg"
                      />
                      <p id={`${id}-alt-aide`} className="mt-1 text-[13px] text-secondary">
                        Enregistré avec le fichier, réutilisé partout.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-secondary">Choisissez un fichier pour le voir ici.</p>
              )}
            </aside>
          </div>

          {error && (
            <p role="alert" className="border-t border-border px-5 py-2 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            {multiple && selected.length > 0 && (
              <p className="mr-auto text-[13px] text-secondary">
                {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
              </p>
            )}
            <Dialog.Close asChild>
              <Button variant="secondary">Annuler</Button>
            </Dialog.Close>
            <Button disabled={selected.length === 0 || busy} onClick={() => void insert()}>
              {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UploadTab({
  kind,
  multiple,
  folder,
  onUploaded,
}: {
  kind: PickerKind;
  multiple: boolean;
  folder?: string;
  onUploaded: (items: MediaItem[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const types = TYPES[kind];

  const send = async (files: File[]) => {
    const accepted: File[] = [];
    const refused: string[] = [];
    for (const file of files) {
      const problem = checkFile(file, types);
      if (problem) refused.push(`${file.name} : ${problem}`);
      else accepted.push(file);
    }
    setErrors(refused);
    const uploaded: MediaItem[] = [];
    await Promise.all(
      accepted.map(async (file) => {
        try {
          const { promise } = uploadWithProgress(file, folder ? { folder } : {}, (ratio) =>
            setProgress((current) => ({ ...current, [file.name]: ratio })),
          );
          uploaded.push(await promise);
        } catch (failure) {
          setErrors((current) => [
            ...current,
            `${file.name} : ${failure instanceof ApiError ? failure.message : "l'envoi a échoué"}`,
          ]);
        } finally {
          setProgress((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== file.name)));
        }
      }),
    );
    if (uploaded.length) onUploaded(uploaded);
  };

  return (
    <div
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void send([...event.dataTransfer.files].slice(0, multiple ? undefined : 1));
      }}
      className={cn(
        'grid h-full min-h-[220px] place-items-center rounded-xl border-2 border-dashed border-border-input p-6 text-center',
        dragging && 'border-brand bg-brand-soft',
      )}
    >
      <div>
        <CloudUpload aria-hidden="true" className="mx-auto size-8 text-brand" />
        <p className="mt-2 font-semibold">Déposez {multiple ? 'vos fichiers' : 'votre fichier'} ici</p>
        <p className="mt-1 text-[13px] text-secondary">
          {kind === 'image' ? 'JPG, PNG, WebP ou SVG' : 'PDF, Word, Excel ou OpenDocument'}. 20 Mo maximum.
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => input.current?.click()}>
          Parcourir mes fichiers
        </Button>
        <input
          ref={input}
          type="file"
          multiple={multiple}
          tabIndex={-1}
          aria-hidden="true"
          accept={types.join(',')}
          className="hidden"
          onChange={(event) => {
            void send([...(event.target.files ?? [])]);
            event.target.value = '';
          }}
        />
        {Object.entries(progress).map(([name, ratio]) => (
          <p key={name} className="mt-3 flex items-center gap-2 text-[13px]">
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            {name} — {Math.round(ratio * 100)} %
          </p>
        ))}
        {errors.map((message) => (
          <p key={message} role="alert" className="mt-2 text-[13px] font-medium text-danger">
            {message}
          </p>
        ))}
      </div>
    </div>
  );
}

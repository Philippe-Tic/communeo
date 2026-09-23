/**
 * Champs de fichiers reliés à la médiathèque : une image (bloc Image, image principale), une galerie
 * (3 à 12 images), une liste de documents. Le fichier choisi porte son texte alternatif ; une image
 * sans texte alternatif est signalée et se corrige ici (« Ajouter le texte alternatif »), le
 * récapitulatif des erreurs de publication y mène directement.
 */
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from 'radix-ui';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FileText,
  ImagePlus,
  Loader2,
  Pencil,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useId, useState } from 'react';
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import { FieldError, fieldId, useFieldError } from '@/components/form';
import { api, ApiError } from '@/lib/api';
import { describeFile } from '@/lib/media';
import { refreshMedia, thumbnailOf, updateMedia, type LibraryFile, type MediaItem } from '@/lib/media-library';
import { cn } from '@/lib/utils';
import { MediaPicker } from './media-picker';

const missingAlt = (file: LibraryFile | null | undefined) =>
  !!file && file.mime?.startsWith('image/') !== false && !file.alternativeText?.trim();

/** Fiche de médiathèque d'un fichier (pour enregistrer son texte alternatif) */
async function mediaItemFor(fileId: number): Promise<MediaItem | null> {
  const response = await api<{ data: MediaItem[] }>(
    `/api/media-items?filters[file][id][$eq]=${fileId}&populate[file]=true`,
  );
  return response.data[0] ?? null;
}

/** Modifier le texte alternatif d'une image : enregistré avec le fichier, repris partout */
function AltTextDialog({
  file,
  open,
  onOpenChange,
  onSaved,
}: {
  file: LibraryFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (file: LibraryFile) => void;
}) {
  const client = useQueryClient();
  const returnFocus = useReturnFocus();
  const id = useId();
  const [text, setText] = useState(file.alternativeText ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!text.trim()) {
      setError("Décrivez l'image : le texte alternatif est obligatoire.");
      return;
    }
    setBusy(true);
    try {
      const item = await mediaItemFor(file.id);
      if (!item) throw new ApiError(404, 'Ce fichier ne se trouve pas dans la médiathèque de la commune.');
      const updated = await updateMedia(item.documentId, { alt_text: text.trim() });
      void refreshMedia(client);
      onSaved({ ...file, alternativeText: updated.file.alternativeText });
      onOpenChange(false);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Le texte alternatif n'a pas pu être enregistré.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (value) {
          setText(file.alternativeText ?? '');
          setError(null);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content {...returnFocus} className={dialogContentClass}>
          <Dialog.Title className="text-[17px] font-semibold">Texte alternatif</Dialog.Title>
          <Dialog.Description className="mt-1 text-secondary">
            Enregistré avec le fichier : tous les contenus qui l'utilisent le reprennent.
          </Dialog.Description>
          <div className="mt-4 flex gap-3">
            <img
              src={thumbnailOf(file)}
              alt=""
              className="size-20 shrink-0 rounded-lg border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <label htmlFor={`${id}-alt`} className="font-medium">
                Ce que montre l'image{' '}
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
                <span className="sr-only">(obligatoire)</span>
              </label>
              <textarea
                id={`${id}-alt`}
                rows={3}
                maxLength={255}
                value={text}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-erreur` : undefined}
                onChange={(event) => {
                  setText(event.target.value);
                  if (error) setError(null);
                }}
                className="mt-1 w-full resize-y rounded-lg border border-border-input bg-surface px-3 py-2 dark:bg-bg"
              />
              {error && (
                <p id={`${id}-erreur`} role="alert" className="mt-1 text-[13px] font-medium text-danger">
                  {error}
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">Annuler</Button>
            </Dialog.Close>
            <Button disabled={busy} onClick={() => void save()}>
              {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Vignette d'une image choisie, avec son texte alternatif (ou l'alerte « manquant ») */
function ImageCard({
  file,
  altId,
  onAlt,
  actions,
}: {
  file: LibraryFile;
  altId: string;
  onAlt: (file: LibraryFile) => void;
  actions?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const missing = missingAlt(file);
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-2.5',
        missing ? 'border-2 border-warning bg-warning-bg/40' : 'border-border',
      )}
    >
      <img
        src={thumbnailOf(file)}
        alt=""
        className="size-16 shrink-0 rounded-md border border-border bg-surface object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{file.name}</p>
        {missing ? (
          <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-warning">
            <TriangleAlert aria-hidden="true" className="size-3.5" />
            Texte alternatif manquant
          </p>
        ) : (
          <p className="mt-0.5 line-clamp-2 text-[13px] text-secondary">« {file.alternativeText} »</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Button
            id={altId}
            type="button"
            size="sm"
            variant={missing ? 'primary' : 'secondary'}
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden="true" />
            {missing ? 'Ajouter le texte alternatif' : 'Modifier le texte alternatif'}
          </Button>
          {actions}
        </div>
      </div>
      <AltTextDialog file={file} open={editing} onOpenChange={setEditing} onSaved={onAlt} />
    </div>
  );
}

/** Une image de la médiathèque (bloc Image, image principale) */
export function ImageField<T extends FieldValues>({
  name,
  label,
  required,
  help,
  folder,
}: {
  name: Path<T>;
  label: string;
  required?: boolean;
  help?: string;
  folder?: string;
}) {
  const { control } = useFormContext<T>();
  // Deux erreurs possibles : pas d'image, ou image sans texte alternatif
  const missingError = useFieldError(name);
  const altError = useFieldError(`${name}.alternativeText`);
  const error = missingError ?? altError;
  const [picking, setPicking] = useState(false);
  const id = fieldId(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => {
        const file = value as LibraryFile | null;
        return (
          <fieldset data-field={name} aria-describedby={error ? `${id}-erreur` : undefined}>
            <legend className="font-medium">
              {label} {!required && <span className="font-normal text-secondary">(facultative)</span>}
              {required && (
                <>
                  <span aria-hidden="true" className="text-danger">
                    {' '}
                    *
                  </span>
                  <span className="sr-only">(obligatoire)</span>
                </>
              )}
            </legend>
            {help && <p className="mt-0.5 text-[13px] text-secondary">{help}</p>}
            <div className="mt-2">
              {file ? (
                <ImageCard
                  file={file}
                  altId={fieldId(`${name}.alternativeText`)}
                  onAlt={(updated) => onChange(updated)}
                  actions={
                    <>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setPicking(true)}>
                        Changer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="tertiary"
                        className="text-danger"
                        onClick={() => onChange(null)}
                      >
                        Retirer
                      </Button>
                    </>
                  }
                />
              ) : (
                <Button
                  id={id}
                  type="button"
                  variant="secondary"
                  onClick={() => setPicking(true)}
                  className={cn(error && 'border-2 border-danger')}
                >
                  <ImagePlus aria-hidden="true" />
                  Choisir une image
                </Button>
              )}
            </div>
            <FieldError id={id} message={error} />
            <MediaPicker
              open={picking}
              onOpenChange={setPicking}
              kind="image"
              title="Choisir une image"
              confirmLabel="Insérer l'image"
              folder={folder}
              onInsert={(files) => onChange(files[0] ?? null)}
            />
          </fieldset>
        );
      }}
    />
  );
}

/** Galerie : 3 à 12 images, dans l'ordre choisi */
export function GalleryField<T extends FieldValues>({ name, folder }: { name: Path<T>; folder?: string }) {
  const { control, getFieldState, formState } = useFormContext<T>();
  const error = getFieldState(name, formState).error?.message;
  const [picking, setPicking] = useState(false);
  const id = fieldId(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => {
        const files = (Array.isArray(value) ? value : []) as LibraryFile[];
        const move = (from: number, to: number) => {
          const next = [...files];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved!);
          onChange(next);
        };
        return (
          <fieldset data-field={name}>
            <legend className="font-medium">
              Images <span className="font-normal text-secondary">(3 à 12)</span>
            </legend>
            {files.length > 0 && (
              <ol className="mt-2 space-y-2">
                {files.map((file, index) => (
                  <li key={`${file.id}-${index}`}>
                    <ImageCard
                      file={file}
                      altId={fieldId(`${name}.${index}.alternativeText`)}
                      onAlt={(updated) =>
                        onChange(files.map((entry, position) => (position === index ? updated : entry)))
                      }
                      actions={
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Avancer ${file.name}`}
                            disabled={index === 0}
                            onClick={() => move(index, index - 1)}
                          >
                            <ArrowLeft aria-hidden="true" className="md:hidden" />
                            <ArrowUp aria-hidden="true" className="max-md:hidden" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Reculer ${file.name}`}
                            disabled={index === files.length - 1}
                            onClick={() => move(index, index + 1)}
                          >
                            <ArrowRight aria-hidden="true" className="md:hidden" />
                            <ArrowDown aria-hidden="true" className="max-md:hidden" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Retirer ${file.name}`}
                            onClick={() => onChange(files.filter((_, position) => position !== index))}
                          >
                            <X aria-hidden="true" />
                          </Button>
                        </>
                      }
                    />
                  </li>
                ))}
              </ol>
            )}
            <Button
              id={id}
              type="button"
              variant="secondary"
              className={cn('mt-2', error && 'border-2 border-danger')}
              disabled={files.length >= 12}
              onClick={() => setPicking(true)}
            >
              <ImagePlus aria-hidden="true" />
              {files.length ? 'Ajouter des images' : 'Choisir des images'}
            </Button>
            <p className="mt-1 text-[13px] text-secondary">
              {files.length} image{files.length > 1 ? 's' : ''} sur 12 au maximum.
            </p>
            <FieldError id={id} message={error} />
            <MediaPicker
              open={picking}
              onOpenChange={setPicking}
              kind="image"
              multiple
              title="Ajouter des images"
              confirmLabel="Ajouter les images"
              folder={folder}
              onInsert={(chosen) =>
                onChange(
                  [...files, ...chosen.filter((file) => !files.some((entry) => entry.id === file.id))].slice(0, 12),
                )
              }
            />
          </fieldset>
        );
      }}
    />
  );
}

/** Documents à télécharger, dans l'ordre choisi */
export function DocumentsField<T extends FieldValues>({ name, folder }: { name: Path<T>; folder?: string }) {
  const { control, getFieldState, formState } = useFormContext<T>();
  const error = getFieldState(name, formState).error?.message;
  const [picking, setPicking] = useState(false);
  const id = fieldId(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => {
        const files = (Array.isArray(value) ? value : []) as LibraryFile[];
        const move = (from: number, to: number) => {
          const next = [...files];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved!);
          onChange(next);
        };
        return (
          <fieldset data-field={name}>
            <legend className="font-medium">
              Documents{' '}
              <span aria-hidden="true" className="text-danger">
                *
              </span>
              <span className="sr-only">(obligatoire)</span>
            </legend>
            {files.length > 0 && (
              <ol className="mt-2 divide-y divide-border-row rounded-lg border border-border">
                {files.map((file, index) => (
                  <li key={`${file.id}-${index}`} className="flex items-center gap-2 px-3 py-2">
                    <FileText aria-hidden="true" className="size-5 shrink-0 text-secondary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{file.name}</span>
                      <span className="text-xs text-secondary">{describeFile(file)}</span>
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Monter ${file.name}`}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Descendre ${file.name}`}
                      disabled={index === files.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Retirer ${file.name}`}
                      onClick={() => onChange(files.filter((_, position) => position !== index))}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ol>
            )}
            <Button
              id={id}
              type="button"
              variant="secondary"
              className={cn('mt-2', error && 'border-2 border-danger')}
              onClick={() => setPicking(true)}
            >
              <FileText aria-hidden="true" />
              {files.length ? 'Ajouter des documents' : 'Choisir des documents'}
            </Button>
            <FieldError id={id} message={error} />
            <MediaPicker
              open={picking}
              onOpenChange={setPicking}
              kind="document"
              multiple
              title="Ajouter des documents"
              confirmLabel="Ajouter les documents"
              folder={folder}
              onInsert={(chosen) =>
                onChange([...files, ...chosen.filter((file) => !files.some((entry) => entry.id === file.id))])
              }
            />
          </fieldset>
        );
      }}
    />
  );
}

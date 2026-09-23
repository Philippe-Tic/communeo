/**
 * Fichier joint (handoff 6.13, formulaire document officiel) : zone de dépôt ou bouton « Choisir un
 * fichier », puis carte (nom, « PDF · 4,2 Mo »), « Remplacer » et « Retirer ». `multiple` : liste de
 * fichiers (annexes) avec « Ajouter ». Le fichier part dans la médiathèque de la commune dès qu'il
 * est choisi ; le contenu, lui, ne garde que sa référence.
 */
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { checkFile, describeFile, trackUpload, uploadFile, type UploadedFile } from '@/lib/media';
import { cn } from '@/lib/utils';
import { FieldError, FieldHelp, RequirementMark, fieldId } from './field';

interface Props<T extends FieldValues> {
  name: Path<T>;
  label: string;
  required?: boolean;
  help?: string;
  /** Types acceptés (MIME) */
  types: string[];
  multiple?: boolean;
  /** Libellé du bouton d'ajout (liste) */
  addLabel?: string;
  /** Dossier de la médiathèque */
  folder?: string;
}

function FileCard({ file, onReplace, onRemove, busy }: { file: UploadedFile; onReplace?: () => void; onRemove: () => void; busy?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 dark:bg-sidebar">
      <FileText aria-hidden="true" className="size-5 shrink-0 text-secondary" />
      <div className="min-w-0 flex-1">
        <a href={file.url} target="_blank" rel="noreferrer" className="block truncate font-medium text-text underline-offset-2 hover:underline">
          {file.name}
        </a>
        <p className="text-[13px] text-secondary">{describeFile(file)}</p>
      </div>
      {onReplace && (
        <Button type="button" variant="secondary" size="sm" onClick={onReplace} disabled={busy} aria-label={`Remplacer ${file.name}`}>
          Remplacer
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Retirer ${file.name}`} onClick={onRemove} disabled={busy}>
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}

export function FileField<T extends FieldValues>({ name, label, required, help, types, multiple, addLabel = 'Ajouter un fichier', folder = 'Documents officiels' }: Props<T>) {
  const { control, setError, clearErrors } = useFormContext<T>();
  const id = fieldId(name);
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => {
        const files = (multiple ? (value as UploadedFile[] | null) ?? [] : value ? [value as UploadedFile] : []) as UploadedFile[];
        const pick = () => input.current?.click();

        const receive = async (file: File | undefined) => {
          if (!file) return;
          const problem = checkFile(file, types);
          if (problem) {
            setError(name, { type: 'upload', message: `${file.name} : ${problem}` });
            return;
          }
          clearErrors(name);
          setUploading(file.name);
          try {
            const uploaded = await trackUpload(uploadFile(file, folder));
            onChange(multiple ? [...files, uploaded] : uploaded);
          } catch (caught) {
            setError(name, { type: 'upload', message: `${file.name} n'a pas pu être envoyé : ${caught instanceof ApiError ? caught.message : 'erreur inattendue'}` });
          } finally {
            setUploading(null);
          }
        };

        const onDrop = (event: DragEvent) => {
          event.preventDefault();
          setDragging(false);
          void receive(event.dataTransfer.files[0]);
        };
        const describedBy = [help && `${id}-aide`, error && `${id}-erreur`].filter(Boolean).join(' ') || undefined;

        return (
          <div data-field={name}>
            <p id={`${id}-libelle`} className="font-medium">
              {label}
              <RequirementMark required={required} />
            </p>

            <div className="mt-1.5 space-y-2">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  busy={!!uploading}
                  onReplace={multiple ? undefined : pick}
                  onRemove={() => onChange(multiple ? files.filter((item) => item.id !== file.id) : null)}
                />
              ))}
              {uploading && (
                <p role="status" className="flex items-center gap-2 rounded-lg border border-dashed border-border-input px-3 py-2.5 text-[13px] text-secondary">
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Envoi de {uploading}…
                </p>
              )}
              {(multiple || files.length === 0) && !uploading && (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    'flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-lg border border-dashed px-3 py-3 text-[13px] text-secondary',
                    error ? 'border-2 border-danger' : dragging ? 'border-brand bg-brand-soft' : 'border-border-input',
                  )}
                >
                  <Upload aria-hidden="true" className="size-4" />
                  <span id={hintId}>Déposez un fichier ici, ou</span>
                  <button
                    type="button"
                    onClick={pick}
                    aria-label={`${label}${required ? ' (obligatoire)' : ''} : ${multiple && files.length > 0 ? addLabel.toLowerCase() : 'choisir un fichier'}`}
                    aria-describedby={[hintId, describedBy].filter(Boolean).join(' ')}
                    aria-invalid={error ? true : undefined}
                    className="font-semibold text-brand underline underline-offset-2"
                  >
                    {multiple && files.length > 0 ? addLabel.toLowerCase() : 'choisissez un fichier'}
                  </button>
                </div>
              )}
            </div>
            {help && <FieldHelp id={id}>{help}</FieldHelp>}
            <FieldError id={id} message={error?.message} />
            {/* Après le bouton visible : le récapitulatif d'erreurs amène au premier contrôle du champ */}
            <input
              ref={input}
              // Pas l'id du champ : le récapitulatif d'erreurs amène au bouton visible, pas à ce contrôle caché
              id={`${id}-fichier`}
              type="file"
              accept={types.join(',')}
              className="sr-only"
              aria-labelledby={`${id}-libelle`}
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
              tabIndex={-1}
              onChange={(event) => {
                void receive(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
        );
      }}
    />
  );
}

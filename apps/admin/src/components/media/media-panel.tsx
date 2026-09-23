/**
 * Fiche d'un fichier (handoff 6.11, colonne de droite ; panneau latéral sous 1280 px) : aperçu,
 * format, poids, dimensions, envoi ; texte alternatif (obligatoire pour une image), légende,
 * crédit, dossier ; « Utilisé dans N contenus » en liens ; Enregistrer, Supprimer. Le texte est
 * enregistré avec le fichier : tous les contenus qui l'utilisent le reprennent.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FileText, Loader2, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatShortDate } from '@/lib/dates';
import { describeFile } from '@/lib/media';
import { deleteMedia, isImage, refreshMedia, updateMedia, usageQuery, type MediaItem } from '@/lib/media-library';
import { cn } from '@/lib/utils';

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

interface Draft {
  alt: string;
  caption: string;
  credit: string;
  folder: string;
}

const toDraft = (item: MediaItem): Draft => ({
  alt: item.file.alternativeText ?? '',
  caption: item.file.caption ?? '',
  credit: item.file.credit ?? '',
  folder: item.folder ?? '',
});

export function MediaPanel({
  item,
  folders,
  onDeleted,
}: {
  item: MediaItem;
  folders: string[];
  onDeleted: () => void;
}) {
  const client = useQueryClient();
  const id = useId();
  const usage = useQuery(usageQuery(item.file.id));
  const [draft, setDraft] = useState<Draft>(() => toDraft(item));
  const [shown, setShown] = useState(item);
  const [saving, setSaving] = useState(false);
  const [altError, setAltError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Autre fichier (ou fichier rechargé après enregistrement) : le formulaire le reprend
  if (item !== shown) {
    setShown(item);
    setDraft(toDraft(item));
    setAltError(false);
  }
  const image = isImage(item.file);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(item));
  const used = usage.data ?? [];

  const save = async () => {
    if (image && !draft.alt.trim()) {
      setAltError(true);
      document.getElementById(`${id}-alt`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await updateMedia(item.documentId, {
        alt_text: draft.alt,
        caption: draft.caption,
        credit: draft.credit,
        folder: draft.folder || null,
      });
      toast.success(
        used.length
          ? `« ${item.name} » est enregistré. ${used.length > 1 ? `Les ${used.length} contenus qui l'utilisent seront à jour` : "Le contenu qui l'utilise sera à jour"} à la prochaine mise en ligne.`
          : `« ${item.name} » est enregistré.`,
      );
      await refreshMedia(client);
      void client.invalidateQueries({ queryKey: ['publication'] });
    } catch (error) {
      toast.error(`Le fichier n'a pas pu être enregistré : ${errorText(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const field = 'mt-1 w-full rounded-lg border border-border-input bg-surface px-3 py-2 dark:bg-bg';

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid h-[168px] place-items-center overflow-hidden rounded-lg border border-border bg-[repeating-linear-gradient(45deg,var(--border-row)_0_6px,transparent_6px_12px)]">
          {image ? (
            <img
              src={item.file.formats?.small?.url ?? item.file.url}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <FileText aria-hidden="true" className="size-12 text-secondary" />
          )}
        </div>
        <div>
          <h2 className="text-base font-semibold break-all">{item.name}</h2>
          <p className="mt-0.5 text-[13px] text-secondary">
            {[
              describeFile(item.file),
              item.file.width && item.file.height ? `${item.file.width} × ${item.file.height}` : null,
              `envoyé le ${formatShortDate(new Date(item.createdAt))}${item.uploaded_by_name ? ` par ${item.uploaded_by_name}` : ''}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <a
            href={item.file.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[13px] text-brand underline underline-offset-2"
          >
            Ouvrir le fichier
          </a>
        </div>

        {image && (
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
              rows={2}
              value={draft.alt}
              maxLength={255}
              aria-invalid={altError || undefined}
              aria-describedby={`${id}-alt-aide${altError ? ` ${id}-alt-erreur` : ''}`}
              onChange={(event) => {
                setDraft({ ...draft, alt: event.target.value });
                if (event.target.value.trim()) setAltError(false);
              }}
              className={cn(field, 'resize-y', altError && 'border-2 border-danger')}
            />
            <p id={`${id}-alt-aide`} className="mt-1 text-[13px] text-secondary">
              Ce que montre l'image, pour qui ne la voit pas. Enregistré avec le fichier, réutilisé partout.
            </p>
            {altError && (
              <p id={`${id}-alt-erreur`} className="mt-1 text-[13px] font-medium text-danger">
                Décrivez l'image : le texte alternatif est obligatoire.
              </p>
            )}
          </div>
        )}
        {image && (
          <div>
            <label htmlFor={`${id}-legende`} className="font-medium">
              Légende <span className="font-normal text-secondary">(facultatif)</span>
            </label>
            <input
              id={`${id}-legende`}
              value={draft.caption}
              maxLength={500}
              onChange={(event) => setDraft({ ...draft, caption: event.target.value })}
              className={field}
            />
          </div>
        )}
        {image && (
          <div>
            <label htmlFor={`${id}-credit`} className="font-medium">
              Crédit <span className="font-normal text-secondary">(facultatif)</span>
            </label>
            <input
              id={`${id}-credit`}
              value={draft.credit}
              maxLength={200}
              onChange={(event) => setDraft({ ...draft, credit: event.target.value })}
              className={field}
            />
          </div>
        )}
        <div>
          <label htmlFor={`${id}-dossier`} className="font-medium">
            Dossier
          </label>
          <input
            id={`${id}-dossier`}
            list={`${id}-dossiers`}
            value={draft.folder}
            maxLength={100}
            placeholder="Sans dossier"
            onChange={(event) => setDraft({ ...draft, folder: event.target.value })}
            className={field}
          />
          <datalist id={`${id}-dossiers`}>
            {folders.map((folder) => (
              <option key={folder} value={folder} />
            ))}
          </datalist>
        </div>

        <section aria-labelledby={`${id}-usages`} className="border-t border-border-row pt-3">
          <h3 id={`${id}-usages`} className="text-sm font-semibold">
            {usage.isPending
              ? 'Utilisation…'
              : used.length
                ? `Utilisé dans ${used.length} contenu${used.length > 1 ? 's' : ''}`
                : 'Utilisé dans aucun contenu'}
          </h3>
          {used.length > 0 && (
            <ul className="mt-1 space-y-1 text-[13px]">
              {used.map((entry) => (
                <li key={`${entry.uid}-${entry.documentId}`}>
                  <Link to={entry.path as never} className="text-brand underline underline-offset-2">
                    {entry.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="flex items-center gap-2 border-t border-border p-3">
        <Button className="flex-1" disabled={saving || !dirty} onClick={() => void save()}>
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          Enregistrer
        </Button>
        <Button
          variant="destructive-outline"
          size="icon"
          aria-label={`Supprimer « ${item.name} »`}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer « ${item.name} » ?`}
        description={
          used.length
            ? `Ce fichier est utilisé dans ${used.length} contenu${used.length > 1 ? 's' : ''} : il ne peut pas être supprimé tant qu'il y figure.`
            : 'Le fichier sera supprimé définitivement de la médiathèque.'
        }
        confirmLabel="Supprimer"
        onConfirm={async () => {
          try {
            await deleteMedia(item.documentId);
            toast.success(`« ${item.name} » a été supprimé.`);
            onDeleted();
          } catch (error) {
            toast.error(`Le fichier n'a pas été supprimé : ${errorText(error)}`);
          }
          await refreshMedia(client);
        }}
      />
    </div>
  );
}

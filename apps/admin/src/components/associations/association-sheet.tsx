/**
 * Fiche d'une association, dans un panneau latéral (comme l'équipe) : nom, catégorie, présentation,
 * contact affiché sur le site, site web, siège, logo facultatif. Pour une proposition, « Modifier
 * avant de publier » : corriger puis « Enregistrer et publier ». Fermer avec des modifications
 * demande confirmation.
 */
import { Dialog } from 'radix-ui';
import { Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { ASSOCIATION_CATEGORY_LABELS } from '@communeo/core';
import {
  FileField,
  Form,
  FormErrorSummary,
  RequiredNote,
  SelectField,
  TextareaField,
  TextField,
  useZodForm,
} from '@/components/form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, useReturnFocus } from '@/components/ui/confirm-dialog';
import type { Association, AssociationData } from '@/lib/associations';
import { IMAGE_TYPES, usePendingUploads, type UploadedFile } from '@/lib/media';

export const CATEGORY_OPTIONS = Object.entries(ASSOCIATION_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

const optionalUrl = z.union([
  z.literal(''),
  z
    .string()
    .trim()
    .max(500)
    .regex(
      /^https?:\/\/[^\s.]+\.[^\s]+$/i,
      "L'adresse du site doit commencer par https:// (par exemple https://asso.fr)",
    ),
]);

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Indiquez le nom de l'association")
    .max(200, 'Le nom ne doit pas dépasser 200 caractères'),
  category: z.string().min(1, 'Choisissez une catégorie'),
  description: z.string().max(3000, 'La présentation ne doit pas dépasser 3 000 caractères'),
  contact_name: z.string().max(100, 'Le nom du contact ne doit pas dépasser 100 caractères'),
  contact_email: z.union([z.literal(''), z.email("L'adresse e-mail n'est pas valide")]),
  contact_phone: z.string().max(20, 'Le téléphone ne doit pas dépasser 20 caractères'),
  website: optionalUrl,
  address: z.string().max(500, "L'adresse ne doit pas dépasser 500 caractères"),
  logo: z.custom<UploadedFile | null>(),
});
type Values = z.input<typeof schema>;

const toValues = (association: Association | null): Values => ({
  name: association?.name ?? '',
  category: association?.category ?? '',
  description: association?.description ?? '',
  contact_name: association?.contact_name ?? '',
  contact_email: association?.contact_email ?? '',
  contact_phone: association?.contact_phone ?? '',
  website: association?.website ?? '',
  address: association?.address ?? '',
  logo: association?.logo ?? null,
});

const optional = (value: string) => value.trim() || null;

export function AssociationSheet({
  open,
  association,
  onClose,
  onSave,
}: {
  open: boolean;
  /** Association modifiée, ou `null` pour en ajouter une */
  association: Association | null;
  onClose: () => void;
  /** `publish` : proposition enregistrée puis publiée */
  onSave: (data: AssociationData, options: { publish: boolean }) => Promise<void>;
}) {
  const form = useZodForm(schema, toValues(association));
  const returnFocus = useReturnFocus();
  const [confirmClose, setConfirmClose] = useState(false);
  // Bouton utilisé pour envoyer : lu par onSubmit dans le même clic (un état n'y serait pas encore)
  const publish = useRef(false);
  const [publishing, setPublishing] = useState(false);
  const uploading = usePendingUploads() > 0;
  const pending = association?.status === 'pending';

  useEffect(() => {
    if (open) form.reset(toValues(association));
  }, [open, association, form]);

  // Lu pendant le rendu : react-hook-form ne suit isDirty que s'il est lu ici
  const dirty = form.formState.isDirty;
  const close = () => (dirty ? setConfirmClose(true) : onClose());
  const busy = form.formState.isSubmitting || uploading;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(value) => !value && close()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
          <Dialog.Content
            {...returnFocus}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col border-l border-border bg-surface shadow-dialog dark:border-border-dialog dark:bg-sidebar"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <Dialog.Title className="text-[17px] font-semibold">
                {association
                  ? pending
                    ? `Proposition : ${association.name}`
                    : association.name
                  : 'Nouvelle association'}
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                Fiche affichée dans l'annuaire des associations du site.
              </Dialog.Description>
              <Button type="button" variant="ghost" size="icon" aria-label="Fermer la fiche" onClick={close}>
                <X aria-hidden="true" />
              </Button>
            </div>
            <Form
              form={form}
              requiredNote={false}
              summary={false}
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={async (values) => {
                await onSave(
                  {
                    name: values.name.trim(),
                    category: values.category,
                    description: optional(values.description),
                    contact_name: optional(values.contact_name),
                    contact_email: optional(values.contact_email),
                    contact_phone: optional(values.contact_phone),
                    website: optional(values.website),
                    address: optional(values.address),
                    logo: values.logo?.id ?? null,
                  },
                  { publish: publish.current },
                );
                form.reset(values);
              }}
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <FormErrorSummary title={(count) => `${count} champ${count > 1 ? 's' : ''} à corriger`} />
                <RequiredNote />
                <TextField name="name" label="Nom" required inputProps={{ autoComplete: 'off' }} />
                <SelectField
                  name="category"
                  label="Catégorie"
                  required
                  options={CATEGORY_OPTIONS}
                  placeholder="Choisir…"
                />
                <TextareaField
                  name="description"
                  label="Présentation"
                  rows={4}
                  help="Activités, public, horaires : ce qu'un habitant doit savoir."
                />
                <fieldset className="space-y-5">
                  <legend className="mb-1 text-[15px] font-semibold">Contact affiché sur le site</legend>
                  <TextField name="contact_name" label="Nom du contact" inputProps={{ autoComplete: 'off' }} />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField
                      name="contact_email"
                      label="E-mail"
                      inputProps={{ type: 'email', inputMode: 'email', autoComplete: 'off' }}
                    />
                    <TextField
                      name="contact_phone"
                      label="Téléphone"
                      inputProps={{ type: 'tel', inputMode: 'tel', autoComplete: 'off' }}
                    />
                  </div>
                  <TextField
                    name="website"
                    label="Site web"
                    inputProps={{ type: 'url', inputMode: 'url', autoComplete: 'off' }}
                  />
                  <TextareaField name="address" label="Siège" rows={2} />
                </fieldset>
                <FileField
                  name="logo"
                  label="Logo"
                  folder="Associations"
                  types={IMAGE_TYPES}
                  help="Facultatif : les initiales le remplacent. JPG, PNG ou WebP."
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
                <Button type="button" variant="secondary" onClick={close}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant={pending ? 'secondary' : 'primary'}
                  disabled={busy}
                  onClick={() => {
                    publish.current = false;
                    setPublishing(false);
                  }}
                >
                  {busy && !publishing && <Loader2 aria-hidden="true" className="animate-spin" />}
                  {uploading ? 'Envoi du fichier…' : 'Enregistrer'}
                </Button>
                {pending && (
                  <Button
                    type="submit"
                    disabled={busy}
                    onClick={() => {
                      publish.current = true;
                      setPublishing(true);
                    }}
                  >
                    {busy && publishing && <Loader2 aria-hidden="true" className="animate-spin" />}
                    Enregistrer et publier
                  </Button>
                )}
              </div>
            </Form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={(value) => !value && setConfirmClose(false)}
        tone="warning"
        title="Fermer sans enregistrer ?"
        description="Les modifications de cette fiche seront perdues."
        confirmLabel="Fermer sans enregistrer"
        cancelLabel="Continuer la saisie"
        onConfirm={() => {
          setConfirmClose(false);
          onClose();
        }}
      />
    </>
  );
}

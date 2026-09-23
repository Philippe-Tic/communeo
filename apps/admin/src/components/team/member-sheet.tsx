/**
 * Fiche d'une personne de l'équipe, dans un panneau latéral (handoff 6.13) : identité, rôle, fonction
 * affichée, délégation, contact, permanence, présentation, photo facultative. Enregistrement explicite ;
 * fermer avec des modifications demande confirmation.
 */
import { Dialog } from 'radix-ui';
import { Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { TEAM_ROLE_TITLES } from '@communeo/core';
import { FileField, Form, FormErrorSummary, RequiredNote, SelectField, TextareaField, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, useReturnFocus } from '@/components/ui/confirm-dialog';
import { IMAGE_TYPES, usePendingUploads, type UploadedFile } from '@/lib/media';
import { fullName, type MemberData, type TeamMember, type TeamRole } from '@/lib/team';

export const ROLE_OPTIONS = Object.entries(TEAM_ROLE_TITLES).map(([value, label]) => ({ value, label }));

const schema = z.object({
  first_name: z.string().trim().min(1, 'Indiquez le prénom').max(100),
  last_name: z.string().trim().min(1, 'Indiquez le nom').max(100),
  role: z.string().min(1, 'Choisissez le rôle'),
  title: z.string().max(80, 'La fonction ne doit pas dépasser 80 caractères'),
  delegation: z.string().max(200, 'La délégation ne doit pas dépasser 200 caractères'),
  email: z.union([z.literal(''), z.email("L'adresse e-mail n'est pas valide")]),
  office_hours: z.string().max(200, 'La permanence ne doit pas dépasser 200 caractères'),
  bio: z.string().max(2000, 'La présentation ne doit pas dépasser 2 000 caractères'),
  photo: z.custom<UploadedFile | null>(),
});
type Values = z.input<typeof schema>;

const toValues = (member: TeamMember | null, role: TeamRole): Values => ({
  first_name: member?.first_name ?? '',
  last_name: member?.last_name ?? '',
  role: member?.role ?? role,
  title: member?.title ?? '',
  delegation: member?.delegation ?? '',
  email: member?.email ?? '',
  office_hours: member?.office_hours ?? '',
  bio: member?.bio ?? '',
  photo: member?.photo ?? null,
});

const optional = (value: string) => value.trim() || null;

export function MemberSheet({
  open,
  member,
  defaultRole,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  /** Personne modifiée, ou `null` pour en ajouter une */
  member: TeamMember | null;
  defaultRole: TeamRole;
  onClose: () => void;
  onSave: (data: Omit<MemberData, 'display_order'>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const form = useZodForm(schema, toValues(member, defaultRole));
  const returnFocus = useReturnFocus();
  const [confirm, setConfirm] = useState<'close' | 'delete' | null>(null);
  const role = form.watch('role') as TeamRole;
  const uploading = usePendingUploads() > 0;

  useEffect(() => {
    if (open) form.reset(toValues(member, defaultRole));
  }, [open, member, defaultRole, form]);

  // Lu pendant le rendu : react-hook-form ne suit isDirty que s'il est lu ici
  const dirty = form.formState.isDirty;
  const close = () => (dirty ? setConfirm('close') : onClose());
  const name = member ? fullName(member) : 'Nouvelle personne';

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(value) => !value && close()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
          <Dialog.Content
            {...returnFocus}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-border bg-surface shadow-dialog dark:border-border-dialog dark:bg-sidebar"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <Dialog.Title className="text-[17px] font-semibold">{name}</Dialog.Title>
              <Dialog.Description className="sr-only">Fiche affichée sur la page Équipe municipale du site.</Dialog.Description>
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
                await onSave({
                  first_name: values.first_name.trim(),
                  last_name: values.last_name.trim(),
                  role: values.role as TeamRole,
                  title: optional(values.title),
                  delegation: optional(values.delegation),
                  email: optional(values.email),
                  office_hours: optional(values.office_hours),
                  bio: optional(values.bio),
                  photo: values.photo?.id ?? null,
                });
                form.reset(values);
              }}
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <FormErrorSummary title={(count) => `${count} champ${count > 1 ? 's' : ''} à corriger`} />
                <RequiredNote />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField name="first_name" label="Prénom" required inputProps={{ autoComplete: 'off' }} />
                  <TextField name="last_name" label="Nom" required inputProps={{ autoComplete: 'off' }} />
                </div>
                <SelectField name="role" label="Rôle" required options={ROLE_OPTIONS} help="Détermine le groupe : Maire, Adjoints, Conseillers ou Services." />
                <TextField name="title" label="Fonction affichée" help={`Par défaut : « ${TEAM_ROLE_TITLES[role] ?? ''} ». Par exemple « 1er adjoint ».`} />
                <TextField name="delegation" label="Délégation" help="Par exemple « Vie associative, sports »." />
                <TextField name="email" label="E-mail" inputProps={{ type: 'email', inputMode: 'email', autoComplete: 'off' }} />
                <TextField name="office_hours" label="Permanence" help="Par exemple « Samedi 10 h – 12 h, sur rendez-vous »." />
                <TextareaField name="bio" label="Présentation" rows={3} />
                <FileField name="photo" label="Photo" folder="Équipe municipale" types={IMAGE_TYPES} help="Facultative : les initiales la remplacent. JPG, PNG ou WebP." />
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
                {member && (
                  <Button type="button" variant="tertiary" className="text-danger" onClick={() => setConfirm('delete')}>
                    <Trash2 aria-hidden="true" />
                    Supprimer
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Button type="button" variant="secondary" onClick={close}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting || uploading}>
                    {(form.formState.isSubmitting || uploading) && <Loader2 aria-hidden="true" className="animate-spin" />}
                    {uploading ? 'Envoi du fichier…' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            </Form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={confirm === 'close'}
        onOpenChange={(value) => !value && setConfirm(null)}
        tone="warning"
        title="Fermer sans enregistrer ?"
        description="Les modifications de cette fiche seront perdues."
        confirmLabel="Fermer sans enregistrer"
        cancelLabel="Continuer la saisie"
        onConfirm={() => {
          setConfirm(null);
          onClose();
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(value) => !value && setConfirm(null)}
        title={`Supprimer « ${name} » ?`}
        description="Cette action est définitive. La personne disparaîtra du site à la prochaine mise en ligne."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          await onDelete();
          setConfirm(null);
        }}
      />
    </>
  );
}

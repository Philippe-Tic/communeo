/**
 * Référence des composants de l'admin (hors navigation) : le kit de formulaires et les fenêtres,
 * sur l'exemple « Nouvel événement » (maquette 6.4). Sert aussi de page de test (e2e/forms.spec.ts).
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { EyeOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '@communeo/core';
import {
  CheckboxField,
  DateField,
  Form,
  FormSection,
  RadioGroupField,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
  TimeField,
  UnsavedChangesGuard,
  useZodForm,
} from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';

export const Route = createFileRoute('/_app/composants')({ component: ComponentsPage });

const CATEGORIES = ['Culture', 'Sport', 'Réunion', 'Fête', 'Atelier', 'Conférence'].map((label) => ({ value: label.toLowerCase(), label }));

const eventFields = z.object({
  startDate: z.string().min(1),
  startTime: z.string(),
  endDate: z.string().min(1),
  endTime: z.string(),
  price: z.enum(['free', 'amount']),
  amount: z.string(),
});

function validFields(value: unknown, keys: Array<keyof z.infer<typeof eventFields>>): boolean {
  const mask = Object.fromEntries(keys.map((key) => [key, true])) as Partial<Record<keyof z.infer<typeof eventFields>, true>>;
  return eventFields.pick(mask).safeParse(value).success;
}

const eventSchema = z
  .object({
    title: z.string().trim().min(1, 'Le titre est obligatoire'),
    slug: z.string().trim().max(SLUG_MAX_LENGTH).regex(SLUG_PATTERN, "L'adresse ne peut contenir que des lettres minuscules, des chiffres et des tirets"),
    category: z.string().min(1, 'Choisissez une catégorie'),
    featured: z.boolean(),
    startDate: z.string().min(1, 'La date de début est obligatoire'),
    startTime: z.string(),
    endDate: z.string().min(1, 'La date de fin est obligatoire'),
    endTime: z.string(),
    price: z.enum(['free', 'amount']),
    amount: z.string(),
    email: z.union([z.literal(''), z.email("L'e-mail de contact n'est pas valide")]),
    description: z.string(),
    confirm: z.literal(true, "Confirmez l'exactitude des informations"),
    audience: z.enum(['all', 'families', 'seniors']),
  })
  // Vérifications entre champs : lancées dès que leurs champs sont valides, même si d'autres champs
  // sont en erreur (sinon elles n'apparaîtraient qu'après une deuxième tentative)
  .refine((value) => `${value.endDate}T${value.endTime || '23:59'}` >= `${value.startDate}T${value.startTime || '00:00'}`, {
    path: ['endDate'],
    message: 'La date de fin doit être après la date de début',
    when: ({ value }) => validFields(value, ['startDate', 'startTime', 'endDate', 'endTime']),
  })
  .refine((value) => value.price === 'free' || /^\d+([,.]\d{1,2})?$/.test(value.amount), {
    path: ['amount'],
    message: 'Indiquez le montant en euros (par exemple 5 ou 7,50)',
    when: ({ value }) => validFields(value, ['price', 'amount']),
  });

function ComponentsPage() {
  const form = useZodForm(eventSchema, {
    title: '',
    slug: 'fete-de-la-musique',
    category: '',
    featured: false,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    price: 'free',
    amount: '',
    email: '',
    description: '',
    confirm: false as unknown as true,
    audience: 'all',
  });
  const [dialog, setDialog] = useState<'delete' | 'unpublish' | null>(null);
  const price = form.watch('price');

  const save = form.handleSubmit(async () => {
    toast.success('« Fête de la musique » est publié.', { label: 'Voir sur le site', onClick: () => undefined });
    form.reset(form.getValues());
  });

  return (
    <>
      <PageHeader title="Composants" description="Référence du kit de formulaires et des fenêtres de l'administration." />
      <UnsavedChangesGuard when={form.formState.isDirty} onSave={async () => (await save(), !form.formState.isDirty)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,760px)_1fr]">
        <Form form={form} onSubmit={() => save()} summaryTitle={(count) => `${count} erreur${count > 1 ? 's empêchent' : ' empêche'} la publication`}>
          <FormSection title="L'événement" fields={['title', 'slug', 'category', 'featured']}>
            <TextField name="title" label="Titre" required />
            <TextField name="slug" label="Adresse de la page" required prefix="saint-aubin-sur-loire.fr/agenda/" help="Générée depuis le titre, modifiable." />
            <SelectField name="category" label="Catégorie" required options={CATEGORIES} placeholder="Choisir une catégorie" />
            <SwitchField name="featured" label="Mettre à la une sur la page d'accueil" />
          </FormSection>

          <FormSection title="Dates et lieu" className="mt-6" fields={['startDate', 'startTime', 'endDate', 'endTime']}>
            <div className="grid gap-5 sm:grid-cols-2">
              <DateField name="startDate" label="Début" required />
              <TimeField name="startTime" label="Heure de début" />
              <DateField name="endDate" label="Fin" required help="Un événement peut durer plusieurs jours." />
              <TimeField name="endTime" label="Heure de fin" />
            </div>
          </FormSection>

          <FormSection title="Tarif et contact" className="mt-6" fields={['price', 'amount', 'email', 'audience', 'description', 'confirm']}>
            <RadioGroupField name="price" label="Tarif" options={[{ value: 'free', label: 'Gratuit' }, { value: 'amount', label: 'Montant' }]} />
            {price === 'amount' && <TextField name="amount" label="Montant (€)" required inputProps={{ inputMode: 'decimal', className: 'max-w-40' }} />}
            <TextField name="email" label="E-mail de contact" inputProps={{ type: 'email', autoComplete: 'email' }} />
            <RadioGroupField
              name="audience"
              label="Public"
              cards
              options={[
                { value: 'all', label: 'Tout public', description: 'Ouvert à tous les habitants.' },
                { value: 'families', label: 'Familles', description: 'Animations pour les enfants accompagnés.' },
                { value: 'seniors', label: 'Seniors', description: 'Programme du club des aînés.' },
              ]}
            />
            <TextareaField name="description" label="Description" />
            <CheckboxField name="confirm" label="Je confirme l'exactitude des informations" required />
          </FormSection>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="submit">Publier</Button>
            <Button type="button" variant="secondary" onClick={() => form.reset()}>
              Annuler les modifications
            </Button>
          </div>
        </Form>

        <aside aria-labelledby="section-fenetres" className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
            <h2 id="section-fenetres">Fenêtres et notifications</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive-outline" onClick={() => setDialog('delete')}>
                <Trash2 aria-hidden="true" />
                Supprimer
              </Button>
              <Button variant="secondary" onClick={() => setDialog('unpublish')}>
                <EyeOff aria-hidden="true" />
                Dépublier
              </Button>
              <Button variant="secondary" onClick={() => toast.success('Brouillon enregistré.')}>
                Notification de succès
              </Button>
              <Button variant="secondary" onClick={() => toast.error('La publication a échoué. Vos modifications sont enregistrées.', { label: 'Réessayer', onClick: () => undefined })}>
                Notification d'erreur
              </Button>
            </div>
            <p className="text-[13px] text-secondary">
              Modifiez le formulaire puis <Link to="/" className="font-semibold text-brand underline">quittez la page</Link> : une fenêtre propose d'enregistrer.
            </p>
          </section>
          <section aria-labelledby="section-badges" className="space-y-3 rounded-xl border border-border bg-surface p-6">
            <h2 id="section-badges">Statuts</h2>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="neutral">Brouillon</StatusBadge>
              <StatusBadge tone="success">Publié</StatusBadge>
              <StatusBadge tone="info">Programmé le 3 nov. à 8h</StatusBadge>
              <StatusBadge tone="warning">Attention</StatusBadge>
              <StatusBadge tone="danger">En erreur</StatusBadge>
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Supprimer « Fête de la musique » ?"
        description="L'événement sera retiré du site à la prochaine mise en ligne. Cette action est définitive."
        confirmLabel="Supprimer"
        onConfirm={() => void toast.success('« Fête de la musique » a été supprimé.', { label: 'Annuler', onClick: () => undefined })}
      />
      <ConfirmDialog
        open={dialog === 'unpublish'}
        onOpenChange={(open) => !open && setDialog(null)}
        tone="warning"
        icon={EyeOff}
        title="Dépublier « Fête de la musique » ?"
        description="L'événement redevient un brouillon et disparaît du site à la prochaine mise en ligne."
        confirmLabel="Dépublier"
        onConfirm={() => undefined}
      />
    </>
  );
}

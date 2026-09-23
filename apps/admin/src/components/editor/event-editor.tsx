/**
 * Éditeur d'un événement (handoff 6.4, gabarit « formulaire simple ») : sections en cartes avec
 * sommaire collant — l'événement, dates et lieu (plusieurs jours possibles, fin préremplie = début,
 * contrôle « la fin doit être après le début »), tarif et inscription (Gratuit / Montant, inscription
 * obligatoire révélant date limite et places), organisateur et contact, description en blocs.
 */
import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { EVENT_CATEGORY_LABELS } from '@communeo/core';
import { blocksSchema, BlockEditor, type Block } from '@/components/blocks';
import { DateField, FormSection, RadioGroupField, SelectField, SwitchField, TextareaField, TextField, TimeField } from '@/components/form';
import { documentApi, optional, toApiValue, type BaseDocument } from '@/lib/content-api';
import { dateToParis, formatParisDateTime, parisToDate } from '@/lib/dates';
import type { EditorBodyProps, EditorConfig } from './content-editor';
import type { OutlineSection } from './form-outline';
import { ImagePlaceholder, slugSchema, titleSchema } from './page-editor';

export const EVENT_CATEGORIES = Object.entries(EVENT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export interface EventDocument extends BaseDocument {
  category: string | null;
  featured: boolean | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  address: string | null;
  price: string | null;
  registration_required: boolean | null;
  registration_deadline: string | null;
  max_participants: number | null;
  organizer: string | null;
  external_link: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export type EventValues = {
  title: string;
  slug: string;
  category: string;
  featured: boolean;
  start_day: string;
  start_time: string;
  end_day: string;
  end_time: string;
  location: string;
  address: string;
  price_mode: 'free' | 'amount';
  price_amount: string;
  registration_required: boolean;
  registration_deadline: string;
  max_participants: string;
  organizer: string;
  external_link: string;
  contact_email: string;
  contact_phone: string;
  blocks: Block[];
};

const isFree = (price: string | null | undefined) => !price?.trim() || /^(free|gratuit|0 ?€?)$/i.test(price.trim());
const moment = (day: string, time: string) => (day && time ? parisToDate(day, time) : null);
/** « samedi 21 juin à 19 h » */
const spoken = (date: Date) => formatParisDateTime(date).replace(' h 00', ' h');

const required = (message: string) => z.string().trim().min(1, message);

const publishSchema = z
  .object({
    title: titleSchema,
    slug: slugSchema,
    category: required('Choisissez une catégorie'),
    featured: z.boolean(),
    start_day: required('Indiquez la date de début'),
    start_time: required("Indiquez l'heure de début"),
    end_day: required('Indiquez la date de fin'),
    end_time: required("Indiquez l'heure de fin"),
    location: z.string().max(200, 'Le lieu ne doit pas dépasser 200 caractères'),
    address: z.string(),
    price_mode: z.enum(['free', 'amount']),
    price_amount: z.string(),
    registration_required: z.boolean(),
    registration_deadline: z.string(),
    max_participants: z.string().refine((value) => !value.trim() || /^[1-9]\d*$/.test(value.trim()), 'Indiquez un nombre de places en chiffres'),
    organizer: z.string().max(100, "L'organisateur ne doit pas dépasser 100 caractères"),
    external_link: z.string().refine((value) => !value.trim() || /^https?:\/\/\S+$/i.test(value.trim()), 'Le lien doit commencer par https://'),
    contact_email: z.union([z.literal(''), z.email("L'e-mail de contact n'est pas valide")]),
    contact_phone: z.string(),
    blocks: blocksSchema('publish'),
  })
  // Règles entre champs : vérifiées même quand un autre champ est en erreur (option `when`)
  .refine(
    (values) => {
      const start = moment(values.start_day, values.start_time);
      const end = moment(values.end_day, values.end_time);
      return !start || !end || end.getTime() >= start.getTime();
    },
    {
      path: ['end_day'],
      // Le début est rappelé en clair (maquette 6.4, état « Erreurs »)
      error: (issue) => {
        const values = issue.input as EventValues;
        const start = moment(values.start_day, values.start_time);
        return start ? `La fin doit être après le début (${spoken(start)}).` : 'La fin doit être après le début.';
      },
      when: () => true,
    },
  )
  .refine((values) => values.price_mode !== 'amount' || !!values.price_amount?.trim(), {
    path: ['price_amount'],
    message: 'Indiquez le montant, par exemple « 5 € »',
    when: () => true,
  });

export const eventsApi = documentApi<EventDocument, EventValues>('evenements', (values) => ({
  title: values.title.trim(),
  ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
  ...(values.category ? { category: values.category } : {}),
  featured: values.featured,
  start_date: moment(values.start_day, values.start_time || '00:00')?.toISOString() ?? null,
  end_date: moment(values.end_day, values.end_time || '23:45')?.toISOString() ?? null,
  location: optional(values.location),
  address: optional(values.address),
  price: values.price_mode === 'amount' ? optional(values.price_amount) : 'Gratuit',
  registration_required: values.registration_required,
  registration_deadline: values.registration_required && values.registration_deadline ? parisToDate(values.registration_deadline, '23:59').toISOString() : null,
  max_participants: values.registration_required && values.max_participants.trim() ? Number(values.max_participants.trim()) : null,
  organizer: optional(values.organizer),
  external_link: optional(values.external_link),
  contact_email: optional(values.contact_email),
  contact_phone: optional(values.contact_phone),
  blocks: toApiValue(values.blocks),
}));

const OUTLINE: OutlineSection[] = [
  { id: 'section-evenement', title: "L'événement", fields: ['title', 'category', 'featured', 'slug'] },
  { id: 'section-dates', title: 'Dates et lieu', fields: ['start_day', 'start_time', 'end_day', 'end_time', 'location', 'address'] },
  { id: 'section-tarif', title: 'Tarif et inscription', fields: ['price_mode', 'price_amount', 'registration_required', 'registration_deadline', 'max_participants'] },
  { id: 'section-contact', title: 'Organisateur et contact', fields: ['organizer', 'external_link', 'contact_email', 'contact_phone'] },
  { id: 'section-description', title: 'Description', fields: ['blocks'] },
];

/** Fin préremplie = début, tant qu'elle est vide (une fin antérieure reste signalée, jamais corrigée en silence) */
function useEndFollowsStart() {
  const { control, getValues, setValue } = useFormContext<EventValues>();
  const [startDay, startTime] = useWatch({ control, name: ['start_day', 'start_time'] });
  useEffect(() => {
    if (!startDay) return;
    const endDay = getValues('end_day');
    if (!endDay) setValue('end_day', startDay, { shouldValidate: false });
    if (startTime && !getValues('end_time')) setValue('end_time', startTime, { shouldValidate: false });
  }, [startDay, startTime, getValues, setValue]);
}

function EventBody({ slugField }: EditorBodyProps<EventDocument>) {
  useEndFollowsStart();
  const { control } = useFormContext<EventValues>();
  const [priceMode, registration] = useWatch({ control, name: ['price_mode', 'registration_required'] });

  return (
    <>
      <FormSection id="section-evenement" title="L'événement" fields={OUTLINE[0]!.fields}>
        <TextField name="title" label="Titre" required inputProps={{ className: 'h-12 text-lg font-semibold md:h-11' }} />
        <div className="grid items-end gap-5 sm:grid-cols-2">
          <SelectField name="category" label="Catégorie" required placeholder="Choisir une catégorie" options={EVENT_CATEGORIES} />
          <div className="sm:pb-2.5">
            <SwitchField name="featured" label="Mettre à la une sur la page d'accueil" />
          </div>
        </div>
        <ImagePlaceholder label="Image" />
        {slugField}
      </FormSection>

      <FormSection id="section-dates" title="Dates et lieu" fields={OUTLINE[1]!.fields}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <DateField name="start_day" label="Début" required />
            <TimeField name="start_time" label="Heure de début" required />
          </div>
          <div className="space-y-3">
            <DateField name="end_day" label="Fin" required help="Un événement peut durer plusieurs jours." />
            <TimeField name="end_time" label="Heure de fin" required />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="location" label="Lieu" help="Par exemple « Place de la Mairie »." />
          <TextareaField name="address" label="Adresse" rows={2} />
        </div>
      </FormSection>

      <FormSection id="section-tarif" title="Tarif et inscription" fields={OUTLINE[2]!.fields}>
        <RadioGroupField
          name="price_mode"
          label="Tarif"
          hideOptional
          options={[
            { value: 'free', label: 'Gratuit' },
            { value: 'amount', label: 'Montant' },
          ]}
        />
        {priceMode === 'amount' && <TextField name="price_amount" label="Montant" required help="Par exemple « 5 € », « 8 € (réduit 5 €) »." />}
        <SwitchField name="registration_required" label="Inscription obligatoire" help={registration ? undefined : 'Si activée : date limite et nombre de places.'} />
        {registration && (
          <div className="grid gap-5 sm:grid-cols-2">
            <DateField name="registration_deadline" label="Date limite d'inscription" />
            <TextField name="max_participants" label="Nombre de places" inputProps={{ inputMode: 'numeric' }} />
          </div>
        )}
      </FormSection>

      <FormSection id="section-contact" title="Organisateur et contact" fields={OUTLINE[3]!.fields}>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="organizer" label="Organisateur" />
          <TextField name="external_link" label="Lien externe" help="Billetterie, site de l'organisateur…" inputProps={{ type: 'url', inputMode: 'url' }} />
          <TextField name="contact_email" label="E-mail de contact" inputProps={{ type: 'email', inputMode: 'email' }} />
          <TextField name="contact_phone" label="Téléphone de contact" inputProps={{ type: 'tel', inputMode: 'tel' }} />
        </div>
      </FormSection>

      <section id="section-description" data-section="section-description" aria-label="Description">
        <BlockEditor name="blocks" heading="Description" emptyTitle="Pas encore de description. Ajoutez un premier bloc." />
      </section>
    </>
  );
}

export const EVENT_EDITOR: EditorConfig<EventDocument, EventValues> = {
  api: eventsApi,
  previewType: 'evenement',
  section: { label: 'Agenda', to: '/agenda', back: "Retour à l'agenda" },
  noun: { one: 'événement', many: 'événements', feminine: false, definite: "l'événement" },
  schema: publishSchema as unknown as z.ZodType<EventValues, EventValues>,
  toValues: (doc) => {
    const start = doc?.start_date ? dateToParis(new Date(doc.start_date)) : null;
    const end = doc?.end_date ? dateToParis(new Date(doc.end_date)) : null;
    return {
      title: doc?.title ?? '',
      slug: doc?.slug ?? '',
      category: doc?.category ?? '',
      featured: doc?.featured ?? false,
      start_day: start?.day ?? '',
      start_time: start?.time ?? '',
      end_day: end?.day ?? '',
      end_time: end?.time ?? '',
      location: doc?.location ?? '',
      address: doc?.address ?? '',
      price_mode: isFree(doc?.price) ? 'free' : 'amount',
      price_amount: isFree(doc?.price) ? '' : (doc?.price ?? ''),
      registration_required: doc?.registration_required ?? false,
      registration_deadline: doc?.registration_deadline ? dateToParis(new Date(doc.registration_deadline)).day : '',
      max_participants: doc?.max_participants ? String(doc.max_participants) : '',
      organizer: doc?.organizer ?? '',
      external_link: doc?.external_link ?? '',
      contact_email: doc?.contact_email ?? '',
      contact_phone: doc?.contact_phone ?? '',
      blocks: doc?.blocks ?? [],
    };
  },
  publicPath: (slug) => `/agenda/${slug}`,
  layout: 'outline',
  outline: OUTLINE,
  Body: EventBody,
};

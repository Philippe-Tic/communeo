/**
 * Informations de la commune (handoff 6.10, ticket #143) : identité (nom, logo, favicon, population,
 * coordonnées GPS), coordonnées de la mairie, horaires d'ouverture et fermetures exceptionnelles.
 * Bouton « Enregistrer » explicite ; l'adresse est requise pour la conformité (mentions légales).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { emptyOpeningHours, WEEKDAY_LABELS, WEEKDAYS, type OpeningHours, type Weekday } from '@communeo/core/client';
import { Form, FormSection, TextareaField, TextField, useZodForm } from '@/components/form';
import { ImageField } from '@/components/media/media-fields';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { focusHeadingIfRequested } from '@/lib/focus';
import type { LibraryFile } from '@/lib/media-library';
import { saveSiteSettings, type SiteSettings } from '@/lib/site-settings';
import { ComplianceBadge } from './compliance-badge';
import { OpeningHoursEditor, type Closure } from './opening-hours-editor';
import { SettingsScreen } from './settings-screen';

const FORM_ID = 'reglages-informations';

const range = z
  .object({ open: z.string(), close: z.string() })
  .refine((value) => value.open < value.close, { message: "L'heure de fermeture doit être après l'ouverture" });

const dayRanges = (day: Weekday) =>
  z.array(range).superRefine((ranges, ctx) => {
    const sorted = [...ranges].sort((a, b) => a.open.localeCompare(b.open));
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index]!.open < sorted[index - 1]!.close) {
        ctx.addIssue({
          code: 'custom',
          message: `Deux plages du ${WEEKDAY_LABELS[day].long} se chevauchent`,
          path: [ranges.indexOf(sorted[index]!)],
        });
        return;
      }
    }
  });

/** « 46.7412, 3.7891 » (ou séparées par un espace, un point-virgule) → latitude et longitude */
export function parseCoordinates(text: string): { latitude: number; longitude: number } | null {
  const parts = text
    .trim()
    .split(/\s*[,;]\s*|\s+/)
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const [latitude, longitude] = parts.map(Number) as [number, number];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
    return null;
  return { latitude, longitude };
}

/** Réglages « Informations de la commune » (repris par l'étape « Votre commune » de l'assistant) */
export const informationsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Indiquez le nom de la commune')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  logo: z.custom<LibraryFile | null>(),
  favicon: z.custom<LibraryFile | null>(),
  population: z
    .string()
    .trim()
    .regex(/^(\d[\d\s ]*)?$/, 'Indiquez un nombre d’habitants, sans lettres'),
  coordinates: z
    .string()
    .refine(
      (value) => !value.trim() || parseCoordinates(value) !== null,
      'Indiquez la latitude puis la longitude, séparées par une virgule (ex. 46.7412, 3.7891)',
    ),
  address: z.string().max(300, "L'adresse ne doit pas dépasser 300 caractères"),
  contact_phone: z
    .string()
    .trim()
    .refine(
      (value) => !value || (/^[+\d][\d\s.()-]*$/.test(value) && value.replace(/\D/g, '').length >= 10),
      'Indiquez un numéro de téléphone à 10 chiffres',
    ),
  contact_mail: z
    .string()
    .trim()
    .min(1, "Indiquez l'e-mail de la mairie")
    .pipe(z.email("L'adresse e-mail n'est pas valide")),
  contact_form_intro: z.string().max(500, "Le texte d'introduction ne doit pas dépasser 500 caractères"),
  hours: z.object({
    days: z.object(
      Object.fromEntries(WEEKDAYS.map((day) => [day, dayRanges(day)])) as Record<Weekday, ReturnType<typeof dayRanges>>,
    ),
    closures: z.array(z.custom<Closure>()),
  }),
});

export type InformationsValues = z.input<typeof informationsSchema>;
type Values = InformationsValues;

export function informationsValues(site: SiteSettings): Values {
  const info = site.infos_pratiques;
  const hours: OpeningHours = info?.opening_hours ?? emptyOpeningHours();
  return {
    name: site.name ?? '',
    logo: site.logo ?? null,
    favicon: site.favicon ?? null,
    population: info?.population != null ? String(info.population) : '',
    coordinates: info?.latitude != null && info?.longitude != null ? `${info.latitude}, ${info.longitude}` : '',
    address: site.address ?? '',
    contact_phone: site.contact_phone ?? '',
    contact_mail: site.contact_mail ?? '',
    contact_form_intro: info?.contact_form_intro ?? '',
    hours: {
      days: Object.fromEntries(
        WEEKDAYS.map((day) => [day, (hours.days?.[day] ?? []).map(({ open, close }) => ({ open, close }))]),
      ) as Values['hours']['days'],
      closures: (hours.closures ?? []).map((closure) => ({
        date: closure.date,
        end: closure.end ?? '',
        label: closure.label ?? '',
      })),
    },
  };
}

const optional = (value: string) => value.trim() || null;

/** Valeurs du formulaire → données du Site (le composant « infos pratiques » est envoyé en entier) */
export function informationsPayload(values: Values, site: SiteSettings) {
  const coordinates = parseCoordinates(values.coordinates);
  const infos_pratiques = {
    opening_hours: {
      days: Object.fromEntries(
        WEEKDAYS.map((day) => [day, [...values.hours.days[day]].sort((a, b) => a.open.localeCompare(b.open))]),
      ),
      closures: [...values.hours.closures]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((closure) => ({ date: closure.date, end: closure.end || null, label: optional(closure.label) })),
      note: site.infos_pratiques?.opening_hours?.note ?? null,
    } as OpeningHours,
    population: values.population.trim() ? Number(values.population.replace(/\D/g, '')) : null,
    contact_form_intro: optional(values.contact_form_intro),
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
  };
  const common = {
    name: values.name.trim(),
    address: optional(values.address),
    contact_phone: optional(values.contact_phone),
    contact_mail: values.contact_mail.trim(),
    infos_pratiques,
  };
  return {
    data: { ...common, logo: values.logo?.id ?? null, favicon: values.favicon?.id ?? null },
    cached: { ...common, logo: values.logo, favicon: values.favicon },
  };
}

export function InformationsScreen({ site }: { site: SiteSettings }) {
  const client = useQueryClient();
  const form = useZodForm(informationsSchema, informationsValues(site));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(site.updatedAt);
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = form.formState.isDirty;
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Informations de la commune · Communeo';
  }, []);

  const save = async (values: Values): Promise<boolean> => {
    setSaving(true);
    try {
      const { data, cached } = informationsPayload(values, site);
      await saveSiteSettings(client, site.documentId, data, cached);
      form.reset(values);
      setSavedAt(new Date().toISOString());
      toast.success('Informations enregistrées. Elles seront en ligne à la prochaine mise en ligne du site.');
      return true;
    } catch (error) {
      toast.error(
        `Les informations n'ont pas pu être enregistrées : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`,
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Depuis la fenêtre « modifications non enregistrées » : validation puis enregistrement
  const saveFromGuard = async () => {
    let ok = false;
    await form.handleSubmit(async (values) => {
      ok = await save(values);
    })();
    return ok;
  };

  return (
    <SettingsScreen
      id="informations"
      title="Informations de la commune"
      site={site}
      headingRef={heading}
      dirty={dirty}
      saving={saving}
      savedAt={savedAt}
      onCancel={() => form.reset()}
      onSave={saveFromGuard}
      form={FORM_ID}
    >
      <Form id={FORM_ID} form={form} className="space-y-6" onSubmit={(values) => void save(values)}>
        <FormSection title="Identité" fields={['name', 'logo', 'favicon', 'population', 'coordinates']}>
          <TextField name="name" label="Nom de la commune" required />
          <div className="grid gap-5 sm:grid-cols-2">
            <ImageField
              name="logo"
              label="Logo"
              folder="Logos et blasons"
              describe={false}
              help="SVG ou PNG à fond transparent, 512 px minimum. Il apparaît sur fond clair et sur fond foncé."
            />
            <ImageField
              name="favicon"
              label="Favicon"
              folder="Logos et blasons"
              describe={false}
              help="La petite icône affichée dans l'onglet du navigateur."
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="population"
              label="Population"
              inputProps={{ inputMode: 'numeric' }}
              help="Nombre d'habitants."
            />
            <TextField
              name="coordinates"
              label="Coordonnées GPS"
              help="Latitude, longitude. Utilisées pour la carte et la météo."
              inputProps={{ placeholder: '46.7412, 3.7891' }}
            />
          </div>
        </FormSection>

        <FormSection
          title="Coordonnées de la mairie"
          fields={['address', 'contact_phone', 'contact_mail', 'contact_form_intro']}
        >
          <TextField
            name="address"
            label="Adresse"
            hideOptional
            badge={<ComplianceBadge />}
            help="Affichée dans le pied de page et les mentions légales."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="contact_phone" label="Téléphone" inputProps={{ type: 'tel', autoComplete: 'off' }} />
            <TextField
              name="contact_mail"
              label="E-mail"
              required
              inputProps={{ type: 'email', autoComplete: 'off' }}
            />
          </div>
          <TextareaField name="contact_form_intro" label="Texte d'introduction du formulaire de contact" rows={2} />
        </FormSection>

        <FormSection title="Horaires d'ouverture" fields={['hours']}>
          <OpeningHoursEditor name="hours" />
        </FormSection>
      </Form>
    </SettingsScreen>
  );
}

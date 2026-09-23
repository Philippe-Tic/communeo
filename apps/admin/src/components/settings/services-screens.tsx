/**
 * Démarches et Open data (handoff 6.10, ticket #143) : un interrupteur d'activation en tête de carte,
 * les champs n'apparaissent que si le service est activé.
 * - Démarches : fiches Service-Public.fr (comarquage) pour le code INSEE de la commune, publics affichés ;
 * - Open data : lien vers les jeux de données publics de la commune.
 */
import { AUDIENCE_LABELS, DEMARCHE_AUDIENCES, type DemarcheAudience } from '@communeo/core';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FieldSet, Form, FormSection, SelectField, SwitchField, TextField, useFieldError } from '@/components/form';
import type { SiteSettings } from '@/lib/site-settings';
import { SettingsScreen } from './settings-screen';
import { useSettingsForm } from './use-settings-form';

const AUDIENCE_HELP: Record<DemarcheAudience, string> = {
  particuliers: 'État civil, papiers, famille, logement…',
  professionnels: 'Création d’entreprise, commerce, marchés publics…',
};

const demarchesSchema = z
  .object({
    enabled: z.boolean(),
    code_insee: z.string().trim().toUpperCase(),
    audiences: z.array(z.custom<DemarcheAudience>()),
  })
  .superRefine((values, ctx) => {
    if (!values.enabled) return;
    if (!/^(\d{5}|2[AB]\d{3})$/.test(values.code_insee)) {
      ctx.addIssue({
        code: 'custom',
        path: ['code_insee'],
        message: values.code_insee
          ? 'Le code INSEE compte 5 caractères (ex. 58236, 2A004)'
          : 'Indiquez le code INSEE de la commune',
      });
    }
    if (!values.audiences.length)
      ctx.addIssue({ code: 'custom', path: ['audiences'], message: 'Choisissez au moins un public' });
  });

type DemarchesValues = z.infer<typeof demarchesSchema>;

function AudiencesField() {
  const { control } = useFormContext<DemarchesValues>();
  const error = useFieldError('audiences');
  return (
    <Controller
      control={control}
      name="audiences"
      render={({ field: { value, onChange } }) => (
        <FieldSet name="audiences" legend="Publics affichés" hideOptional error={error}>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {DEMARCHE_AUDIENCES.map((audience) => (
              <label key={audience} className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={value.includes(audience)}
                  aria-describedby={`public-${audience}-aide`}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? DEMARCHE_AUDIENCES.filter((entry) => entry === audience || value.includes(entry))
                        : value.filter((entry) => entry !== audience),
                    )
                  }
                  className="mt-0.5 size-[18px] shrink-0 rounded accent-[var(--brand-button)]"
                />
                <span>
                  {AUDIENCE_LABELS[audience]}
                  <span id={`public-${audience}-aide`} className="block text-[13px] text-secondary">
                    {AUDIENCE_HELP[audience]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </FieldSet>
      )}
    />
  );
}

function DemarchesFields() {
  const enabled = useWatch<DemarchesValues, 'enabled'>({ name: 'enabled' });
  return enabled ? (
    <>
      <TextField
        name="code_insee"
        label="Code INSEE"
        hideOptional
        className="max-w-xs"
        help="Différent du code postal. Ex. 58236."
        inputProps={{ autoComplete: 'off' }}
      />
      <AudiencesField />
    </>
  ) : null;
}

export function DemarchesScreen({ site }: { site: SiteSettings }) {
  const { form, onSubmit, screen } = useSettingsForm({
    site,
    title: 'Démarches',
    schema: demarchesSchema,
    toValues: (value) => ({
      enabled: !!value.comarquage_enabled,
      code_insee: value.code_insee ?? '',
      audiences: (value.comarquage_audiences ?? ['particuliers']).filter((audience): audience is DemarcheAudience =>
        (DEMARCHE_AUDIENCES as string[]).includes(audience),
      ),
    }),
    toPayload: (values) => ({
      data: {
        comarquage_enabled: values.enabled,
        code_insee: values.code_insee.trim() || null,
        comarquage_audiences: values.audiences,
      },
    }),
    saved: 'Démarches enregistrées. Elles seront en ligne à la prochaine mise en ligne du site.',
    failed: "Les démarches n'ont pas pu être enregistrées",
  });
  return (
    <SettingsScreen id="demarches" form="reglages-demarches" {...screen}>
      <Form id="reglages-demarches" form={form} className="space-y-6" requiredNote={false} onSubmit={onSubmit}>
        <FormSection title="Démarches (Service-Public.fr)" fields={['enabled', 'code_insee', 'audiences']}>
          <SwitchField
            name="enabled"
            label="Afficher les démarches sur le site"
            help="Les fiches officielles de Service-Public.fr sont affichées sur votre site et mises à jour automatiquement."
          />
          <DemarchesFields />
        </FormSection>
      </Form>
    </SettingsScreen>
  );
}

const PLATFORMS = [
  { value: 'data-gouv-fr', label: 'data.gouv.fr' },
  { value: 'opendatasoft', label: 'Opendatasoft' },
  { value: 'custom', label: 'Autre plateforme' },
] as const;

const openDataSchema = z
  .object({
    enabled: z.boolean(),
    platform: z.enum(['', 'data-gouv-fr', 'opendatasoft', 'custom']),
    url: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (!values.enabled) return;
    if (!values.platform) ctx.addIssue({ code: 'custom', path: ['platform'], message: 'Choisissez la plateforme' });
    if (!values.url)
      ctx.addIssue({ code: 'custom', path: ['url'], message: "Indiquez l'adresse de vos jeux de données" });
    else if (!/^https:\/\/\S+\.\S+/.test(values.url))
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'Indiquez une adresse commençant par https://' });
  });

type OpenDataValues = z.infer<typeof openDataSchema>;

function OpenDataFields() {
  const enabled = useWatch<OpenDataValues, 'enabled'>({ name: 'enabled' });
  return enabled ? (
    <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
      <SelectField name="platform" label="Plateforme" hideOptional placeholder="Choisir" options={[...PLATFORMS]} />
      <TextField
        name="url"
        label="Adresse des jeux de données"
        hideOptional
        inputProps={{ type: 'url', placeholder: 'https://www.data.gouv.fr/fr/organizations/…', autoComplete: 'off' }}
      />
    </div>
  ) : null;
}

export function OpenDataScreen({ site }: { site: SiteSettings }) {
  const { form, onSubmit, screen } = useSettingsForm({
    site,
    title: 'Open data',
    schema: openDataSchema,
    toValues: (value) => ({
      enabled: !!value.open_data_enabled,
      platform: (value.open_data_platform && value.open_data_platform !== 'none'
        ? value.open_data_platform
        : '') as OpenDataValues['platform'],
      url: value.open_data_url ?? '',
    }),
    toPayload: (values) => ({
      data: {
        open_data_enabled: values.enabled,
        open_data_platform: values.platform || null,
        open_data_url: values.url.trim() || null,
      },
    }),
    saved: 'Open data enregistré. Il sera en ligne à la prochaine mise en ligne du site.',
    failed: "L'open data n'a pas pu être enregistré",
  });
  return (
    <SettingsScreen id="open-data" form="reglages-open-data" {...screen}>
      <Form id="reglages-open-data" form={form} className="space-y-6" requiredNote={false} onSubmit={onSubmit}>
        <FormSection title="Open data" fields={['enabled', 'platform', 'url']}>
          <SwitchField
            name="enabled"
            label="Afficher un lien vers vos données publiques"
            help="Le site présente vos jeux de données publics et renvoie vers la plateforme qui les héberge."
          />
          <OpenDataFields />
        </FormSection>
      </Form>
    </SettingsScreen>
  );
}

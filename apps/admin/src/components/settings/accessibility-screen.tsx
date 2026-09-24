/**
 * Accessibilité (handoff 6.10, ticket #143) : niveau de conformité déclaré (trois valeurs, chacune
 * expliquée : c'est une déclaration juridique), compléments de la déclaration, schéma pluriannuel
 * (obligatoire dès que le site n'est pas totalement conforme) et plan d'action.
 */
import { isRichTextEmpty, type RichTextDocument } from '@communeo/core';
import { useWatch } from 'react-hook-form';
import { z } from 'zod';
import { emptyDoc } from '@/components/blocks/catalog';
import { RichTextField } from '@/components/blocks/rich-text';
import { Form, FormSection, RadioGroupField, TextField } from '@/components/form';
import type { AccessibilityLevel, SiteSettings } from '@/lib/site-settings';
import { ComplianceBadge } from './compliance-badge';
import { SettingsScreen } from './settings-screen';
import { useSettingsForm } from './use-settings-form';

const FORM_ID = 'reglages-accessibilite';

const LEVELS: Array<{ value: AccessibilityLevel; label: string; description: string }> = [
  {
    value: 'non-conforme',
    label: 'Non conforme',
    description: 'Moins de 50 % des critères du RGAA sont respectés, ou aucun audit n’a été mené.',
  },
  {
    value: 'partiellement-conforme',
    label: 'Partiellement conforme',
    description: 'Entre 50 % et 99 % des critères sont respectés. C’est le cas le plus courant.',
  },
  {
    value: 'conforme',
    label: 'Totalement conforme',
    description: '100 % des critères sont respectés, audit à l’appui.',
  },
];

const url = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^https?:\/\/\S+\.\S+/.test(value) || /^\/\S*$/.test(value),
    'Indiquez une adresse commençant par https:// (ou une page du site, commençant par /)',
  );

const schema = z
  .object({
    level: z.enum(['', 'non-conforme', 'partiellement-conforme', 'conforme']),
    declaration: z.custom<RichTextDocument>(),
    schema_url: url,
    action_plan_url: url,
  })
  .refine((values) => !values.level || values.level === 'conforme' || !!values.schema_url.trim(), {
    message:
      'Le lien vers le schéma pluriannuel est obligatoire dès que le niveau déclaré n’est pas « Totalement conforme »',
    path: ['schema_url'],
  });

type Values = z.infer<typeof schema>;
export type AccessibilityValues = Values;

export function accessibilityValues(site: SiteSettings): Values {
  const a11y = site.accessibilite;
  const declaration = a11y?.accessibility_declaration;
  return {
    level: a11y?.accessibility_level ?? '',
    declaration: declaration && typeof declaration === 'object' ? (declaration as RichTextDocument) : emptyDoc(),
    schema_url: a11y?.accessibility_schema_url ?? '',
    action_plan_url: a11y?.accessibility_action_plan_url ?? '',
  };
}

export function accessibilityPayload(values: Values) {
  const accessibilite = {
    accessibility_level: values.level || null,
    accessibility_declaration: isRichTextEmpty(values.declaration) ? null : values.declaration,
    accessibility_schema_url: values.schema_url.trim() || null,
    accessibility_action_plan_url: values.action_plan_url.trim() || null,
  };
  return { data: { accessibilite }, cached: { accessibilite: accessibilite as SiteSettings['accessibilite'] } };
}

function SchemaUrlField() {
  const level = useWatch({ name: 'level' }) as Values['level'];
  const required = !!level && level !== 'conforme';
  return (
    <TextField
      name="schema_url"
      label="Lien vers le schéma pluriannuel"
      hideOptional={required}
      badge={required ? <ComplianceBadge /> : undefined}
      help={
        required
          ? 'Obligatoire dès que le niveau déclaré n’est pas « Totalement conforme ».'
          : 'Document de la commune qui planifie la mise en accessibilité sur trois ans.'
      }
      inputProps={{ type: 'url', placeholder: 'https://' }}
    />
  );
}

export function AccessibilityScreen({ site }: { site: SiteSettings }) {
  const { form, onSubmit, screen } = useSettingsForm({
    site,
    title: 'Accessibilité',
    schema,
    toValues: accessibilityValues,
    toPayload: accessibilityPayload,
    saved: 'Déclaration d’accessibilité enregistrée. Elle sera en ligne à la prochaine mise en ligne du site.',
    failed: 'La déclaration d’accessibilité n’a pas pu être enregistrée',
  });
  return (
    <SettingsScreen id="accessibilite" form={FORM_ID} {...screen}>
      <Form id={FORM_ID} form={form} className="space-y-6" requiredNote={false} onSubmit={onSubmit}>
        <FormSection
          title="Déclaration d’accessibilité"
          fields={['level', 'declaration', 'schema_url', 'action_plan_url']}
        >
          <RadioGroupField
            name="level"
            label="Niveau de conformité déclaré"
            cards
            hideOptional
            badge={<ComplianceBadge />}
            options={LEVELS}
          />
          <RichTextField
            name="declaration"
            label="Compléments de la déclaration"
            help="Le site affiche déjà l’engagement de la commune, l’état de conformité, le contact et les voies de recours. Ajoutez ici les contenus non accessibles, les dérogations et la date de l’audit."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SchemaUrlField />
            <TextField
              name="action_plan_url"
              label="Lien vers le plan d’action"
              help="Actions prévues cette année."
              inputProps={{ type: 'url', placeholder: 'https://' }}
            />
          </div>
        </FormSection>
      </Form>
    </SettingsScreen>
  );
}

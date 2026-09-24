/**
 * Mentions légales et RGPD (handoff 6.10, ticket #143, administrateurs) : éditeur du site (SIRET,
 * directeur de la publication requis pour la conformité), hébergeur renseigné par Communeo (non
 * modifiable), données personnelles (délégué, politique) et compléments (crédits, mentions).
 */
import { isRichTextEmpty, type RichTextDocument } from '@communeo/core';
import { z } from 'zod';
import { emptyDoc } from '@/components/blocks/catalog';
import { RichTextField } from '@/components/blocks/rich-text';
import { Form, FormSection, TextField } from '@/components/form';
import type { SiteSettings } from '@/lib/site-settings';
import { ComplianceBadge } from './compliance-badge';
import { SettingsScreen } from './settings-screen';
import { useSettingsForm } from './use-settings-form';

const FORM_ID = 'reglages-legal';

const phone = z
  .string()
  .trim()
  .refine(
    (value) => !value || (/^[+\d][\d\s.()-]*$/.test(value) && value.replace(/\D/g, '').length >= 10),
    'Indiquez un numéro de téléphone à 10 chiffres',
  );

/** Réglages « Mentions légales et RGPD » (repris par l'étape « Obligations » de l'assistant) */
export const legalSchema = z.object({
  siret: z
    .string()
    .trim()
    .refine((value) => !value || value.replace(/\s/g, '').match(/^\d{14}$/), 'Le SIRET compte 14 chiffres'),
  publication_director: z.string().trim().max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  publication_director_title: z.string().trim().max(100, 'La fonction ne doit pas dépasser 100 caractères'),
  dpo_name: z.string().trim().max(150, 'Le nom ne doit pas dépasser 150 caractères'),
  dpo_email: z.union([z.literal(''), z.email("L'adresse e-mail n'est pas valide")]),
  dpo_phone: phone,
  rgpd_policy: z.custom<RichTextDocument>(),
  credits: z.custom<RichTextDocument>(),
  mentions_legales_extra: z.custom<RichTextDocument>(),
});

export type LegalValues = z.infer<typeof legalSchema>;
type Values = LegalValues;

const doc = (value: unknown) => (value && typeof value === 'object' ? (value as RichTextDocument) : emptyDoc());
const richOrNull = (value: RichTextDocument) => (isRichTextEmpty(value) ? null : value);
const optional = (value: string) => value.trim() || null;

export function legalValues(site: SiteSettings): Values {
  const legal = site.mentions_legales;
  const rgpd = site.rgpd;
  return {
    siret: legal?.siret ?? '',
    publication_director: legal?.publication_director ?? '',
    publication_director_title: legal?.publication_director_title ?? '',
    dpo_name: rgpd?.dpo_name ?? '',
    dpo_email: rgpd?.dpo_email ?? '',
    dpo_phone: rgpd?.dpo_phone ?? '',
    rgpd_policy: doc(rgpd?.rgpd_policy),
    credits: doc(legal?.credits),
    mentions_legales_extra: doc(legal?.mentions_legales_extra),
  };
}

export function legalPayload(values: Values, site: SiteSettings) {
  const legal = site.mentions_legales;
  const mentions_legales = {
    siret: optional(values.siret),
    publication_director: optional(values.publication_director),
    publication_director_title: optional(values.publication_director_title),
    credits: richOrNull(values.credits),
    mentions_legales_extra: richOrNull(values.mentions_legales_extra),
  };
  const rgpd = {
    rgpd_policy: richOrNull(values.rgpd_policy),
    dpo_name: optional(values.dpo_name),
    dpo_email: optional(values.dpo_email),
    dpo_phone: optional(values.dpo_phone),
  };
  // L'hébergeur est fixé par le serveur : l'admin garde celui qu'il connaît
  const host = {
    hebergeur_name: legal?.hebergeur_name ?? null,
    hebergeur_address: legal?.hebergeur_address ?? null,
    hebergeur_phone: legal?.hebergeur_phone ?? null,
  };
  return { data: { mentions_legales, rgpd }, cached: { mentions_legales: { ...mentions_legales, ...host }, rgpd } };
}

function HostCard({ site }: { site: SiteSettings }) {
  const legal = site.mentions_legales;
  return (
    <div>
      <p className="font-medium">Hébergeur</p>
      <div className="mt-1.5 rounded-lg border border-border bg-sidebar px-3 py-2.5 text-secondary dark:bg-bg">
        {legal?.hebergeur_name ? (
          <>
            <p className="text-text">{legal.hebergeur_name}</p>
            {legal.hebergeur_address && <p>{legal.hebergeur_address}</p>}
            {legal.hebergeur_phone && <p>{legal.hebergeur_phone}</p>}
          </>
        ) : (
          <p>Pas encore renseigné.</p>
        )}
      </div>
      <p className="mt-1.5 text-[13px] text-secondary">Renseigné par Communeo, pour toutes les communes.</p>
    </div>
  );
}

export function LegalScreen({ site }: { site: SiteSettings }) {
  const { form, onSubmit, screen } = useSettingsForm({
    site,
    title: 'Mentions légales et RGPD',
    schema: legalSchema,
    toValues: legalValues,
    toPayload: legalPayload,
    saved: 'Mentions légales enregistrées. Elles seront en ligne à la prochaine mise en ligne du site.',
    failed: "Les mentions légales n'ont pas pu être enregistrées",
  });
  return (
    <SettingsScreen id="legal" form={FORM_ID} {...screen}>
      <Form id={FORM_ID} form={form} className="space-y-6" requiredNote={false} onSubmit={onSubmit}>
        <FormSection title="Éditeur du site" fields={['siret', 'publication_director', 'publication_director_title']}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="siret"
              label="SIRET"
              inputProps={{ inputMode: 'numeric' }}
              help="14 chiffres. Pré-rempli à la création, à vérifier."
            />
            <HostCard site={site} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="publication_director"
              label="Directeur de la publication"
              hideOptional
              badge={<ComplianceBadge />}
              help="En général, le maire."
            />
            <TextField
              name="publication_director_title"
              label="Fonction"
              help="Ex. « Maire de Saint-Aubin-sur-Loire »."
            />
          </div>
        </FormSection>

        <FormSection title="Données personnelles" fields={['dpo_name', 'dpo_email', 'dpo_phone', 'rgpd_policy']}>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField name="dpo_name" label="Délégué (DPO)" help="Personne ou organisme." />
            <TextField name="dpo_email" label="E-mail du DPO" inputProps={{ type: 'email', autoComplete: 'off' }} />
            <TextField name="dpo_phone" label="Téléphone du DPO" inputProps={{ type: 'tel', autoComplete: 'off' }} />
          </div>
          <RichTextField
            name="rgpd_policy"
            label="Politique de données personnelles"
            headings={false}
            help="Données collectées, finalités, durées de conservation. Le site ajoute les droits des personnes et le formulaire pour les exercer."
          />
        </FormSection>

        <FormSection title="Compléments" fields={['credits', 'mentions_legales_extra']}>
          <RichTextField
            name="credits"
            label="Crédits"
            headings={false}
            help="Photographies, illustrations, réalisation du site."
          />
          <RichTextField name="mentions_legales_extra" label="Autres mentions" headings={false} />
        </FormSection>
      </Form>
    </SettingsScreen>
  );
}

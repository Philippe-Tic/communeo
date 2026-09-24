/**
 * Étape 5 — Obligations légales (#152, handoff 6.18) : la politique de données personnelles et la
 * déclaration d'accessibilité sont pré-remplies avec des modèles, à relire (et modifier) sur place ;
 * les informations qui ne se devinent pas (SIRET, directeur de publication) sont demandées ici.
 * « Compléter plus tard » enregistre ce qui est là et passe à la suite ; la conformité les rappellera.
 */
import { Dialog } from 'radix-ui';
import { Check, CircleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';
import {
  accessibilityDeclarationTemplate,
  DEFAULT_ACCESSIBILITY_LEVEL,
  isRichTextEmpty,
  privacyPolicyTemplate,
  type RichTextDocument,
} from '@communeo/core';
import { RichTextField } from '@/components/blocks/rich-text';
import { Form, TextField, useZodForm } from '@/components/form';
import { accessibilityPayload, accessibilityValues } from '@/components/settings/accessibility-screen';
import { legalPayload, legalSchema, legalValues } from '@/components/settings/legal-screen';
import { Button } from '@/components/ui/button';
import { dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import type { SiteSettings } from '@/lib/site-settings';
import { cn } from '@/lib/utils';
import { WizardActions, type StepProps } from '../onboarding-screen';
import { WizardFrame } from '../wizard-frame';
import { StepHeading } from './step-heading';

const FORM_ID = 'assistant-obligations';

const schema = legalSchema
  .pick({
    siret: true,
    publication_director: true,
    publication_director_title: true,
    dpo_name: true,
    dpo_email: true,
    rgpd_policy: true,
  })
  .extend({ declaration: z.custom<RichTextDocument>() });
type Values = z.infer<typeof schema>;

const LEVEL_LABELS: Record<string, string> = {
  'non-conforme': 'non conforme',
  'partiellement-conforme': 'partiellement conforme',
  conforme: 'totalement conforme',
};

function initialValues(site: SiteSettings): Values {
  const legal = legalValues(site);
  const a11y = accessibilityValues(site);
  return {
    siret: legal.siret,
    publication_director: legal.publication_director,
    publication_director_title: legal.publication_director_title,
    dpo_name: legal.dpo_name,
    dpo_email: legal.dpo_email,
    rgpd_policy: isRichTextEmpty(legal.rgpd_policy)
      ? privacyPolicyTemplate({ communeName: site.name })
      : legal.rgpd_policy,
    declaration: isRichTextEmpty(a11y.declaration)
      ? accessibilityDeclarationTemplate({ date: new Date() })
      : a11y.declaration,
  };
}

/** Relire un texte pré-rempli, et le modifier sur place */
function ReviewDialog({ name, title, help }: { name: 'rgpd_policy' | 'declaration'; title: string; help: string }) {
  const [open, setOpen] = useState(false);
  const returnFocus = useReturnFocus();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="tertiary" size="sm" className="max-md:h-11">
          Relire<span className="sr-only"> : {title}</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          {...returnFocus}
          className={cn(dialogContentClass, 'max-h-[calc(100dvh-32px)] max-w-[720px] overflow-y-auto')}
        >
          <Dialog.Title className="text-[17px] font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-secondary">{help}</Dialog.Description>
          <div className="mt-4">
            <RichTextField name={name} label={title} hideLabel />
          </div>
          <div className="mt-5 flex justify-end">
            <Dialog.Close asChild>
              <Button type="button">Terminer la relecture</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Row({
  done,
  title,
  status,
  action,
  children,
}: {
  done: boolean;
  title: string;
  status: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'rounded-xl border p-4',
        done ? 'border-border bg-surface dark:bg-sidebar' : 'border-danger bg-danger-alert-bg',
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-full',
            done ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger',
          )}
        >
          {done ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <p className={cn('text-[13px]', done ? 'text-secondary' : 'font-medium text-danger')}>{status}</p>
        </div>
        {action}
      </div>
      {children && <div className="mt-4 space-y-4">{children}</div>}
    </section>
  );
}

export function LegalStep({ site, step, next, back, alert }: StepProps & { alert: ReactNode }) {
  const form = useZodForm(schema, initialValues(site));
  const [saving, setSaving] = useState(false);
  const siret = form.watch('siret');
  const director = form.watch('publication_director');
  const dpoName = form.watch('dpo_name');
  // Les champs manquants restent affichés pendant la saisie (pas de disparition sous le curseur)
  const [askLegal] = useState(() => !site.mentions_legales?.siret || !site.mentions_legales?.publication_director);
  const [askDpo] = useState(() => !site.rgpd?.dpo_name);
  const missing = [!siret.trim() && 'SIRET', !director.trim() && 'directeur de publication'].filter(Boolean).length;
  const level = site.accessibilite?.accessibility_level ?? DEFAULT_ACCESSIBILITY_LEVEL;

  const payload = (values: Values) => {
    const legal = legalPayload({ ...legalValues(site), ...values }, site);
    const a11y = accessibilityPayload({
      ...accessibilityValues(site),
      level: level as ReturnType<typeof accessibilityValues>['level'],
      declaration: values.declaration,
    });
    return { data: { ...legal.data, ...a11y.data }, cached: { ...legal.cached, ...a11y.cached } };
  };
  const save = async (values: Values) => {
    setSaving(true);
    try {
      const { data, cached } = payload(values);
      await next(data, cached);
    } finally {
      setSaving(false);
    }
  };

  // Continuer : SIRET et directeur de publication requis ; « Compléter plus tard » passe sans eux
  const submitComplete = async (values: Values) => {
    let ok = true;
    if (!values.siret.trim()) {
      form.setError('siret', { message: 'Indiquez le SIRET de la mairie, ou choisissez « Compléter plus tard »' });
      ok = false;
    }
    if (!values.publication_director.trim()) {
      form.setError('publication_director', {
        message: 'Indiquez le directeur de publication, ou choisissez « Compléter plus tard »',
      });
      ok = false;
    }
    if (ok) await save(values);
    else form.setFocus(!values.siret.trim() ? 'siret' : 'publication_director');
  };

  return (
    <WizardFrame
      step={step}
      actions={
        <WizardActions
          onBack={back}
          tertiary={{ label: 'Compléter plus tard', onClick: () => void form.handleSubmit(save)() }}
          primary={{ label: 'Continuer', form: FORM_ID, busy: saving }}
        />
      }
    >
      {alert}
      <StepHeading step={step}>Vos obligations légales</StepHeading>
      <p className="mt-2 text-secondary">
        Les trois pages obligatoires sont pré-remplies. Relisez les textes proposés
        {missing === 2
          ? ' ; deux informations manquent et ne peuvent pas être devinées.'
          : missing === 1
            ? ' ; une information manque et ne peut pas être devinée.'
            : '.'}
      </p>
      <Form
        form={form}
        id={FORM_ID}
        className="mt-5 space-y-3"
        summaryTitle={(count) => `${count} information${count > 1 ? 's' : ''} à corriger`}
        onSubmit={submitComplete}
      >
        <Row
          done
          title="Données personnelles"
          status={
            dpoName.trim()
              ? 'Politique pré-remplie, délégué à la protection des données renseigné'
              : 'Politique pré-remplie ; délégué à la protection des données à indiquer'
          }
          action={
            <ReviewDialog
              name="rgpd_policy"
              title="Politique de données personnelles"
              help="Ce texte s'affiche sur la page « Données personnelles » du site, avec vos droits et les recours."
            />
          }
        >
          {askDpo && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="dpo_name"
                label="Délégué à la protection des données"
                help="Souvent le centre de gestion ou l'intercommunalité."
                inputProps={{ autoComplete: 'off' }}
              />
              <TextField
                name="dpo_email"
                label="E-mail du délégué"
                inputProps={{ type: 'email', autoComplete: 'off' }}
              />
            </div>
          )}
        </Row>
        <Row
          done
          title="Accessibilité"
          status={
            level === DEFAULT_ACCESSIBILITY_LEVEL
              ? 'Déclaration pré-remplie : sans audit, le site se déclare « non conforme »'
              : `Déclaration pré-remplie, niveau « ${LEVEL_LABELS[level] ?? level} »`
          }
          action={
            <ReviewDialog
              name="declaration"
              title="Déclaration d'accessibilité"
              help="Ce texte complète la page « Accessibilité » du site (état de conformité, contact et recours y figurent déjà)."
            />
          }
        />
        <Row
          done={missing === 0}
          title="Mentions légales"
          status={
            missing === 0 ? 'Complètes' : `${missing === 2 ? '2 informations manquantes' : '1 information manquante'}`
          }
        >
          {askLegal && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="siret"
                label="SIRET de la mairie"
                required
                inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
              />
              <TextField
                name="publication_director"
                label="Directeur de publication"
                required
                help="En général, le maire."
                inputProps={{ autoComplete: 'off' }}
              />
            </div>
          )}
        </Row>
      </Form>
    </WizardFrame>
  );
}

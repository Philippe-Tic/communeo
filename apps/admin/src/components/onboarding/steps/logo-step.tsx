/**
 * Étape 3 — Votre logo (#150) : envoi du logo (médiathèque de la commune, dossier « Logos et
 * blasons »), aperçu sur fond clair et sur fond foncé côte à côte, parce que les thèmes l'utilisent
 * dans les deux. Sans logo, le nom de la commune s'affiche à sa place : l'étape se passe.
 */
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { Form, useZodForm } from '@/components/form';
import { ImageField } from '@/components/media/media-fields';
import type { LibraryFile } from '@/lib/media-library';
import { WizardActions, type StepProps } from '../onboarding-screen';
import { WizardFrame } from '../wizard-frame';
import { StepHeading } from './step-heading';

const FORM_ID = 'assistant-logo';
const schema = z.object({ logo: z.custom<LibraryFile | null>() });

function Preview({ logo, name, dark }: { logo: LibraryFile | null; name: string; dark?: boolean }) {
  return (
    <figure
      className={
        dark
          ? 'flex flex-col items-center gap-3 rounded-xl bg-[#1E3A5F] p-5 text-white'
          : 'flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-5 text-[#1C1B18]'
      }
    >
      <figcaption className="text-[11px] font-semibold tracking-[0.08em] uppercase">
        {dark ? 'Sur fond foncé' : 'Sur fond clair'}
      </figcaption>
      <div className="grid h-24 w-full place-items-center">
        {logo ? (
          <img src={logo.url} alt={`Logo de ${name}`} className="max-h-24 max-w-[70%] object-contain" />
        ) : (
          <span className="text-center text-[17px] font-semibold">{name}</span>
        )}
      </div>
    </figure>
  );
}

export function LogoStep({ site, step, next, back, alert }: StepProps & { alert: ReactNode }) {
  const form = useZodForm(schema, { logo: site.logo ?? null });
  const logo = form.watch('logo');

  return (
    <WizardFrame
      step={step}
      actions={
        <WizardActions
          onBack={back}
          tertiary={{ label: 'Passer cette étape', onClick: () => void next() }}
          primary={{ label: 'Continuer', form: FORM_ID }}
        />
      }
    >
      {alert}
      <StepHeading step={step}>Votre logo</StepHeading>
      <p className="mt-2 text-secondary">
        Le logo apparaît en haut de chaque page du site. Un blason ou un logo au format SVG ou PNG à fond transparent,
        512 px de large minimum.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Preview logo={logo} name={site.name} />
        <Preview logo={logo} name={site.name} dark />
      </div>
      <Form
        form={form}
        id={FORM_ID}
        requiredNote={false}
        className="mt-4"
        onSubmit={(values) => next({ logo: values.logo?.id ?? null }, { logo: values.logo })}
      >
        <ImageField name="logo" label="Fichier du logo" folder="Logos et blasons" describe={false} />
      </Form>
      <p className="mt-3 flex items-start gap-2 text-[13px] text-secondary">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Pas de logo pour l'instant ? Continuez, le nom de la commune s'affichera à sa place.
      </p>
    </WizardFrame>
  );
}

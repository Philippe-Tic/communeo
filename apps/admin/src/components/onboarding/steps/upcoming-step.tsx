/**
 * Étapes 5 à 7 (obligations, premières pages, mise en ligne) : construites par les tickets #152 à
 * #154 ; en attendant, l'étape se passe et renvoie vers l'écran de l'admin qui le fait.
 */
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ONBOARDING_STEPS, TOTAL_STEPS } from '@/lib/onboarding';
import { WizardActions, type StepProps } from '../onboarding-screen';
import { WizardFrame } from '../wizard-frame';
import { StepHeading } from './step-heading';

const WHERE: Record<string, { to: string; label: string }> = {
  obligations: { to: '/mon-site/legal', label: 'Mon site › Mentions légales et RGPD' },
  pages: { to: '/pages', label: 'Pages' },
  'mise-en-ligne': { to: '/mise-en-ligne', label: 'Mise en ligne' },
};

export function UpcomingStep({ step, next, back, later, alert }: StepProps & { alert: ReactNode }) {
  const entry = ONBOARDING_STEPS[step - 1]!;
  const where = WHERE[entry.id]!;
  const last = step === TOTAL_STEPS;
  return (
    <WizardFrame
      step={step}
      actions={
        <WizardActions
          onBack={back}
          tertiary={last ? undefined : { label: 'Enregistrer et continuer plus tard', onClick: () => void later() }}
          primary={{ label: last ? 'Terminer' : 'Continuer', onClick: () => void next() }}
        />
      }
    >
      {alert}
      <StepHeading step={step}>{entry.label}</StepHeading>
      <p className="mt-3 max-w-[560px] text-secondary">
        Cette étape de l'assistant arrive bientôt. En attendant, vous pouvez la faire depuis l'administration, dans{' '}
        <Link to={where.to as '/'} className="font-semibold text-brand underline">
          {where.label}
        </Link>
        .
      </p>
    </WizardFrame>
  );
}

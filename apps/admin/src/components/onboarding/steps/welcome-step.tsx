/** Étape 1 — Bienvenue : une phrase, la durée, ce qu'il faut avoir sous la main */
import { FileImage, Hash, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { WizardActions, type StepProps } from '../onboarding-screen';
import { WizardFrame } from '../wizard-frame';
import { StepHeading } from './step-heading';

const HANDY = [
  { icon: FileImage, text: 'Le logo ou le blason de la commune' },
  { icon: Hash, text: 'Le numéro SIRET de la mairie' },
  { icon: UserRound, text: 'Le nom du directeur ou de la directrice de publication (le maire, en général)' },
];

export function WelcomeStep({ site, step, next, alert }: StepProps & { alert: ReactNode }) {
  return (
    <WizardFrame step={step} actions={<WizardActions primary={{ label: 'Commencer', onClick: () => void next() }} />}>
      {alert}
      <div className="mx-auto max-w-[520px] py-6 text-center md:py-12">
        <StepHeading step={step} className="text-[26px] outline-none md:text-[30px]">
          Créons le site de {site.name}
        </StepHeading>
        <p className="mt-3 text-[16px] text-secondary">
          Sept étapes courtes pour mettre votre site en ligne, en{' '}
          <strong className="text-text">20 minutes environ</strong>. Vous pourrez tout modifier ensuite.
        </p>
        <section
          aria-labelledby="sous-la-main"
          className="mt-7 rounded-xl border border-border bg-surface p-4 text-left dark:bg-sidebar"
        >
          <h2 id="sous-la-main" className="text-[15px] font-semibold">
            Utile à avoir sous la main
          </h2>
          <ul className="mt-2 space-y-1.5 text-[14px]">
            {HANDY.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2">
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-secondary" />
                {text}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </WizardFrame>
  );
}

/**
 * Gabarit de l'assistant (handoff 6.18) : logo Communeo et « Étape n sur 7 », indicateur de 7
 * barres (libellés sur ordinateur), contenu centré à 760 px, barre du bas avec les actions de
 * l'étape. Mobile : logo plus petit, barres sans libellés, barre du bas ← et « Continuer ».
 */
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ImpersonationBanner } from '@/components/shell/impersonation-banner';
import { auth } from '@/lib/api';
import { sessionQuery } from '@/lib/session';
import { CommuneoLogo } from '@/components/shell/logo';
import { ColorSchemeToggle } from '@/components/shell/color-scheme-toggle';
import { ONBOARDING_STEPS, TOTAL_STEPS } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

export function WizardFrame({ step, children, actions }: { step: number; children: ReactNode; actions: ReactNode }) {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const client = useQueryClient();
  const navigate = useNavigate();
  const impersonating = user.municipality_role === 'super_admin' && auth.impersonatedSite() !== null;
  const quit = async () => {
    const documentId = auth.impersonatedSite();
    auth.setImpersonatedSite(null);
    client.clear();
    await navigate(
      documentId ? { to: '/plateforme/communes/$documentId', params: { documentId } } : { to: '/plateforme' },
    );
  };
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {impersonating && (
        <ImpersonationBanner siteName={user.site?.name ?? 'cette commune'} onQuit={() => void quit()} />
      )}
      <a
        href="#contenu"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-surface px-4 py-2 text-sm font-semibold shadow-menu focus:translate-y-0"
      >
        Aller au contenu
      </a>
      <header className="mx-auto w-full max-w-[760px] px-4 pt-5 md:pt-8">
        <div className="flex items-center justify-between gap-3">
          <CommuneoLogo className="w-24 md:w-[120px]" />
          <div className="flex items-center gap-2">
            <p className="text-[13px] text-secondary">
              Étape {step} sur {TOTAL_STEPS}
            </p>
            <ColorSchemeToggle />
          </div>
        </div>
        <ol aria-label="Étapes de la création du site" className="mt-4 grid grid-cols-7 gap-1.5">
          {ONBOARDING_STEPS.map((entry, index) => {
            const number = index + 1;
            const state = number < step ? 'done' : number === step ? 'current' : 'todo';
            return (
              <li key={entry.id} aria-current={state === 'current' ? 'step' : undefined} className="min-w-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    'block h-1.5 rounded-full',
                    state === 'todo' ? 'bg-border' : 'bg-brand',
                    state === 'current' && 'ring-2 ring-brand ring-offset-2 ring-offset-bg',
                  )}
                />
                <span
                  className={cn(
                    'mt-1.5 block truncate text-[11px] max-md:sr-only',
                    state === 'todo' ? 'text-secondary' : 'font-semibold text-text',
                  )}
                >
                  {number} {entry.label}
                  {state === 'done' && <span className="sr-only"> (faite)</span>}
                  {state === 'current' && <span className="sr-only"> (en cours)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </header>
      <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-[760px] flex-1 px-4 pt-7 pb-8 outline-none">
        {children}
      </main>
      <footer className="sticky bottom-0 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center gap-3 px-4 py-3">{actions}</div>
      </footer>
    </div>
  );
}

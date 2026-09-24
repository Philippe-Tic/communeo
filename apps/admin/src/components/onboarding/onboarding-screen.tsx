/**
 * Assistant de création (#150–#154, handoff 6.18) : 7 étapes, chacune enregistrée en la quittant
 * (progression sur le Site). « Enregistrer et continuer plus tard » ramène au tableau de bord, qui
 * propose de reprendre ; la dernière étape termine l'assistant.
 */
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { requestHeadingFocus } from '@/lib/focus';
import { saveProgress, TOTAL_STEPS } from '@/lib/onboarding';
import { sessionQuery } from '@/lib/session';
import { siteSettingsQuery, type OnboardingProgress, type SiteSettings } from '@/lib/site-settings';
import { CommuneStep } from './steps/commune-step';
import { LegalStep } from './steps/legal-step';
import { LogoStep } from './steps/logo-step';
import { PagesStep } from './steps/pages-step';
import { ThemeStep } from './steps/theme-step';
import { PublishStep } from './steps/publish-step';
import { WelcomeStep } from './steps/welcome-step';
import { WizardFrame } from './wizard-frame';

export interface StepProps {
  site: SiteSettings;
  step: number;
  /** Enregistre l'étape (réglages éventuels) et passe à la suivante */
  next: (data?: Record<string, unknown>, cached?: Record<string, unknown>) => Promise<void>;
  back: () => void;
  /** Enregistre et revient au tableau de bord */
  later: (data?: Record<string, unknown>, cached?: Record<string, unknown>) => Promise<void>;
  /** Termine l'assistant sur place (dernière étape, écran de succès) */
  complete: () => Promise<boolean>;
}

const failure = (error: unknown) => (error instanceof ApiError ? error.message : 'le serveur ne répond pas');

/** Barre du bas : ← Retour, action tertiaire (plus tard / passer), action principale */
export function WizardActions({
  onBack,
  tertiary,
  primary,
}: {
  onBack?: () => void;
  tertiary?: { label: string; onClick: () => void };
  primary: { label: string; icon?: LucideIcon; busy?: boolean; form?: string; onClick?: () => void };
}) {
  const Icon = primary.icon;
  return (
    <>
      {onBack && (
        <Button type="button" variant="secondary" className="max-md:size-11 max-md:px-0" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className="md:hidden" />
          <span className="max-md:sr-only">Retour</span>
        </Button>
      )}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
        {tertiary && (
          <Button type="button" variant="tertiary" className="max-md:hidden" onClick={tertiary.onClick}>
            {tertiary.label}
          </Button>
        )}
        <Button
          type={primary.form ? 'submit' : 'button'}
          form={primary.form}
          onClick={primary.onClick}
          disabled={primary.busy}
          className="max-md:h-11"
        >
          {primary.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : Icon && <Icon aria-hidden="true" />}
          {primary.label}
        </Button>
      </div>
      {tertiary && (
        <Button type="button" variant="tertiary" className="w-full md:hidden" onClick={tertiary.onClick}>
          {tertiary.label}
        </Button>
      )}
    </>
  );
}

export function OnboardingScreen({ step: requested }: { step: number | undefined }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(sessionQuery);
  const site = useQuery(siteSettingsQuery(user.site!.documentId));
  const [error, setError] = useState<string | null>(null);

  if (!site.data)
    return (
      <WizardFrame step={requested ?? 1} actions={null}>
        {site.isError ? (
          <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
            Les informations de la commune n'ont pas pu être chargées.{' '}
            <Button type="button" variant="secondary" size="sm" onClick={() => void site.refetch()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-neutral-bg" />
        )}
      </WizardFrame>
    );

  const progress: OnboardingProgress = site.data.onboarding ?? { step: 1 };
  const step = Math.min(Math.max(requested ?? progress.step ?? 1, 1), TOTAL_STEPS);
  const go = (target: number) => {
    requestHeadingFocus();
    void navigate({ to: '/assistant', search: { etape: target } });
  };
  const persist = async (
    update: OnboardingProgress,
    data?: Record<string, unknown>,
    cached?: Record<string, unknown>,
  ) => {
    setError(null);
    try {
      await saveProgress(client, site.data!.documentId, update, data, cached);
      return true;
    } catch (caught) {
      setError(`L'étape n'a pas été enregistrée : ${failure(caught)}. Vos saisies sont toujours là, réessayez.`);
      return false;
    }
  };

  const props: StepProps = {
    site: site.data,
    step,
    back: () => go(step - 1),
    next: async (data, cached) => {
      const last = step === TOTAL_STEPS;
      const saved = await persist(
        last
          ? { step, completedAt: new Date().toISOString(), postponedAt: null }
          : {
              step: Math.max(progress.step ?? 1, step + 1),
              postponedAt: null,
              completedAt: progress.completedAt ?? null,
            },
        data,
        cached,
      );
      if (!saved) return;
      if (last) {
        toast.success('Votre site est prêt. Vous pouvez tout modifier depuis l’administration.');
        await navigate({ to: '/' });
      } else go(step + 1);
    },
    complete: () => persist({ step: TOTAL_STEPS, completedAt: new Date().toISOString(), postponedAt: null }),
    later: async (data, cached) => {
      const saved = await persist({ step, postponedAt: new Date().toISOString(), completedAt: null }, data, cached);
      if (!saved) return;
      toast.success('Étape enregistrée. Vous reprendrez là où vous en étiez depuis le tableau de bord.');
      await navigate({ to: '/' });
    },
  };

  const alert: ReactNode = error && (
    <p role="alert" className="mb-5 rounded-xl border border-danger bg-danger-alert-bg p-4">
      {error}
    </p>
  );

  if (step === 1) return <WelcomeStep {...props} alert={alert} />;
  if (step === 2) return <CommuneStep {...props} alert={alert} />;
  if (step === 3) return <LogoStep {...props} alert={alert} />;
  if (step === 4) return <ThemeStep {...props} alert={alert} />;
  if (step === 5) return <LegalStep {...props} alert={alert} />;
  if (step === 6) return <PagesStep {...props} alert={alert} />;
  return <PublishStep {...props} alert={alert} />;
}

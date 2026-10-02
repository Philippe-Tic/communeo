/**
 * Bandeau de la période d'essai (#310), au-dessus de l'administration : jours restants pendant
 * l'essai, lecture seule une fois l'essai terminé ; « Passer en live » mène à l'écran de la demande.
 * Devis signé pendant l'essai : l'essai est suspendu jusqu'à la décision de l'équipe (#368), le compte
 * à rebours laisse la place à l'attente.
 */
import { Link, useRouterState } from '@tanstack/react-router';
import { Clock, Hourglass, TriangleAlert } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import type { SessionSite } from '@/lib/session';
import { daysLeftLabel, formatDay, QUOTE_PENDING_LABEL, trialState } from '@/lib/trial';
import { cn } from '@/lib/utils';

export function TrialBanner({ site }: { site: SessionSite | null }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const trial = trialState(site);
  if (!trial) return null;

  const expired = trial.kind === 'expired';
  // Devis signé pendant l'essai : plus de compte à rebours
  const suspended = trial.kind === 'trial' && !!trial.requestedAt;
  const soon = trial.kind === 'trial' && !suspended && trial.daysLeft <= 7;
  const Icon = expired ? TriangleAlert : suspended ? Hourglass : Clock;
  const requested = expired && trial.requestedAt && `Passage en live demandé le ${formatDay(trial.requestedAt)} : l'équipe Communeo vous recontacte.`;

  return (
    <div
      role="region"
      aria-label="Période d'essai"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5 text-sm md:px-6',
        expired ? 'border-danger/30 bg-danger-bg' : soon ? 'border-warning/30 bg-warning-bg' : 'border-info/20 bg-info-bg',
      )}
    >
      <Icon aria-hidden="true" className={cn('size-5 shrink-0', expired ? 'text-danger' : soon ? 'text-warning' : 'text-info')} />
      <p className="min-w-0 flex-1 basis-60">
        {trial.kind === 'expired' ? (
          <>
            <strong className="font-semibold">Votre essai est terminé.</strong> Le site n'est plus en ligne et
            l'administration est en lecture seule.
            {trial.deletionAt && ` Vos contenus sont conservés jusqu'au ${formatDay(trial.deletionAt)}.`}
          </>
        ) : suspended ? (
          <>
            <strong className="font-semibold">{QUOTE_PENDING_LABEL}</strong> Votre essai est suspendu d'ici là : le site reste
            en ligne et vous pouvez continuer à le modifier.
          </>
        ) : (
          <>
            <strong className="font-semibold">Essai gratuit : {daysLeftLabel(trial.daysLeft)}</strong>, jusqu'au{' '}
            {formatDay(trial.endsAt)}.
          </>
        )}
        {requested && <> {requested}</>}
      </p>
      {!trial.requestedAt && pathname !== '/passer-en-live' && (
        <Link to="/passer-en-live" className={cn(buttonVariants({ variant: expired ? 'primary' : 'secondary', size: 'sm' }), 'max-md:h-11')}>
          Passer en live
        </Link>
      )}
    </div>
  );
}

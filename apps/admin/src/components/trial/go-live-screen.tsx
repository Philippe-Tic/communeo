/**
 * Passer en live (#310) : ce qui change, comment ça se passe, et la demande envoyée à l'équipe
 * Communeo (administrateurs). L'équipe passe ensuite la commune en live depuis l'espace équipe ; le
 * devis validé en ligne (#312) remplacera la demande.
 */
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { sessionQuery } from '@/lib/session';
import { daysLeftLabel, formatDay, requestGoLive, trialState } from '@/lib/trial';

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function GoLiveScreen() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const client = useQueryClient();
  const [sending, setSending] = useState(false);
  const trial = trialState(user.site);
  const admin = user.municipality_role === 'admin' || user.municipality_role === 'super_admin';

  if (!trial) {
    return (
      <div className="mx-auto max-w-[760px]">
        <PageHeader title="Passer en live" />
        <p role="status" className="flex items-start gap-3 rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          Le site de {user.site?.name ?? 'la commune'} est en live : il n'y a rien à faire.
        </p>
      </div>
    );
  }

  const send = async () => {
    setSending(true);
    try {
      await requestGoLive();
      await client.invalidateQueries({ queryKey: sessionQuery.queryKey });
      toast.success("Demande envoyée : l'équipe Communeo vous recontacte par e-mail.");
    } catch (error) {
      toast.error(`La demande n'a pas été envoyée : ${error instanceof ApiError ? error.message : 'le serveur ne répond pas'}.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <PageHeader
        title="Passer en live"
        description={
          trial.kind === 'trial'
            ? `Essai gratuit : ${daysLeftLabel(trial.daysLeft)}, jusqu'au ${formatDay(trial.endsAt)}.`
            : "Votre essai est terminé : le site n'est plus en ligne et l'administration est en lecture seule."
        }
      />

      <Card id="ce-qui-change" title="Ce qui change">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Le site reste en ligne après l'essai, sans limite de durée.</li>
          <li>Il n'affiche plus le bandeau « Site en préparation » et les moteurs de recherche peuvent l'indexer.</li>
          <li>Vous pouvez le relier à l'adresse de la commune (domaine personnalisé).</li>
          <li>Vous continuez à le modifier : vos contenus et vos réglages sont gardés tels quels.</li>
          {trial.kind === 'expired' && <li>Le site est remis en ligne dès le passage en live.</li>}
        </ul>
      </Card>

      <Card id="deroulement" title="Comment ça se passe">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Vous demandez le passage en live ci-dessous.</li>
          <li>L'équipe Communeo vous recontacte par e-mail avec un devis.</li>
          <li>Une fois le devis accepté, l'équipe passe votre commune en live.</li>
        </ol>
      </Card>

      {trial.requestedAt ? (
        <p role="status" className="flex items-start gap-3 rounded-xl border border-success/40 bg-success-bg p-5">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          <span>
            <strong className="font-semibold">Demande envoyée le {formatDay(trial.requestedAt)}.</strong> L'équipe
            Communeo vous recontacte par e-mail.
          </span>
        </p>
      ) : admin ? (
        <Button type="button" size="lg" className="max-md:w-full" disabled={sending} onClick={() => void send()}>
          {sending && <Loader2 aria-hidden="true" className="animate-spin" />}
          Demander le passage en live
        </Button>
      ) : (
        <p className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
          Seul un administrateur de la commune peut demander le passage en live.
        </p>
      )}
    </div>
  );
}

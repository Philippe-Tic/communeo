/**
 * À valider (#313) : ce qui attend une décision de l'équipe Communeo. Inscriptions dont la mairie n'a
 * pas d'adresse officielle dans l'Annuaire (l'identité du demandeur est à vérifier), et passages en live
 * demandés par les communes. Valider ou refuser ; un refus envoie son motif par e-mail.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Building2, Rocket } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatEuros } from '@communeo/core';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { focusHeadingIfRequested } from '@/lib/focus';
import { quotePdfUrl } from '@/lib/quote';
import { formatDay } from '@/lib/trial';
import {
  approveLive,
  approveSignup,
  refreshValidations,
  rejectLive,
  rejectSignup,
  validationsQuery,
  type LiveRequest,
  type SignupToReview,
} from '@/lib/validations';
import { ReasonDialog } from './reason-dialog';

const failure = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

type Decision =
  | { kind: 'approve-signup'; item: SignupToReview }
  | { kind: 'reject-signup'; item: SignupToReview }
  | { kind: 'approve-live'; item: LiveRequest }
  | { kind: 'reject-live'; item: LiveRequest };

function Section({ id, title, count, description, empty, children }: { id: string; title: string; count: number; description: string; empty: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div>
        <h2 id={id} className="text-xl">
          {title} <span className="font-normal text-secondary">· {count}</span>
        </h2>
        <p className="mt-1 text-secondary">{description}</p>
      </div>
      {count === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-secondary dark:bg-sidebar">{empty}</p>
      ) : (
        <ul className="space-y-3">{children}</ul>
      )}
    </section>
  );
}

function Item({ title, lines, actions }: { title: ReactNode; lines: ReactNode[]; actions: ReactNode }) {
  return (
    <li className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-surface p-4 dark:bg-sidebar">
      <div className="min-w-0 flex-1 basis-64">
        <h3 className="text-base font-semibold">{title}</h3>
        {lines.map((line, index) => (
          <p key={index} className="mt-0.5 text-[13px] break-words text-secondary">
            {line}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 max-md:w-full">{actions}</div>
    </li>
  );
}

export function ValidationsScreen() {
  const client = useQueryClient();
  const validations = useQuery(validationsQuery);
  const [decision, setDecision] = useState<Decision | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'À valider · Équipe Communeo';
  }, []);
  const data = validations.data;
  const close = (open: boolean) => !open && setDecision(null);

  const decide = async (action: () => Promise<unknown>, success: string, error: string) => {
    try {
      await action();
    } catch (caught) {
      throw new Error(`${error} : ${failure(caught)}`);
    }
    void refreshValidations(client);
    toast.success(success);
  };

  const button = (label: string, onClick: () => void, variant: 'primary' | 'secondary' = 'secondary') => (
    <Button type="button" variant={variant} size="sm" className="max-md:h-11 max-md:flex-1" onClick={onClick}>
      {label}
    </Button>
  );

  return (
    <div className="mx-auto max-w-[960px] space-y-8">
      <div>
        <h1 ref={heading} className="outline-none">
          À valider
        </h1>
        <p className="mt-1 text-secondary">Ce qui attend une décision de l'équipe. Un refus envoie son motif par e-mail.</p>
      </div>

      {validations.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          La file n'a pas pu être chargée.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void validations.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !data ? (
        <div aria-busy="true" className="h-48 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <>
          <Section
            id="inscriptions"
            title="Inscriptions à vérifier"
            count={data.signups.length}
            description="L'Annuaire ne connaît pas d'adresse pour ces mairies : la confirmation n'a pas pu leur être envoyée. Vérifiez auprès de la mairie que la demande vient bien d'elle."
            empty="Aucune inscription à vérifier."
          >
            {data.signups.map((signup) => (
              <Item
                key={signup.id}
                title={
                  <>
                    {signup.communeName} <span className="font-normal text-secondary">· INSEE {signup.insee}</span>
                  </>
                }
                lines={[`${signup.firstName} ${signup.lastName} · ${signup.email}`, `Demande du ${formatDay(new Date(signup.requestedAt))}`]}
                actions={
                  <>
                    {button('Valider…', () => setDecision({ kind: 'approve-signup', item: signup }), 'primary')}
                    {button('Refuser…', () => setDecision({ kind: 'reject-signup', item: signup }))}
                  </>
                }
              />
            ))}
          </Section>

          <Section
            id="passages-en-live"
            title="Passages en live demandés"
            count={data.liveRequests.length}
            description="La commune reste en essai tant que l'équipe n'a pas validé son passage en live."
            empty="Aucun passage en live demandé."
          >
            {data.liveRequests.map((live) => (
              <Item
                key={live.documentId}
                title={
                  <>
                    <Link to="/plateforme/communes/$documentId" params={{ documentId: live.documentId }} className="text-brand hover:underline">
                      {live.name}
                    </Link>
                    {live.insee && <span className="font-normal text-secondary"> · INSEE {live.insee}</span>}
                  </>
                }
                lines={[
                  live.quote ? (
                    <>
                      Devis {live.quote.number} : {formatEuros(live.quote.amountHT)} HT par an, tranche : {live.quote.tierLabel} ·{' '}
                      <a href={quotePdfUrl(live.quote.documentId)} target="_blank" rel="noreferrer" className="font-medium text-brand underline">
                        PDF<span className="sr-only"> du devis {live.quote.number} (nouvel onglet)</span>
                      </a>
                    </>
                  ) : (
                    'Sans devis'
                  ),
                  `Validé le ${formatDay(new Date(live.requestedAt))}${live.requestedBy ? ` par ${live.requestedBy}` : ''}`,
                  live.plan === 'expired'
                    ? `Essai terminé${live.trialExpiredAt ? ` le ${formatDay(new Date(live.trialExpiredAt))}` : ''} : site retiré, administration en lecture seule`
                    : `Essai jusqu'au ${live.trialEndsAt ? formatDay(new Date(live.trialEndsAt)) : '—'}`,
                ]}
                actions={
                  <>
                    {button('Passer en live…', () => setDecision({ kind: 'approve-live', item: live }), 'primary')}
                    {button('Refuser…', () => setDecision({ kind: 'reject-live', item: live }))}
                  </>
                }
              />
            ))}
          </Section>
        </>
      )}

      <ConfirmDialog
        open={decision?.kind === 'approve-signup'}
        onOpenChange={close}
        tone="info"
        icon={Building2}
        title={decision?.kind === 'approve-signup' ? `Créer le site de ${decision.item.communeName} ?` : ''}
        description={
          decision?.kind === 'approve-signup'
            ? `La commune est créée en essai de 30 jours. ${decision.item.firstName} ${decision.item.lastName} reçoit une invitation à ${decision.item.email} pour choisir son mot de passe.`
            : ''
        }
        confirmLabel="Créer et inviter"
        onConfirm={() =>
          decision?.kind === 'approve-signup'
            ? decide(() => approveSignup(decision.item.id), `${decision.item.communeName} est créée, l'invitation est envoyée.`, "La commune n'a pas été créée")
            : undefined
        }
      />
      <ConfirmDialog
        open={decision?.kind === 'approve-live'}
        onOpenChange={close}
        tone="info"
        icon={Rocket}
        title={decision?.kind === 'approve-live' ? `Passer ${decision.item.name} en live ?` : ''}
        description={
          decision?.kind === 'approve-live'
            ? decision.item.plan === 'expired'
              ? "L'essai prend fin : l'administration n'est plus en lecture seule, le site est remis en ligne et les administrateurs sont prévenus par e-mail."
              : "L'essai prend fin : le site est remis en ligne sans le bandeau « Site en préparation » et les administrateurs sont prévenus par e-mail."
            : ''
        }
        confirmLabel="Passer en live"
        onConfirm={() =>
          decision?.kind === 'approve-live'
            ? decide(() => approveLive(decision.item.documentId), `${decision.item.name} est en live.`, "La commune n'est pas passée en live")
            : undefined
        }
      />
      <ReasonDialog
        open={decision?.kind === 'reject-signup'}
        onOpenChange={close}
        title={decision?.kind === 'reject-signup' ? `Refuser l'inscription de ${decision.item.communeName} ?` : ''}
        description={decision?.kind === 'reject-signup' ? `${decision.item.firstName} ${decision.item.lastName} recevra votre motif à ${decision.item.email}. Aucune commune n'est créée.` : ''}
        confirmLabel="Refuser et envoyer le motif"
        onReject={(reason) =>
          decision?.kind === 'reject-signup'
            ? decide(() => rejectSignup(decision.item.id, reason), `L'inscription de ${decision.item.communeName} est refusée, le motif est envoyé.`, "Le refus n'a pas été enregistré")
            : Promise.resolve()
        }
      />
      <ReasonDialog
        open={decision?.kind === 'reject-live'}
        onOpenChange={close}
        title={decision?.kind === 'reject-live' ? `Refuser le passage en live de ${decision.item.name} ?` : ''}
        description={
          decision?.kind === 'reject-live'
            ? "Les administrateurs de la commune recevront votre motif par e-mail. La commune reste en essai et pourra refaire la demande."
            : ''
        }
        confirmLabel="Refuser et envoyer le motif"
        onReject={(reason) =>
          decision?.kind === 'reject-live'
            ? decide(() => rejectLive(decision.item.documentId, reason), `Le passage en live de ${decision.item.name} est refusé, le motif est envoyé.`, "Le refus n'a pas été enregistré")
            : Promise.resolve()
        }
      />
    </div>
  );
}

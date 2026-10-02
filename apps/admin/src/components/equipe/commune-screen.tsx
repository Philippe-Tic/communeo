/**
 * Fiche d'une commune (handoff 6.20) : « Entrer dans l'administration » est l'action principale
 * (bandeau d'impersonation) ; site, thème, mise en ligne, utilisateurs, contenus ; renvoyer
 * l'invitation d'un administrateur qui ne l'a pas acceptée ; suspendre la commune ; la supprimer tout de
 * suite (nom tapé pour confirmer), ou annuler la suppression qu'elle a demandée (#391).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { CalendarPlus, ChevronRight, ExternalLink, LogIn, PauseCircle, PlayCircle, Rocket, Trash2 } from 'lucide-react';
import { addCalendarDays, deletionConfirmed, deletionDate, formatEuros, trialDaysLeft } from '@communeo/core';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { controlClass, Field } from '@/components/form/field';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { NameConfirmation } from '@/components/ui/name-confirmation';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatCalendarDay, formatShortDay, invoicePdfUrl, stateBadge, stateOf as invoiceStateOf, teamBillingQuery } from '@/lib/billing';
import { communeQuery, deleteCommune, enterCommune, refreshCommunes, updateCommune, type CommuneDetail } from '@/lib/equipe';
import { focusHeadingIfRequested } from '@/lib/focus';
import { themeName } from '@/lib/session';
import { fullName, resendInvitation, roleLabel, stateOf } from '@/lib/users';
import { formatDay } from '@/lib/trial';
import { cn } from '@/lib/utils';
import { PublicationBadge, siteAddress } from './communes-screen';
import { PlanBadge } from './plan-badge';

const EXTENSIONS = [7, 15, 30] as const;

/** Offre de la commune : en live, essai en cours, essai terminé (#310) */
function planSummary(commune: CommuneDetail): { title: string; detail: string | null } {
  if (commune.plan === 'live') return { title: 'Live', detail: null };
  const requested = commune.liveRequestedAt ? `Passage en live demandé le ${formatDay(new Date(commune.liveRequestedAt))}` : null;
  if (commune.plan === 'expired') {
    const deletion = commune.trialExpiredAt ? `Données supprimées le ${formatDay(deletionDate(commune.trialExpiredAt))}` : null;
    return {
      title: commune.trialExpiredAt ? `Essai terminé le ${formatDay(new Date(commune.trialExpiredAt))}` : 'Essai terminé',
      detail: [requested, deletion].filter(Boolean).join(' · ') || null,
    };
  }
  if (!commune.trialEndsAt) return { title: 'Essai', detail: requested };
  const days = trialDaysLeft(commune.trialEndsAt);
  return {
    title: `Essai jusqu'au ${formatDay(new Date(commune.trialEndsAt))}`,
    detail: [`${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`, requested].filter(Boolean).join(' · '),
  };
}

const failure = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border border-border bg-surface p-4 dark:bg-sidebar">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold tracking-[0.06em] text-secondary uppercase">{title}</h2>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * Référencement : code de vérification Google Search Console de la commune. L'équipe vérifie le
 * domaine depuis son propre compte Search Console, sans que la commune touche à son DNS ; la balise
 * est posée sur le site à la prochaine mise en ligne.
 */
function SearchConsoleCard({ commune }: { commune: CommuneDetail }) {
  const client = useQueryClient();
  const [value, setValue] = useState(commune.googleSiteVerification ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const save = async () => {
    setPending(true);
    setError(null);
    try {
      await updateCommune(commune.documentId, { googleSiteVerification: value.trim() });
      void refreshCommunes(client);
      toast.success(value.trim() ? 'Code enregistré : il sera sur le site à la prochaine mise en ligne.' : 'Code retiré.');
    } catch (caught) {
      setError(failure(caught));
    } finally {
      setPending(false);
    }
  };
  return (
    <Card title="Référencement">
      <Field
        name="google-site-verification"
        label="Vérification Google Search Console"
        help="Le code de la méthode « Balise HTML », ou la balise entière. Vide : aucune balise."
        error={error ?? undefined}
      >
        {(props) => (
          <div className="flex flex-wrap gap-2">
            <input
              {...props}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError(null);
              }}
              spellCheck={false}
              className={cn(controlClass, 'h-10 min-w-0 flex-1 basis-64 font-mono text-[13px]')}
            />
            <Button type="button" variant="secondary" disabled={pending || value.trim() === (commune.googleSiteVerification ?? '')} onClick={() => void save()}>
              Enregistrer
            </Button>
          </div>
        )}
      </Field>
    </Card>
  );
}

/** Factures de la commune et renouvellement (#314) ; le suivi détaillé est dans l'écran Facturation */
function BillingCard({ commune }: { commune: CommuneDetail }) {
  const billing = useQuery(teamBillingQuery);
  const invoices = billing.data?.invoices.filter((invoice) => invoice.site?.documentId === commune.documentId) ?? [];
  const renewal = billing.data?.renewals.find((site) => site.documentId === commune.documentId);
  if (commune.plan !== 'live' && invoices.length === 0) return null;
  return (
    <Card
      title="Facturation"
      action={
        <Link to="/plateforme/facturation" className="text-[13px] font-medium text-brand hover:underline">
          Suivi de la facturation
        </Link>
      }
    >
      {!billing.data ? (
        <p className="text-secondary">{billing.isError ? "Les factures n'ont pas pu être chargées." : 'Chargement…'}</p>
      ) : invoices.length === 0 ? (
        <p className="text-secondary">Aucune facture : voyez « Communes en live sans facture » dans l'écran Facturation.</p>
      ) : (
        <ul className="divide-y divide-border">
          {invoices.map((invoice) => {
            const badge = stateBadge(invoiceStateOf(invoice, billing.data.today));
            return (
              <li key={invoice.documentId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
                <a href={invoicePdfUrl(invoice.documentId)} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
                  {invoice.number}
                  <span className="sr-only"> (PDF, nouvel onglet)</span>
                </a>
                <span className="text-secondary">
                  {formatShortDay(invoice.issuedAt)} · {formatEuros(invoice.kind === 'credit_note' ? -invoice.amountTTC : invoice.amountTTC)}
                </span>
                <span className="ml-auto">
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {renewal?.periodEnd && (
        <p className="mt-2 text-[13px] text-secondary">
          {renewal.enabled
            ? `Renouvellement le ${formatCalendarDay(addCalendarDays(renewal.periodEnd, 1))}`
            : `Résiliée : fin de l'abonnement le ${formatCalendarDay(renewal.periodEnd)}`}
        </p>
      )}
    </Card>
  );
}

function Detail({ commune }: { commune: CommuneDetail }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [suspending, setSuspending] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extension, setExtension] = useState<number>(15);
  const [deleting, setDeleting] = useState(false);
  const [cancellingDeletion, setCancellingDeletion] = useState(false);
  const [typed, setTyped] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = `${commune.name} · Équipe Communeo`;
  }, [commune.name]);

  const enter = async (to = '/') => {
    enterCommune(client, commune.documentId);
    await navigate({ to });
  };
  const pendingAdmins = commune.members.filter(
    (user) => user.municipality_role === 'admin' && stateOf(user) === 'invited',
  );

  const resend = async () => {
    try {
      await Promise.all(pendingAdmins.map((user) => resendInvitation(user.id)));
      toast.success(`Nouvelle invitation envoyée à ${pendingAdmins.map((user) => user.email).join(', ')}.`);
    } catch (error) {
      toast.error(`L'invitation n'a pas été renvoyée : ${failure(error)}`);
    }
  };

  const toggleSuspension = async () => {
    try {
      await updateCommune(commune.documentId, { suspended: !commune.suspended });
    } catch (error) {
      throw new Error(`La commune n'a pas été ${commune.suspended ? 'réactivée' : 'suspendue'} : ${failure(error)}`);
    }
    void refreshCommunes(client);
    toast.success(commune.suspended ? `${commune.name} est de nouveau active.` : `${commune.name} est suspendue.`);
  };

  const goLive = async () => {
    try {
      await updateCommune(commune.documentId, { plan: 'live' });
    } catch (error) {
      throw new Error(`La commune n'est pas passée en live : ${failure(error)}`);
    }
    void refreshCommunes(client);
    toast.success(`${commune.name} est en live.`);
  };

  const extendTrial = async () => {
    try {
      await updateCommune(commune.documentId, { extendTrialDays: extension });
    } catch (error) {
      throw new Error(`L'essai n'a pas été prolongé : ${failure(error)}`);
    }
    void refreshCommunes(client);
    toast.success(`Essai de ${commune.name} prolongé de ${extension} jours.`);
  };

  const remove = async () => {
    try {
      await deleteCommune(commune.documentId);
    } catch (error) {
      throw new Error(`La commune n'a pas été supprimée : ${failure(error)}`);
    }
    client.removeQueries({ queryKey: communeQuery(commune.documentId).queryKey });
    void refreshCommunes(client);
    toast.success(`${commune.name} est supprimée.`);
    await navigate({ to: '/plateforme' });
  };

  const cancelDeletion = async () => {
    try {
      await updateCommune(commune.documentId, { cancelDeletion: true });
    } catch (error) {
      throw new Error(`La suppression n'a pas été annulée : ${failure(error)}`);
    }
    void refreshCommunes(client);
    toast.success(`Suppression de ${commune.name} annulée : les administrateurs sont prévenus.`);
  };

  const plan = planSummary(commune);
  const deletionAt = commune.deletionScheduledAt ? new Date(commune.deletionScheduledAt) : null;

  return (
    <div className="mx-auto max-w-[960px] space-y-5">
      <nav aria-label="Fil d'Ariane" className="text-[13px]">
        <ol className="flex items-center gap-1.5 text-secondary">
          <li>
            <Link to="/plateforme" className="hover:underline">
              Communes
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="text-text">
            {commune.name}
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 ref={heading} className="flex flex-wrap items-center gap-3 outline-none">
            {commune.name}
            {commune.suspended && <StatusBadge tone="danger">Suspendue</StatusBadge>}
            {deletionAt && <StatusBadge tone="danger">Suppression demandée</StatusBadge>}
            <PlanBadge commune={commune} />
          </h1>
          <p className="mt-1 text-secondary">
            {commune.population != null && `${commune.population.toLocaleString('fr-FR')} habitants · `}créée le{' '}
            {new Intl.DateTimeFormat('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'Europe/Paris',
            }).format(new Date(commune.createdAt))}
          </p>
        </div>
        <Button type="button" className="max-md:h-11 max-md:w-full" onClick={() => void enter()}>
          <LogIn aria-hidden="true" />
          Entrer dans l'administration
        </Button>
      </div>

      {commune.suspended && (
        <p role="status" className="rounded-xl border border-danger bg-danger-alert-bg p-4">
          Commune suspendue : ses utilisateurs ne peuvent plus se connecter et rien n'est mis en ligne. Le site public
          reste en ligne tel quel.
        </p>
      )}

      {deletionAt && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-danger bg-danger-alert-bg p-4">
          <p className="min-w-0 flex-1 basis-72">
            La commune a demandé sa suppression : elle aura lieu le {formatDay(deletionAt)}. D'ici là, le site reste en ligne
            et l'administration fonctionne.
          </p>
          <Button type="button" variant="secondary" className="max-md:h-11 max-md:w-full" onClick={() => setCancellingDeletion(true)}>
            Annuler la suppression…
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Site">
          {commune.liveUrl && commune.publication.state !== 'new' ? (
            <a
              href={commune.customDomain ? `https://${commune.customDomain}` : commune.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold break-all text-brand hover:underline"
            >
              {siteAddress(commune)}
              <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          ) : (
            <p className="font-semibold">Pas encore en ligne</p>
          )}
          <p className="mt-1 text-[13px] text-secondary">
            {commune.publication.state === 'new'
              ? `Adresse prévue : ${siteAddress(commune)}`
              : commune.customDomain
                ? commune.domainStatus === 'verified'
                  ? `Domaine vérifié · HTTPS ${commune.sslEnabled ? 'actif' : 'en cours'}`
                  : 'Domaine en attente de vérification'
                : 'Adresse Communeo'}
          </p>
        </Card>
        <Card title="Thème">
          <p className="font-semibold">{themeName(commune.theme)}</p>
        </Card>
        <Card title="Offre">
          <p className="font-semibold">{plan.title}</p>
          {plan.detail && <p className="mt-1 text-[13px] text-secondary">{plan.detail}</p>}
        </Card>
        <Card title="Mise en ligne">
          <PublicationBadge commune={commune} />
          <p className="mt-1 text-[13px] text-secondary">
            {commune.deployments.succeeded} réussie{commune.deployments.succeeded > 1 ? 's' : ''},{' '}
            {commune.deployments.failed} échec{commune.deployments.failed > 1 ? 's' : ''}
          </p>
        </Card>
      </div>

      <Card
        title="Utilisateurs"
        action={
          <Button type="button" variant="tertiary" size="sm" onClick={() => void enter('/utilisateurs')}>
            Gérer
          </Button>
        }
      >
        <p className="font-semibold">
          {[
            (commune.users.active > 0 || commune.users.invited === 0) &&
              `${commune.users.active} compte${commune.users.active > 1 ? 's' : ''} actif${commune.users.active > 1 ? 's' : ''}`,
            commune.users.invited > 0 &&
              `${commune.users.invited} invitation${commune.users.invited > 1 ? 's' : ''} en attente`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <ul className="mt-2 divide-y divide-border">
          {commune.members.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2 text-[13px]">
              <span className="font-semibold">{fullName(user)}</span>
              <span className="text-secondary">· {user.email}</span>
              <span className="ml-auto flex items-center gap-2">
                {roleLabel(user.municipality_role)}
                {stateOf(user) === 'invited' && <StatusBadge tone="warning">Invitation en attente</StatusBadge>}
                {stateOf(user) === 'disabled' && <StatusBadge tone="neutral">Désactivé</StatusBadge>}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <BillingCard commune={commune} />

      {commune.plan === 'live' && <SearchConsoleCard commune={commune} />}

      <div className="grid grid-cols-3 gap-4">
        {(
          [
            ['pages', commune.counts.pages],
            ['actualités', commune.counts.articles],
            ['documents', commune.counts.documents],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4 text-center dark:bg-sidebar">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-[13px] text-secondary">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {pendingAdmins.length > 0 && (
          <Button type="button" variant="secondary" className="max-md:h-11" onClick={() => void resend()}>
            Renvoyer une invitation admin
          </Button>
        )}
        {commune.plan !== 'live' && (
          <>
            <Button type="button" className="max-md:h-11" onClick={() => setGoingLive(true)}>
              Passer en live…
            </Button>
            <Button type="button" variant="secondary" className="max-md:h-11" onClick={() => setExtending(true)}>
              Prolonger l'essai…
            </Button>
          </>
        )}
        <Button
          type="button"
          variant={commune.suspended ? 'secondary' : 'destructive-outline'}
          className="max-md:h-11"
          onClick={() => setSuspending(true)}
        >
          {commune.suspended ? 'Lever la suspension…' : 'Suspendre la commune…'}
        </Button>
        <Button type="button" variant="destructive-outline" className="max-md:h-11" onClick={() => setDeleting(true)}>
          <Trash2 aria-hidden="true" />
          {deletionAt ? 'Supprimer maintenant…' : 'Supprimer la commune…'}
        </Button>
      </div>

      <ConfirmDialog
        open={deleting}
        onOpenChange={(value) => {
          setDeleting(value);
          if (!value) setTyped('');
        }}
        title={`Supprimer ${commune.name} ?`}
        description="Tout de suite et définitivement : le site est retiré d'internet, les contenus, les fichiers et les comptes de la commune sont supprimés. Les factures et les devis sont conservés."
        confirmLabel="Supprimer la commune"
        confirmDisabled={!deletionConfirmed(typed, commune.name)}
        onConfirm={remove}
      >
        <NameConfirmation name={commune.name} value={typed} onChange={setTyped} />
      </ConfirmDialog>

      <ConfirmDialog
        open={cancellingDeletion}
        onOpenChange={setCancellingDeletion}
        tone="info"
        icon={Trash2}
        title={`Annuler la suppression de ${commune.name} ?`}
        description="La commune est conservée ; ses administrateurs sont prévenus par e-mail."
        confirmLabel="Annuler la suppression"
        cancelLabel="Fermer"
        onConfirm={cancelDeletion}
      />

      <ConfirmDialog
        open={suspending}
        onOpenChange={setSuspending}
        tone={commune.suspended ? 'warning' : 'danger'}
        icon={commune.suspended ? PlayCircle : PauseCircle}
        title={commune.suspended ? `Lever la suspension de ${commune.name} ?` : `Suspendre ${commune.name} ?`}
        description={
          commune.suspended
            ? 'Ses utilisateurs pourront de nouveau se connecter et mettre le site en ligne.'
            : "Ses utilisateurs sont déconnectés et ne peuvent plus se connecter ; rien n'est plus mis en ligne. Le site public reste en ligne tel quel. Rien n'est supprimé."
        }
        confirmLabel={commune.suspended ? 'Lever la suspension' : 'Suspendre la commune'}
        onConfirm={toggleSuspension}
      />

      <ConfirmDialog
        open={goingLive}
        onOpenChange={setGoingLive}
        tone="info"
        icon={Rocket}
        title={`Passer ${commune.name} en live ?`}
        description={
          commune.plan === 'expired'
            ? "L'essai prend fin : l'administration de la commune n'est plus en lecture seule et le site est remis en ligne aussitôt."
            : "L'essai prend fin : le site reste en ligne sans limite de durée."
        }
        confirmLabel="Passer en live"
        onConfirm={goLive}
      />

      <ConfirmDialog
        open={extending}
        onOpenChange={setExtending}
        tone="info"
        icon={CalendarPlus}
        title={`Prolonger l'essai de ${commune.name} ?`}
        description={
          commune.plan === 'expired'
            ? "L'essai reprend à partir d'aujourd'hui : l'administration n'est plus en lecture seule et le site est remis en ligne."
            : "La prolongation s'ajoute à la fin d'essai prévue."
        }
        confirmLabel="Prolonger l'essai"
        onConfirm={extendTrial}
      >
        <fieldset>
          <legend className="text-sm font-semibold">Durée de la prolongation</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {EXTENSIONS.map((days) => (
              <label key={days} className="flex min-h-11 items-center gap-2 md:min-h-0">
                <input
                  type="radio"
                  name="prolongation"
                  value={days}
                  checked={extension === days}
                  onChange={() => setExtension(days)}
                  className="size-4 accent-brand"
                />
                {days} jours
              </label>
            ))}
          </div>
        </fieldset>
      </ConfirmDialog>
    </div>
  );
}

export function CommuneScreen({ documentId }: { documentId: string }) {
  const commune = useQuery(communeQuery(documentId));
  if (commune.isError) {
    return (
      <div role="alert" className="mx-auto max-w-[960px] rounded-xl border border-danger bg-danger-alert-bg p-5">
        <h1 className="text-xl">Commune</h1>
        <p className="mt-2">
          {commune.error instanceof ApiError && commune.error.status === 404
            ? 'Cette commune n’existe pas ou a été supprimée.'
            : "La fiche n'a pas pu être chargée."}
        </p>
        <Link to="/plateforme" className="mt-3 inline-block font-medium text-brand underline">
          Retour aux communes
        </Link>
      </div>
    );
  }
  if (!commune.data)
    return <div aria-busy="true" className="mx-auto h-64 max-w-[960px] animate-pulse rounded-xl bg-neutral-bg" />;
  return <Detail commune={commune.data} />;
}

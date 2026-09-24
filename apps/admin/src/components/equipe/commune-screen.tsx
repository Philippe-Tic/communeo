/**
 * Fiche d'une commune (handoff 6.20) : « Entrer dans l'administration » est l'action principale
 * (bandeau d'impersonation) ; site, thème, mise en ligne, utilisateurs, contenus ; renvoyer
 * l'invitation d'un administrateur qui ne l'a pas acceptée ; suspendre la commune.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRight, ExternalLink, LogIn } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatListDate } from '@/lib/dates';
import { communeQuery, enterCommune, refreshCommunes, updateCommune, type CommuneDetail } from '@/lib/equipe';
import { focusHeadingIfRequested } from '@/lib/focus';
import { themeName } from '@/lib/session';
import { fullName, resendInvitation, roleLabel, stateOf } from '@/lib/users';
import { PublicationBadge, siteAddress } from './communes-screen';

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

function Detail({ commune }: { commune: CommuneDetail }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [suspending, setSuspending] = useState(false);
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
          </h1>
          <p className="mt-1 text-secondary">
            {commune.population != null && `${commune.population.toLocaleString('fr-FR')} habitants · `}créée{' '}
            {formatListDate(new Date(commune.createdAt)).toLowerCase()}
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Site">
          {commune.liveUrl ? (
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
            {commune.customDomain
              ? commune.domainStatus === 'verified'
                ? `Domaine vérifié · HTTPS ${commune.sslEnabled ? 'actif' : 'en cours'}`
                : 'Domaine en attente de vérification'
              : 'Adresse Communeo'}
          </p>
        </Card>
        <Card title="Thème">
          <p className="font-semibold">{commune.theme ? themeName(commune.theme) : '—'}</p>
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
          {commune.users.active} compte{commune.users.active > 1 ? 's' : ''}
          {commune.users.invited > 0 && ` + ${commune.users.invited} invitation${commune.users.invited > 1 ? 's' : ''}`}
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
        <Button
          type="button"
          variant={commune.suspended ? 'secondary' : 'destructive-outline'}
          className="max-md:h-11"
          onClick={() => setSuspending(true)}
        >
          {commune.suspended ? 'Lever la suspension…' : 'Suspendre la commune…'}
        </Button>
      </div>

      <ConfirmDialog
        open={suspending}
        onOpenChange={setSuspending}
        tone={commune.suspended ? 'warning' : 'danger'}
        title={commune.suspended ? `Lever la suspension de ${commune.name} ?` : `Suspendre ${commune.name} ?`}
        description={
          commune.suspended
            ? 'Ses utilisateurs pourront de nouveau se connecter et mettre le site en ligne.'
            : "Ses utilisateurs sont déconnectés et ne peuvent plus se connecter ; rien n'est plus mis en ligne. Le site public reste en ligne tel quel. Rien n'est supprimé."
        }
        confirmLabel={commune.suspended ? 'Lever la suspension' : 'Suspendre la commune'}
        onConfirm={toggleSuspension}
      />
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

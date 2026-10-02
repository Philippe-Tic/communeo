/**
 * Réponse de la mairie à une inscription (#337), depuis le lien reçu à son adresse officielle : la
 * personne qui ouvre la boîte de la mairie approuve la création du site (il pourra être mis en
 * ligne) ou la refuse (le site et ses contenus sont supprimés). Aucun mot de passe ici : le compte
 * appartient à la personne qui s'est inscrite. Rien n'est fait à l'ouverture du lien, seulement au
 * clic (les antivirus de messagerie ouvrent les liens tout seuls).
 */
import { useQuery } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ofCommune } from '@communeo/core';
import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ApiError } from '@/lib/api';
import { approveAsTownHall, declineAsTownHall, townHallApprovalQuery } from '@/lib/signup';

const TITLE = 'Création du site de la commune';

function Done({ approved, commune }: { approved: boolean; commune: string }) {
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => status.current?.focus(), []);
  const Icon = approved ? CircleCheck : CircleX;
  return (
    <AuthLayout title={approved ? 'Demande approuvée' : 'Demande refusée'} documentTitle={TITLE}>
      <div ref={status} tabIndex={-1} role="status" className="flex gap-2.5 outline-none">
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
        <p>
          {approved
            ? `Merci. Le site ${ofCommune(commune)} continue son essai. La personne qui l’a créé en est prévenue par e-mail.`
            : `Le site ${ofCommune(commune)} a été retiré et ses contenus supprimés. La personne qui l’avait créé en est prévenue par e-mail.`}
        </p>
      </div>
      <p className="mt-4 text-[13px] text-secondary">Vous pouvez fermer cette page.</p>
    </AuthLayout>
  );
}

export function SignupApproveScreen({ token }: { token: string | undefined }) {
  const query = useQuery({ ...townHallApprovalQuery(token ?? ''), enabled: Boolean(token) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [done, setDone] = useState<'approved' | 'declined' | null>(null);

  if (done && query.data) return <Done approved={done === 'approved'} commune={query.data.commune} />;

  if (!token || query.isError) {
    const expired = query.error instanceof ApiError && query.error.status === 410;
    return (
      <AuthLayout title={expired ? 'Ce lien a expiré' : 'Ce lien ne fonctionne pas'} documentTitle={TITLE}>
        <p className="text-secondary">
          {expired
            ? 'Les liens sont valables 7 jours. La personne qui a créé le site peut vous renvoyer la demande depuis son administration.'
            : 'Le lien est incomplet, a été remplacé par un plus récent, ou la demande a déjà reçu une réponse.'}
        </p>
      </AuthLayout>
    );
  }
  if (query.isPending) {
    return (
      <AuthLayout title={TITLE} documentTitle={TITLE}>
        <p role="status">Vérification du lien…</p>
      </AuthLayout>
    );
  }

  const request = query.data;
  const failure = (caught: unknown) =>
    caught instanceof ApiError && [400, 410].includes(caught.status) ? caught.message : 'La réponse n’a pas été enregistrée. Réessayez dans un instant.';

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      await approveAsTownHall(token);
      setDone('approved');
    } catch (caught) {
      setBusy(false);
      setError(failure(caught));
    }
  };

  const decline = async () => {
    try {
      await declineAsTownHall(token);
    } catch (caught) {
      throw new Error(failure(caught));
    }
    setDone('declined');
  };

  return (
    <AuthLayout title={`Site internet ${ofCommune(request.commune)}`} documentTitle={TITLE}>
      <p>
        <strong>
          {request.firstName} {request.lastName}
        </strong>{' '}
        ({request.email}) a créé le site internet de la commune sur Communeo et prépare ses contenus.
      </p>
      <p className="mt-3 text-secondary">
        Ce message a été envoyé à l’adresse officielle de la mairie pour vérifier que la demande vient bien de la commune. En attendant votre réponse, son site
        d’essai peut être en ligne sur son adresse Communeo, avec un bandeau « Site en préparation ».
      </p>
      {error && (
        <p role="alert" className="mt-4 flex gap-2 text-[13px] text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-3">
        <Button size="lg" className="w-full" disabled={busy} onClick={() => void approve()}>
          {busy ? 'Enregistrement…' : 'Approuver la demande'}
        </Button>
        <Button size="lg" variant="secondary" className="w-full" disabled={busy} onClick={() => setDeclining(true)}>
          Refuser la demande
        </Button>
      </div>
      <p className="mt-4 text-[13px] text-secondary">Refusez-la si la mairie n’est pas à l’origine de cette demande : le site sera retiré et ses contenus supprimés.</p>
      <ConfirmDialog
        open={declining}
        onOpenChange={setDeclining}
        title="Refuser la demande ?"
        description={`Le site ${ofCommune(request.commune)} créé par ${request.firstName} ${request.lastName}, ses contenus et son compte seront supprimés, et le site retiré d’internet. ${request.firstName} en sera prévenu par e-mail.`}
        confirmLabel="Refuser et supprimer"
        onConfirm={decline}
      />
    </AuthLayout>
  );
}

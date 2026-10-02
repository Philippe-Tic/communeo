/**
 * Bandeau de la suppression demandée (#391), au-dessus de l'administration, pour tous les utilisateurs
 * de la commune : date prévue ; un administrateur (ou l'équipe) l'annule d'ici là.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { cancelCommuneDeletion, deletionScheduledAt, setDeletionInSession } from '@/lib/commune-deletion';
import type { SessionUser } from '@/lib/session';
import { formatDay } from '@/lib/trial';

export function DeletionBanner({ user }: { user: SessionUser }) {
  const client = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const cancel = useMutation({
    mutationFn: cancelCommuneDeletion,
    onSuccess: (state) => {
      setDeletionInSession(client, state);
      toast.success('Suppression annulée : la commune est conservée.');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'La suppression n’a pas pu être annulée.'),
  });
  const at = deletionScheduledAt(user.site);
  if (!at) return null;
  const admin = user.municipality_role === 'admin' || user.municipality_role === 'super_admin';

  return (
    <div role="region" aria-label="Suppression de la commune" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-danger/30 bg-danger-bg px-4 py-2.5 text-sm md:px-6">
      <Trash2 aria-hidden="true" className="size-5 shrink-0 text-danger" />
      <p className="min-w-0 flex-1 basis-60">
        <strong className="font-semibold">Suppression de la commune prévue le {formatDay(at)}.</strong> Le site sera retiré
        d'internet et tous les contenus, fichiers et comptes supprimés.{' '}
        {admin ? 'Vous pouvez annuler d’ici là.' : 'Un administrateur de la commune peut l’annuler d’ici là.'}
        {admin && pathname !== '/mon-site/suppression' && (
          <>
            {' '}
            <Link to="/mon-site/suppression" className="font-medium underline">
              En savoir plus
            </Link>
          </>
        )}
      </p>
      {admin && (
        <Button variant="secondary" size="sm" className="max-md:h-11" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          {cancel.isPending ? 'Annulation…' : 'Annuler la suppression'}
        </Button>
      )}
    </div>
  );
}

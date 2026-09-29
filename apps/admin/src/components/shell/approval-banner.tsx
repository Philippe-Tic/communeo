/**
 * Bandeau de l'inscription en attente (#337), au-dessus de l'administration : la commune prépare son
 * site, mais rien n'est mis en ligne tant que la mairie (depuis son adresse officielle) ou l'équipe
 * Communeo n'a pas approuvé. Un administrateur peut renvoyer l'e-mail à la mairie.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import type { SessionUser } from '@/lib/session';
import { approvalStateQuery, awaitingApproval, resendApproval } from '@/lib/signup';
import { formatDay } from '@/lib/trial';

export function ApprovalBanner({ user }: { user: SessionUser }) {
  const approval = awaitingApproval(user.site);
  const client = useQueryClient();
  const state = useQuery({ ...approvalStateQuery, enabled: approval === 'townhall' });
  const resend = useMutation({
    mutationFn: resendApproval,
    onSuccess: (sent) => {
      client.setQueryData(approvalStateQuery.queryKey, (current) => (current ? { ...current, sentAt: sent.sentAt } : current));
      toast.success(`Demande renvoyée à ${sent.to}.`);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'La demande n’a pas pu être renvoyée.'),
  });
  if (!approval) return null;

  const admin = user.municipality_role === 'admin' || user.municipality_role === 'super_admin';
  const sent = state.data?.to ? ` à ${state.data.to}${state.data.sentAt ? ` le ${formatDay(new Date(state.data.sentAt))}` : ''}` : '';

  return (
    <div role="region" aria-label="Inscription en attente" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-info/20 bg-info-bg px-4 py-2.5 text-sm md:px-6">
      <Hourglass aria-hidden="true" className="size-5 shrink-0 text-info" />
      <p className="min-w-0 flex-1 basis-60">
        <strong className="font-semibold">{approval === 'townhall' ? 'En attente de l’approbation de la mairie.' : 'Demande en cours de vérification.'}</strong>{' '}
        {approval === 'townhall'
          ? `Le site sera mis en ligne dès qu’elle aura répondu à la demande envoyée${sent}.`
          : 'Le site sera mis en ligne dès que l’équipe Communeo l’aura vérifiée.'}
      </p>
      {approval === 'townhall' && admin && state.data?.to && (
        <Button variant="secondary" size="sm" className="max-md:h-11" disabled={resend.isPending} onClick={() => resend.mutate()}>
          {resend.isPending ? 'Envoi…' : 'Renvoyer la demande'}
        </Button>
      )}
    </div>
  );
}

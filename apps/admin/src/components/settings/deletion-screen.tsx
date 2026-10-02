/**
 * Supprimer la commune (#391, administrateurs) : la demande, confirmée en tapant le nom de la commune,
 * prend effet 7 jours plus tard ; d'ici là rien ne change et elle s'annule ici ou depuis le bandeau.
 */
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { COMMUNE_DELETION_DAYS, deletionConfirmed } from '@communeo/core';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { NameConfirmation } from '@/components/ui/name-confirmation';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { cancelCommuneDeletion, deletionScheduledAt, requestCommuneDeletion, setDeletionInSession } from '@/lib/commune-deletion';
import { sessionQuery } from '@/lib/session';
import { formatDay } from '@/lib/trial';

const failure = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

export function DeletionScreen() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const client = useQueryClient();
  const site = user.site!;
  const at = deletionScheduledAt(site);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const cancel = useMutation({
    mutationFn: cancelCommuneDeletion,
    onSuccess: (state) => {
      setDeletionInSession(client, state);
      toast.success('Suppression annulée : la commune est conservée.');
    },
    onError: (error) => toast.error(`La suppression n’a pas été annulée : ${failure(error)}`),
  });

  const request = async () => {
    try {
      setDeletionInSession(client, await requestCommuneDeletion(typed));
    } catch (error) {
      throw new Error(`La suppression n’a pas été demandée : ${failure(error)}`);
    }
    toast.success('Suppression demandée. Les administrateurs de la commune ont reçu un e-mail.');
  };

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader
        title="Supprimer la commune"
        description={`Retire le site de ${site.name} d'internet et supprime définitivement ses contenus, ses fichiers et ses comptes.`}
      />

      <section aria-labelledby="suppression-titre" className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
        <h2 id="suppression-titre" className="text-base font-semibold">
          {at ? `Suppression prévue le ${formatDay(at)}` : 'Ce qui se passe'}
        </h2>
        {at ? (
          <>
            <p className="mt-2">
              D'ici là, rien ne change : le site reste en ligne et l'administration fonctionne. Le {formatDay(at)}, le site
              sera retiré et tout sera supprimé. Les administrateurs recevront un rappel la veille.
            </p>
            <Button type="button" className="mt-4 max-md:h-11 max-md:w-full" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? 'Annulation…' : 'Annuler la suppression'}
            </Button>
          </>
        ) : (
          <>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>La suppression a lieu {COMMUNE_DELETION_DAYS} jours après la demande ; d'ici là, vous pouvez l'annuler.</li>
              <li>Le site est alors retiré d'internet, et les pages, actualités, documents, fichiers et comptes de la commune sont supprimés.</li>
              <li>Les factures et les devis sont conservés : la loi l'exige.</li>
              <li>Les administrateurs de la commune et l'équipe Communeo sont prévenus par e-mail.</li>
            </ul>
            <Button type="button" variant="destructive-outline" className="mt-4 max-md:h-11 max-md:w-full" onClick={() => setOpen(true)}>
              <Trash2 aria-hidden="true" />
              Demander la suppression…
            </Button>
          </>
        )}
      </section>

      <ConfirmDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setTyped('');
        }}
        title={`Supprimer ${site.name} ?`}
        description={`Dans ${COMMUNE_DELETION_DAYS} jours, le site sera retiré d'internet et tous ses contenus, fichiers et comptes définitivement supprimés. Vous pourrez annuler d'ici là.`}
        confirmLabel="Demander la suppression"
        confirmDisabled={!deletionConfirmed(typed, site.name)}
        onConfirm={request}
      >
        <NameConfirmation name={site.name} value={typed} onChange={setTyped} />
      </ConfirmDialog>
    </div>
  );
}

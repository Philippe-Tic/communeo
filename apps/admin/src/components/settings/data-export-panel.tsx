/**
 * État et actions de l'export des données (#343) : préparer, suivre la préparation, télécharger.
 * Partagé par l'écran « Exporter les données » (commune) et la fiche de la commune (équipe, `site`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, LoaderCircle } from 'lucide-react';
import { dataExportInProgress } from '@communeo/core';
import { Button, buttonVariants } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { dataExportDownloadUrl, dataExportQuery, formatBytes, requestDataExport } from '@/lib/data-export';
import { formatDay } from '@/lib/trial';
import { cn } from '@/lib/utils';

const failure = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

export function DataExportPanel({ site }: { site?: string }) {
  const client = useQueryClient();
  const query = useQuery(dataExportQuery(site));
  const state = query.data;
  const request = useMutation({
    mutationFn: () => requestDataExport(site),
    onSuccess: (next) => {
      client.setQueryData(dataExportQuery(site).queryKey, next);
      toast.success(
        "Préparation de l'export lancée. Un e-mail prévient les administrateurs quand l'archive est prête.",
      );
    },
    onError: (error) => toast.error(`L'export n'a pas été lancé : ${failure(error)}`),
  });

  if (query.isError) {
    return (
      <p role="alert" className="text-danger">
        L'état de l'export n'a pas pu être chargé : {failure(query.error)}
      </p>
    );
  }
  if (!state) return <p className="text-secondary">Chargement…</p>;

  const preparing = dataExportInProgress(state.status);
  return (
    <div className="space-y-3">
      <div role="status" aria-live="polite">
        {preparing ? (
          <p className="flex items-start gap-2">
            <LoaderCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 motion-safe:animate-spin" />
            <span>
              Préparation en cours, demandée par {state.requestedBy}. Cela peut prendre quelques minutes : vous pouvez
              quitter cet écran, un e-mail prévient les administrateurs quand l'archive est prête.
            </span>
          </p>
        ) : state.status === 'ready' && state.finishedAt && state.expiresAt ? (
          <p>
            Archive prête{state.size != null ? ` (${formatBytes(state.size)})` : ''}, préparée le{' '}
            {formatDay(new Date(state.finishedAt))} à la demande de {state.requestedBy}. Elle reste téléchargeable
            jusqu'au {formatDay(new Date(state.expiresAt))}.
          </p>
        ) : state.status === 'failed' ? (
          <p className="text-danger">{state.error ?? "L'export n'a pas pu être préparé."}</p>
        ) : (
          <p className="text-secondary">Aucun export en cours.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {state.status === 'ready' && (
          <a href={dataExportDownloadUrl(site)} download className={cn(buttonVariants(), 'max-md:h-11 max-md:w-full')}>
            <Download aria-hidden="true" />
            Télécharger l'archive
          </a>
        )}
        {!preparing && (
          <Button
            type="button"
            variant={state.status === 'ready' ? 'secondary' : 'primary'}
            className="max-md:h-11 max-md:w-full"
            disabled={request.isPending}
            onClick={() => request.mutate()}
          >
            {request.isPending
              ? 'Lancement…'
              : state.status === 'ready'
                ? 'Préparer un nouvel export'
                : "Préparer l'export"}
          </Button>
        )}
      </div>
    </div>
  );
}

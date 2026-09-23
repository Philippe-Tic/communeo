/**
 * Éditeur d'une page : /pages/nouvelle (création au premier enregistrement) ou /pages/<documentId>.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { PageEditor } from '@/components/editor/page-editor';
import { pageQuery } from '@/lib/content-api';

export const Route = createFileRoute('/_app/pages_/$documentId')({ component: PageEditorRoute });

function PageEditorRoute() {
  const { documentId } = Route.useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  // Page créée ici : l'adresse change, l'éditeur reste le même (pas de rechargement pendant la saisie)
  const [createdHere, setCreatedHere] = useState<string | null>(null);
  const isNew = documentId === 'nouvelle' && !createdHere;
  const query = useQuery({ ...pageQuery(documentId), enabled: documentId !== 'nouvelle' && !createdHere });

  if (!isNew && !createdHere && query.isPending) {
    return (
      <div aria-busy="true" className="space-y-4">
        <span className="sr-only">Chargement de la page</span>
        <div className="h-10 w-1/2 animate-pulse rounded-lg bg-border-row" />
        <div className="h-40 animate-pulse rounded-xl bg-border-row" />
      </div>
    );
  }
  if (!isNew && !createdHere && query.isError) {
    return (
      <div className="rounded-xl border border-danger bg-danger-alert-bg p-6">
        <h1 className="text-xl">Page introuvable</h1>
        <p className="mt-2 text-secondary">Elle a peut-être été supprimée. Revenez à la liste des pages.</p>
      </div>
    );
  }

  return (
    <PageEditor
      documentId={documentId === 'nouvelle' ? createdHere : documentId}
      initial={documentId === 'nouvelle' ? undefined : (query.data ?? client.getQueryData(pageQuery(documentId).queryKey))}
      onCreated={(page) => {
        setCreatedHere(page.documentId);
        void navigate({ to: '/pages/$documentId', params: { documentId: page.documentId }, replace: true });
      }}
    />
  );
}

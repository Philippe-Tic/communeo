/**
 * Route d'édition d'un contenu : `<rubrique>/nouvelle` (création au premier enregistrement) ou
 * `<rubrique>/<documentId>`. Chargement, contenu introuvable, puis l'éditeur du type.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import type { Block } from '@/components/blocks';
import type { BaseDocument, Draft } from '@/lib/content-api';
import { ContentEditor, type EditorConfig } from './content-editor';

export function EditorRoute<D extends BaseDocument, V extends FieldValues & { title: string; slug: string; blocks: Block[] }>({ config, documentId }: { config: EditorConfig<D, V>; documentId: string }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  // Contenu créé ici : l'adresse change, l'éditeur reste le même (pas de rechargement pendant la saisie)
  const [createdHere, setCreatedHere] = useState<string | null>(null);
  const isNew = documentId === 'nouvelle';
  const query = useQuery({ ...config.api.query(documentId), enabled: !isNew && !createdHere });
  const { noun } = config;

  if (!isNew && !createdHere && query.isPending) {
    return (
      <div aria-busy="true" className="space-y-4">
        <span className="sr-only">Chargement {noun.feminine ? 'de la' : 'du'} {noun.one}</span>
        <div className="h-10 w-1/2 animate-pulse rounded-lg bg-border-row" />
        <div className="h-40 animate-pulse rounded-xl bg-border-row" />
      </div>
    );
  }
  if (!isNew && !createdHere && query.isError) {
    return (
      <div className="rounded-xl border border-danger bg-danger-alert-bg p-6">
        <h1 className="text-xl">
          {noun.one.charAt(0).toUpperCase() + noun.one.slice(1)} introuvable
        </h1>
        <p className="mt-2 text-secondary">
          {noun.feminine ? 'Elle a' : 'Il a'} peut-être été {noun.feminine ? 'supprimée' : 'supprimé'}.{' '}
          <Link to={config.section.to} className="font-semibold text-brand underline">
            Revenir à la liste
          </Link>
        </p>
      </div>
    );
  }

  return (
    <ContentEditor<D, V>
      config={config}
      documentId={isNew ? createdHere : documentId}
      initial={isNew ? undefined : ((query.data ?? client.getQueryData(config.api.query(documentId).queryKey)) as Draft<D> | undefined)}
      onCreated={(doc) => {
        setCreatedHere(doc.documentId);
        void navigate({ to: `${config.section.to}/$documentId` as never, params: { documentId: doc.documentId } as never, replace: true });
      }}
    />
  );
}

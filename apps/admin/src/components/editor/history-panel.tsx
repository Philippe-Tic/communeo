/**
 * Historique d'un contenu (handoff 6.3, #183) : panneau latéral ouvert depuis le menu ⋯ de
 * l'éditeur. Brouillon en cours, version en ligne, versions antérieures (et brouillons gardés
 * avant une restauration), création. « Voir » montre une version, « Comparer au brouillon » ses
 * différences bloc par bloc, « Restaurer… » crée un nouveau brouillon à partir d'elle : la version
 * en ligne ne change pas tant qu'on ne publie pas.
 */
import { useQuery } from '@tanstack/react-query';
import { Dialog } from 'radix-ui';
import { History, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { blockLabel, diffBlocks, type BlockChange } from '@communeo/core';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import { StatusBadge, type Tone } from '@/components/ui/status-badge';
import type { ContentApi } from '@/lib/content-list';
import { formatListDate, relativeTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { blockExcerpt, versionDateText, versionQuery, versionsQuery, type VersionSummary } from '@/lib/versions';

type Block = { __component: string } & Record<string, unknown>;

export interface HistoryDraft {
  title: string;
  blocks: Block[];
  published: boolean;
  modified: boolean;
  updatedAt: string | null;
}

const when = (value: string) => {
  const date = new Date(value);
  return Date.now() - date.getTime() < 12 * 3600_000 ? relativeTime(date) : formatListDate(date).toLowerCase();
};
const blocksText = (count: number | null) => (count == null ? null : `${count} bloc${count > 1 ? 's' : ''}`);

function VersionDialog({
  type,
  documentId,
  version,
  draft,
  mode,
  onClose,
}: {
  type: ContentApi;
  documentId: string;
  version: VersionSummary;
  draft: HistoryDraft;
  mode: 'view' | 'compare';
  onClose: () => void;
}) {
  const returnFocus = useReturnFocus();
  const detail = useQuery(versionQuery(type, documentId, version.id));
  const snapshot = detail.data?.snapshot;
  const blocks = (snapshot?.blocks as Block[] | undefined) ?? [];
  const changes: BlockChange[] = mode === 'compare' ? diffBlocks(blocks, draft.blocks) : [];
  const label: Record<BlockChange['status'], { text: string; tone: Tone }> = {
    same: { text: 'Identique', tone: 'neutral' },
    added: { text: 'Ajouté dans le brouillon', tone: 'success' },
    removed: { text: 'Retiré dans le brouillon', tone: 'danger' },
    changed: { text: 'Modifié dans le brouillon', tone: 'warning' },
  };
  const titleChanged = mode === 'compare' && snapshot && (snapshot.title ?? '') !== draft.title;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-overlay" />
        <Dialog.Content
          {...returnFocus}
          className={cn(dialogContentClass, 'z-[61] max-h-[calc(100dvh-32px)] max-w-[640px] overflow-y-auto')}
        >
          <Dialog.Title className="text-[17px] font-semibold">
            {mode === 'compare'
              ? 'Version en ligne et brouillon'
              : `Version ${versionDateText(formatListDate(new Date(version.at)))}`}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-secondary">
            {mode === 'compare'
              ? 'Ce qui change dans le brouillon par rapport à la version en ligne, bloc par bloc.'
              : [version.authorName, version.summary].filter(Boolean).join(' · ')}
          </Dialog.Description>
          {!snapshot ? (
            <div aria-busy="true" className="mt-4 h-32 animate-pulse rounded-lg bg-neutral-bg" />
          ) : (
            <div className="mt-4 space-y-3">
              {mode === 'view' ? (
                <>
                  <p className="text-[15px] font-semibold">{String(snapshot.title ?? '')}</p>
                  {blocks.length === 0 ? (
                    <p className="text-secondary">Aucun bloc.</p>
                  ) : (
                    <ol className="space-y-2">
                      {blocks.map((block, index) => (
                        <li key={index} className="rounded-lg border border-border px-3 py-2 text-[13px]">
                          <span className="font-semibold">{blockLabel(block.__component)}</span>
                          {blockExcerpt(block) && <span className="block text-secondary">{blockExcerpt(block)}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              ) : (
                <>
                  {titleChanged && (
                    <p className="rounded-lg border border-warning bg-warning-bg px-3 py-2 text-[13px]">
                      <span className="font-semibold">Titre modifié :</span> « {String(snapshot.title ?? '')} » → «{' '}
                      {draft.title} »
                    </p>
                  )}
                  {changes.every((change) => change.status === 'same') && !titleChanged ? (
                    <p className="text-secondary">Le brouillon ne diffère pas de la version en ligne.</p>
                  ) : (
                    <ol className="space-y-2">
                      {changes.map((change, index) => {
                        const block = change.after ?? change.before!;
                        return (
                          <li
                            key={index}
                            className={cn(
                              'rounded-lg border border-border px-3 py-2 text-[13px]',
                              change.status === 'same' && 'text-secondary',
                            )}
                          >
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{blockLabel(change.component)}</span>
                              <StatusBadge tone={label[change.status].tone}>{label[change.status].text}</StatusBadge>
                            </span>
                            {change.status === 'changed' ? (
                              <>
                                <span className="mt-1 block text-secondary line-through">
                                  <span className="sr-only">Avant : </span>
                                  {blockExcerpt(change.before!)}
                                </span>
                                <span className="block">
                                  <span className="sr-only">Après : </span>
                                  {blockExcerpt(change.after!)}
                                </span>
                              </>
                            ) : (
                              blockExcerpt(block) && <span className="mt-1 block">{blockExcerpt(block)}</span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </>
              )}
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Row({
  title,
  at,
  detail,
  badge,
  children,
}: {
  title: string;
  at: string | null;
  detail?: string | null;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="px-5 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {title}
          {badge}
        </p>
        {at && <span className="shrink-0 text-[13px] text-secondary">{when(at)}</span>}
      </div>
      {detail && <p className="mt-0.5 text-[13px] text-secondary">{detail}</p>}
      {children && <div className="mt-2 flex flex-wrap gap-2">{children}</div>}
    </li>
  );
}

export function HistoryPanel({
  open,
  onOpenChange,
  type,
  documentId,
  draft,
  createdLabel,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ContentApi;
  documentId: string;
  draft: HistoryDraft;
  /** « Page créée », « Actualité créée »… */
  createdLabel: string;
  onRestore: (snapshot: Record<string, unknown>) => Promise<void>;
}) {
  const returnFocus = useReturnFocus();
  const versions = useQuery({ ...versionsQuery(type, documentId), enabled: open });
  const [shown, setShown] = useState<{ version: VersionSummary; mode: 'view' | 'compare' } | null>(null);
  const [restoring, setRestoring] = useState<VersionSummary | null>(null);
  const list = versions.data?.data ?? [];
  const draftRow = !draft.published || draft.modified;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
          <Dialog.Content
            {...returnFocus}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-border bg-surface shadow-dialog dark:border-border-dialog dark:bg-sidebar"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
              <div className="min-w-0">
                <Dialog.Title className="flex items-center gap-2 text-[17px] font-semibold">
                  <History aria-hidden="true" className="size-4" />
                  Historique
                </Dialog.Title>
                <Dialog.Description className="truncate text-[13px] text-secondary">
                  {draft.title || 'Sans titre'}
                  {versions.data && ` · ${list.length} version${list.length > 1 ? 's' : ''}`}
                </Dialog.Description>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fermer l'historique"
                onClick={() => onOpenChange(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {versions.isError ? (
                <p role="alert" className="m-5 rounded-lg border border-danger bg-danger-alert-bg p-4">
                  L'historique n'a pas pu être chargé.{' '}
                  <Button type="button" variant="secondary" size="sm" onClick={() => void versions.refetch()}>
                    Réessayer
                  </Button>
                </p>
              ) : !versions.data ? (
                <div aria-busy="true" className="m-5 h-40 animate-pulse rounded-lg bg-neutral-bg" />
              ) : (
                <ul className="divide-y divide-border">
                  {draftRow && (
                    <Row
                      title="Brouillon en cours"
                      at={draft.updatedAt}
                      detail={[blocksText(draft.blocks.length), 'non publié'].filter(Boolean).join(' · ')}
                    />
                  )}
                  {list.map((version) => (
                    <Row
                      key={version.id}
                      title={version.kind === 'draft' ? 'Brouillon gardé' : 'Version publiée'}
                      at={version.at}
                      detail={[version.authorName, version.summary].filter(Boolean).join(' · ')}
                      badge={version.live ? <StatusBadge tone="success">En ligne</StatusBadge> : undefined}
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShown({ version, mode: 'view' })}
                      >
                        Voir
                      </Button>
                      {version.live ? (
                        draftRow && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShown({ version, mode: 'compare' })}
                          >
                            Comparer au brouillon
                          </Button>
                        )
                      ) : (
                        <Button type="button" variant="secondary" size="sm" onClick={() => setRestoring(version)}>
                          Restaurer…
                        </Button>
                      )}
                    </Row>
                  ))}
                  <Row
                    title={createdLabel}
                    at={versions.data.meta.createdAt}
                    detail={versions.data.meta.template ? `Depuis le modèle « ${versions.data.meta.template} »` : null}
                  />
                </ul>
              )}
            </div>
            <p className="border-t border-border px-5 py-3 text-[13px] text-secondary">
              Restaurer une version crée un nouveau brouillon ; la version en ligne n'est pas modifiée tant que vous ne
              publiez pas.
            </p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {shown && (
        <VersionDialog
          type={type}
          documentId={documentId}
          version={shown.version}
          draft={draft}
          mode={shown.mode}
          onClose={() => setShown(null)}
        />
      )}
      <RestoreDialog
        type={type}
        documentId={documentId}
        version={restoring}
        onClose={() => setRestoring(null)}
        onRestore={async (snapshot) => {
          await onRestore(snapshot);
          onOpenChange(false);
        }}
      />
    </>
  );
}

function RestoreDialog({
  type,
  documentId,
  version,
  onClose,
  onRestore,
}: {
  type: ContentApi;
  documentId: string;
  version: VersionSummary | null;
  onClose: () => void;
  onRestore: (snapshot: Record<string, unknown>) => Promise<void>;
}) {
  const detail = useQuery({ ...versionQuery(type, documentId, version?.id ?? 0), enabled: !!version });
  return (
    <ConfirmDialog
      open={!!version}
      onOpenChange={(open) => !open && onClose()}
      tone="warning"
      icon={History}
      title={version ? `Restaurer la version ${versionDateText(formatListDate(new Date(version.at)))} ?` : ''}
      description="Le brouillon reprend le contenu de cette version ; le brouillon actuel est gardé dans l'historique. La version en ligne ne change pas tant que vous ne publiez pas."
      confirmLabel="Restaurer dans le brouillon"
      onConfirm={async () => {
        const snapshot = detail.data?.snapshot ?? (await detail.refetch()).data?.snapshot;
        if (!snapshot) throw new Error("La version n'a pas pu être lue.");
        await onRestore(snapshot);
      }}
    />
  );
}

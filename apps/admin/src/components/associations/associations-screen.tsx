/**
 * Associations (handoff 6.13) : onglets « Publiées » (annuaire du site) et « Propositions à
 * examiner » (compteur), plus « Refusées » s'il y en a. Une proposition montre les coordonnées du
 * demandeur et trois actions nommées : Publier, Modifier avant de publier, Refuser (motif envoyé par
 * e-mail). Pas de brouillon : ce qui est publié part à la prochaine mise en ligne.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Globe, HandHeart, Mail, MoreHorizontal, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ASSOCIATION_CATEGORY_LABELS } from '@communeo/core';
import { Pagination } from '@/components/content-list/pagination';
import { Toolbar } from '@/components/content-list/toolbar';
import type { Noun } from '@/components/content-list/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  ASSOCIATIONS_PAGE_SIZE,
  associationCountsQuery,
  associationsQuery,
  deleteAssociation,
  publishAssociation,
  refreshAssociations,
  rejectAssociation,
  saveAssociation,
  type Association,
  type AssociationStatus,
} from '@/lib/associations';
import { formatShortDate } from '@/lib/dates';
import { cn, initials } from '@/lib/utils';
import { AssociationSheet } from './association-sheet';
import { RejectDialog } from './reject-dialog';

const NOUN: Noun = { one: 'association', many: 'associations', feminine: true, definite: "l'association" };

export type AssociationsTab = 'publiees' | 'propositions' | 'refusees';
const TAB_STATUS: Record<AssociationsTab, AssociationStatus> = {
  publiees: 'published',
  propositions: 'pending',
  refusees: 'rejected',
};

export interface AssociationsSearch {
  onglet?: Exclude<AssociationsTab, 'publiees'>;
  q?: string;
  page?: number;
}

export function associationsSearch(raw: Record<string, unknown>): AssociationsSearch {
  const search: AssociationsSearch = {};
  if (raw.onglet === 'propositions' || raw.onglet === 'refusees') search.onglet = raw.onglet;
  if (typeof raw.q === 'string' && raw.q.trim()) search.q = raw.q;
  const page = Number(raw.page);
  if (Number.isInteger(page) && page > 1) search.page = page;
  return search;
}

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');
const categoryLabel = (category: string) => ASSOCIATION_CATEGORY_LABELS[category] ?? category;

type SearchChange = (patch: Partial<AssociationsSearch>, options?: { replace?: boolean }) => void;

export function AssociationsScreen({
  search,
  onSearchChange,
}: {
  search: AssociationsSearch;
  onSearchChange: SearchChange;
}) {
  const client = useQueryClient();
  const tab: AssociationsTab = search.onglet ?? 'publiees';
  const params = { status: TAB_STATUS[tab], q: search.q ?? '', page: search.page ?? 1 };
  const counts = useQuery(associationCountsQuery);
  const list = useQuery(associationsQuery(params));
  const [sheet, setSheet] = useState<{ association: Association | null } | null>(null);
  const [rejecting, setRejecting] = useState<Association | null>(null);
  const [deleting, setDeleting] = useState<Association | null>(null);
  // Proposition dépliée : la première par défaut
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);

  const publish = async (association: Association) => {
    try {
      await publishAssociation(association.documentId);
      toast.success(`« ${association.name} » est publiée. Elle apparaîtra sur le site à la prochaine mise en ligne.`);
    } catch (error) {
      toast.error(`« ${association.name} » n'a pas pu être publiée : ${errorText(error)}`);
    }
    await refreshAssociations(client);
  };

  const tabs: Array<{ value: AssociationsTab; label: string; count: number | undefined; alert?: boolean }> = [
    { value: 'publiees', label: 'Publiées', count: counts.data?.published },
    { value: 'propositions', label: 'Propositions à examiner', count: counts.data?.pending, alert: true },
    ...(counts.data?.rejected || tab === 'refusees'
      ? [{ value: 'refusees' as const, label: 'Refusées', count: counts.data?.rejected }]
      : []),
  ];
  const empty = counts.isSuccess && counts.data.published + counts.data.pending + counts.data.rejected === 0;
  const description = counts.data
    ? [
        `${counts.data.published} publiée${counts.data.published > 1 ? 's' : ''}`,
        counts.data.pending
          ? `${counts.data.pending} proposition${counts.data.pending > 1 ? 's' : ''} à examiner`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;
  const rows = list.data?.rows ?? [];
  const openId = expanded === undefined ? rows[0]?.documentId : expanded;

  return (
    <div>
      <PageHeader
        title="Associations"
        description={description}
        actions={
          <Button onClick={() => setSheet({ association: null })}>
            <Plus aria-hidden="true" />
            Ajouter une association
          </Button>
        }
      />

      {empty ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <span
            aria-hidden="true"
            className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand"
          >
            <HandHeart className="size-6" />
          </span>
          <h2 className="mt-4 text-[17px]">Présentez les associations de la commune</h2>
          <p className="mx-auto mt-2 max-w-md text-secondary">
            Ajoutez-les ici, ou laissez les habitants les proposer depuis le site : les propositions arrivent dans
            l'onglet « Propositions à examiner ».
          </p>
          <Button className="mt-5" onClick={() => setSheet({ association: null })}>
            <Plus aria-hidden="true" />
            Ajouter une association
          </Button>
        </div>
      ) : (
        <>
          <nav
            aria-label="Associations"
            className="-mx-4 -mt-2 mb-4 flex items-center gap-x-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
          >
            {tabs.map((option) => {
              const active = option.value === tab;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => {
                    setExpanded(undefined);
                    onSearchChange({
                      onglet: option.value === 'publiees' ? undefined : option.value,
                      page: undefined,
                      q: undefined,
                    });
                  }}
                  className={cn(
                    '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm whitespace-nowrap',
                    active ? 'border-brand font-semibold text-brand' : 'border-transparent text-text hover:text-brand',
                  )}
                >
                  {option.label}
                  {option.count !== undefined &&
                    (option.alert && option.count > 0 ? (
                      <span className="grid min-w-5 place-items-center rounded-full bg-brand-button px-1.5 text-[11px] leading-5 font-semibold text-on-brand">
                        {option.count}
                      </span>
                    ) : (
                      <span className="font-normal text-secondary">{option.count}</span>
                    ))}
                </button>
              );
            })}
          </nav>

          <div className="rounded-xl border border-border bg-surface md:overflow-hidden">
            <Toolbar
              noun={NOUN}
              query={params.q}
              onQuery={(q) => onSearchChange({ q: q || undefined, page: undefined }, { replace: true })}
              filters={[]}
              onFilter={() => undefined}
            />
            <p role="status" className="sr-only">
              {list.isSuccess && !list.isPlaceholderData
                ? `${list.data.total} association${list.data.total > 1 ? 's' : ''}`
                : ''}
            </p>

            {list.isPending ? (
              <p aria-busy="true" className="p-8 text-center text-secondary">
                Chargement des associations…
              </p>
            ) : list.isError ? (
              <div role="alert" className="p-8 text-center">
                <p className="font-semibold">La liste n'a pas pu être chargée.</p>
                <Button variant="secondary" className="mt-3" onClick={() => void list.refetch()}>
                  Réessayer
                </Button>
              </div>
            ) : list.data.total === 0 ? (
              <p className="px-6 py-12 text-center text-[15px] font-semibold">
                {params.q
                  ? `Aucune association ne correspond à « ${params.q} »`
                  : tab === 'propositions'
                    ? 'Aucune proposition à examiner. Les propositions envoyées depuis le site arriveront ici.'
                    : tab === 'refusees'
                      ? 'Aucune proposition refusée.'
                      : 'Aucune association publiée pour le moment.'}
              </p>
            ) : (
              <div
                aria-busy={list.isFetching}
                className={cn(list.isPlaceholderData && 'opacity-60 motion-safe:transition-opacity')}
              >
                <ul
                  aria-label={tabs.find((option) => option.value === tab)!.label}
                  className="divide-y divide-border-row"
                >
                  {rows.map((association) =>
                    tab === 'propositions' ? (
                      <Proposal
                        key={association.documentId}
                        association={association}
                        open={openId === association.documentId}
                        onToggle={() => setExpanded(openId === association.documentId ? null : association.documentId)}
                        onPublish={() => void publish(association)}
                        onEdit={() => setSheet({ association })}
                        onReject={() => setRejecting(association)}
                      />
                    ) : (
                      <AssociationRow
                        key={association.documentId}
                        association={association}
                        onEdit={() => setSheet({ association })}
                        onPublish={tab === 'refusees' ? () => void publish(association) : undefined}
                        onDelete={() => setDeleting(association)}
                      />
                    ),
                  )}
                </ul>
                {list.data.pageCount > 1 && (
                  <Pagination
                    page={params.page}
                    pageCount={list.data.pageCount}
                    pageSize={ASSOCIATIONS_PAGE_SIZE}
                    total={list.data.total}
                    onPage={(page) => onSearchChange({ page: page === 1 ? undefined : page })}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}

      <AssociationSheet
        open={!!sheet}
        association={sheet?.association ?? null}
        onClose={() => setSheet(null)}
        onSave={async (data, { publish: andPublish }) => {
          const current = sheet?.association ?? null;
          try {
            const saved = await saveAssociation(current?.documentId ?? null, data);
            if (andPublish) await publishAssociation(saved.documentId);
            toast.success(
              !current
                ? `« ${saved.name} » est ajoutée à l'annuaire. Elle apparaîtra sur le site à la prochaine mise en ligne.`
                : andPublish
                  ? `« ${saved.name} » est publiée. Elle apparaîtra sur le site à la prochaine mise en ligne.`
                  : `La fiche « ${saved.name} » est enregistrée.`,
            );
            setSheet(null);
          } catch (error) {
            toast.error(`La fiche n'a pas pu être enregistrée : ${errorText(error)}`);
          }
          await refreshAssociations(client);
        }}
      />

      <RejectDialog
        association={rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        onReject={async (reason) => {
          const association = rejecting!;
          const { emailed } = await rejectAssociation(association.documentId, reason);
          if (emailed || !association.submitted_by_email)
            toast.success(
              `La proposition « ${association.name} » est refusée${emailed ? ', le motif a été envoyé.' : '.'}`,
            );
          else
            toast.error(
              `La proposition est refusée, mais l'e-mail n'est pas parti. Prévenez ${association.submitted_by_email} autrement.`,
            );
          await refreshAssociations(client);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Supprimer « ${deleting?.name ?? ''} » ?`}
        description="Cette action est définitive. L'association disparaîtra du site à la prochaine mise en ligne."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          const association = deleting!;
          await deleteAssociation(association.documentId);
          toast.success(`« ${association.name} » a été supprimée.`);
          await refreshAssociations(client);
        }}
      />
    </div>
  );
}

function Logo({ association }: { association: Association }) {
  const url =
    (association.logo as { formats?: { thumbnail?: { url: string } } | null; url?: string } | null)?.formats?.thumbnail
      ?.url ?? association.logo?.url;
  return url ? (
    <img src={url} alt="" className="size-10 shrink-0 rounded-lg border border-border object-contain bg-surface" />
  ) : (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-[13px] font-semibold text-brand"
    >
      {initials(association.name)}
    </span>
  );
}

function AssociationRow({
  association,
  onEdit,
  onPublish,
  onDelete,
}: {
  association: Association;
  onEdit: () => void;
  onPublish?: () => void;
  onDelete: () => void;
}) {
  const rejected = association.status === 'rejected';
  return (
    <li className="flex items-start gap-3 px-4 py-3 md:items-center">
      <Logo association={association} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onEdit}
          className="text-left font-semibold text-text underline-offset-2 hover:text-brand hover:underline"
          aria-label={`Modifier la fiche de ${association.name}`}
        >
          {association.name}
        </button>
        <p className="text-[13px] text-secondary">
          {rejected
            ? [
                categoryLabel(association.category),
                association.reviewed_at
                  ? `refusée le ${formatShortDate(new Date(association.reviewed_at))}`
                  : 'refusée',
                association.submitted_by_name,
              ]
                .filter(Boolean)
                .join(' · ')
            : [categoryLabel(association.category), association.contact_name].filter(Boolean).join(' · ')}
        </p>
        {rejected && association.rejection_reason && (
          <p className="mt-1.5 line-clamp-2 text-[13px] text-text">Motif : {association.rejection_reason}</p>
        )}
        {!rejected && (association.contact_email || association.contact_phone || association.website) && (
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-secondary">
            {association.contact_email && (
              <span className="inline-flex items-center gap-1.5 break-all">
                <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                {association.contact_email}
              </span>
            )}
            {association.contact_phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone aria-hidden="true" className="size-3.5 shrink-0" />
                {association.contact_phone}
              </span>
            )}
            {association.website && (
              <span className="inline-flex items-center gap-1.5 break-all">
                <Globe aria-hidden="true" className="size-3.5 shrink-0" />
                {association.website.replace(/^https?:\/\//, '')}
              </span>
            )}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions pour « ${association.name} »`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil aria-hidden="true" />
            Modifier
          </DropdownMenuItem>
          {onPublish && (
            <DropdownMenuItem onSelect={onPublish}>
              <HandHeart aria-hidden="true" />
              Publier finalement
            </DropdownMenuItem>
          )}
          <DropdownMenuItem destructive onSelect={onDelete}>
            <Trash2 aria-hidden="true" />
            Supprimer…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function Proposal({
  association,
  open,
  onToggle,
  onPublish,
  onEdit,
  onReject,
}: {
  association: Association;
  open: boolean;
  onToggle: () => void;
  onPublish: () => void;
  onEdit: () => void;
  onReject: () => void;
}) {
  const panelId = `proposition-${association.documentId}`;
  const meta = [
    categoryLabel(association.category),
    `proposée le ${formatShortDate(new Date(association.createdAt))}`,
    association.submitted_by_name,
  ]
    .filter(Boolean)
    .join(' · ');
  const details: Array<[string, React.ReactNode]> = [
    ['Demandeur', association.submitted_by_name],
    [
      'E-mail',
      association.submitted_by_email && (
        <a
          href={`mailto:${association.submitted_by_email}`}
          className="break-all text-brand underline underline-offset-2"
        >
          {association.submitted_by_email}
        </a>
      ),
    ],
    ['Contact affiché', [association.contact_name, association.contact_email].filter(Boolean).join(' · ') || null],
    ['Téléphone', association.contact_phone],
    ['Siège', association.address],
    ['Site web', association.website],
  ];
  return (
    <li>
      <h3 className="text-base">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-surface-hover"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">{association.name}</span>
            <span className="mt-0.5 block text-[13px] font-normal text-secondary">{meta}</span>
          </span>
          <StatusBadge tone="info" className="hidden shrink-0 sm:inline-flex">
            À examiner
          </StatusBadge>
          <ChevronDown
            aria-hidden="true"
            className={cn('mt-1 size-4 shrink-0 text-secondary motion-safe:transition-transform', open && 'rotate-180')}
          />
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="space-y-4 px-4 pb-4">
        {association.description && <p className="whitespace-pre-line">{association.description}</p>}
        <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-sidebar p-4 text-[13px] sm:grid-cols-[max-content_1fr] dark:bg-bg">
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-secondary">{label}</dt>
                <dd className="mb-1.5 break-words sm:mb-0">{value}</dd>
              </div>
            ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onPublish}>Publier</Button>
          <Button variant="secondary" onClick={onEdit}>
            Modifier avant de publier
          </Button>
          <Button variant="destructive-outline" onClick={onReject}>
            Refuser…
          </Button>
        </div>
      </div>
    </li>
  );
}

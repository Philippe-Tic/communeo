/**
 * Messages des habitants (handoff 6.14) : boîte de réception à gauche, message ouvert à droite ;
 * sous 1024 px, la liste plein écran puis le détail plein écran. Non lus en gras avec un point,
 * demandes RGPD en cours surlignées avec le délai légal restant. L'état (message ouvert, recherche,
 * filtres, page) est dans l'adresse : retour arrière et lien partagé.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Inbox } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { rgpdDaysLeft } from '@communeo/core';
import { Pagination } from '@/components/content-list/pagination';
import { Toolbar } from '@/components/content-list/toolbar';
import type { Noun } from '@/components/content-list/types';
import { Button } from '@/components/ui/button';
import { formatInboxDate } from '@/lib/dates';
import { focusHeadingIfRequested } from '@/lib/focus';
import {
  INBOX_PAGE_SIZE,
  inboxQuery,
  MESSAGE_CATEGORIES,
  MESSAGE_STATUSES,
  senderName,
  type MessageCategory,
  type MessageStatus,
  type MessageSummary,
} from '@/lib/messages';
import { sessionQuery } from '@/lib/session';
import { cn } from '@/lib/utils';
import { MessageDetail } from './message-detail';

const NOUN: Noun = { one: 'message', many: 'messages', feminine: false, definite: 'le message' };

export interface MessagesSearch {
  id?: string;
  q?: string;
  nonLus?: boolean;
  categorie?: MessageCategory;
  statut?: MessageStatus;
  page?: number;
}

export function messagesSearch(raw: Record<string, unknown>): MessagesSearch {
  const search: MessagesSearch = {};
  if (typeof raw.id === 'string' && /^[\w-]{1,64}$/.test(raw.id)) search.id = raw.id;
  if (typeof raw.q === 'string' && raw.q.trim()) search.q = raw.q;
  if (raw.nonLus === true || raw.nonLus === 'true') search.nonLus = true;
  if (typeof raw.categorie === 'string' && raw.categorie in MESSAGE_CATEGORIES)
    search.categorie = raw.categorie as MessageCategory;
  if (typeof raw.statut === 'string' && raw.statut in MESSAGE_STATUSES) search.statut = raw.statut as MessageStatus;
  const page = Number(raw.page);
  if (Number.isInteger(page) && page > 1) search.page = page;
  return search;
}

/** Demande RGPD pas encore traitée : surlignée, avec le délai */
export const isOpenRgpd = (message: Pick<MessageSummary, 'category' | 'status'>) =>
  message.category === 'rgpd' && (message.status === 'received' || message.status === 'in_progress');

export function daysLeftText(days: number) {
  if (days > 1) return `${days} jours restants`;
  if (days === 1) return '1 jour restant';
  if (days === 0) return "Dernier jour aujourd'hui";
  return `Délai dépassé de ${-days} jour${days < -1 ? 's' : ''}`;
}

const STATUS_TONE: Record<MessageStatus, string> = {
  received: 'text-secondary',
  in_progress: 'font-semibold text-info',
  resolved: 'font-semibold text-success',
  closed: 'text-secondary',
};

type SearchChange = (patch: Partial<MessagesSearch>, options?: { replace?: boolean }) => void;

export function MessagesScreen({ search, onSearchChange }: { search: MessagesSearch; onSearchChange: SearchChange }) {
  const { data: user } = useQuery(sessionQuery);
  const params = {
    q: search.q ?? '',
    nonLus: search.nonLus,
    categorie: search.categorie,
    statut: search.statut,
    page: search.page ?? 1,
  };
  const list = useQuery(inboxQuery(params));
  const unread = useQuery({ ...inboxQuery({ q: '', nonLus: true, page: 1 }), select: (data) => data.total });
  const heading = useRef<HTMLHeadingElement>(null);
  // Message ouvert depuis la liste (pas à l'arrivée sur l'adresse) : son objet reçoit le focus
  const [initialId] = useState(search.id);
  const filtered = !!(params.q || params.nonLus || params.categorie || params.statut);

  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = ['Messages', user?.site?.name].filter(Boolean).join(' — ') + ' · Communeo';
  }, [user?.site?.name]);

  return (
    // Deux volets à hauteur d'écran (sous l'en-tête de 56 px) à partir de 1024 px
    <div className="-mx-4 -my-6 md:-mx-8 md:-my-7 lg:flex lg:h-[calc(100dvh-3.5rem)]">
      <section
        aria-labelledby="titre-messages"
        className={cn(
          'flex min-h-0 flex-col border-border bg-surface lg:w-[360px] lg:shrink-0 lg:border-r min-[1200px]:w-[440px] dark:bg-bg',
          search.id && 'hidden lg:flex',
        )}
      >
        <div className="border-b border-border-row px-4 pt-5 pb-1 md:px-5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 id="titre-messages" ref={heading} tabIndex={-1} className="outline-none">
              Messages
            </h1>
            {unread.data !== undefined && (
              <p className="text-[13px] text-secondary">
                {unread.data > 1 ? `${unread.data} non lus` : unread.data === 1 ? '1 non lu' : 'Tout est lu'}
              </p>
            )}
          </div>
        </div>
        <Toolbar
          noun={NOUN}
          query={params.q}
          onQuery={(q) => onSearchChange({ q: q || undefined, page: undefined }, { replace: true })}
          toggles={[
            {
              label: 'Non lus',
              pressed: !!params.nonLus,
              onChange: (pressed) => onSearchChange({ nonLus: pressed || undefined, page: undefined }),
            },
          ]}
          filters={[
            {
              key: 'categorie',
              label: 'Catégorie',
              value: params.categorie,
              options: Object.entries(MESSAGE_CATEGORIES).map(([value, label]) => ({ value, label })),
            },
            {
              key: 'statut',
              label: 'Statut',
              value: params.statut,
              options: Object.entries(MESSAGE_STATUSES).map(([value, label]) => ({ value, label })),
            },
          ]}
          onFilter={(key, value) => onSearchChange({ [key]: value, page: undefined })}
          searchLabel="Rechercher (nom, objet, référence)"
          stacked
        />

        <p role="status" className="sr-only">
          {list.isSuccess && !list.isPlaceholderData
            ? `${list.data.total} message${list.data.total > 1 ? 's' : ''}`
            : ''}
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.isPending ? (
            <p aria-busy="true" className="p-8 text-center text-secondary">
              Chargement des messages…
            </p>
          ) : list.isError ? (
            <div role="alert" className="p-8 text-center">
              <p className="font-semibold">Les messages n'ont pas pu être chargés.</p>
              <Button variant="secondary" className="mt-3" onClick={() => void list.refetch()}>
                Réessayer
              </Button>
            </div>
          ) : list.data.total === 0 ? (
            filtered ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[15px] font-semibold">
                  Aucun message ne correspond {params.q ? `à « ${params.q} »` : 'aux filtres choisis'}
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() =>
                    onSearchChange({
                      q: undefined,
                      nonLus: undefined,
                      categorie: undefined,
                      statut: undefined,
                      page: undefined,
                    })
                  }
                >
                  Effacer la recherche et les filtres
                </Button>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand"
                >
                  <Inbox className="size-6" />
                </span>
                <h2 className="mt-4 text-[17px]">Aucun message pour l'instant</h2>
                <p className="mx-auto mt-2 max-w-sm text-secondary">
                  Les messages envoyés avec le formulaire de contact du site arrivent ici, avec une référence et un
                  accusé de réception automatique.
                </p>
              </div>
            )
          ) : (
            <div
              aria-busy={list.isFetching}
              className={cn(list.isPlaceholderData && 'opacity-60 motion-safe:transition-opacity')}
            >
              <ul aria-label="Messages reçus" className="divide-y divide-border-row">
                {list.data.rows.map((message) => (
                  <InboxRow key={message.documentId} message={message} selected={message.documentId === search.id} />
                ))}
              </ul>
              {list.data.pageCount > 1 && (
                <Pagination
                  page={params.page}
                  pageCount={list.data.pageCount}
                  pageSize={INBOX_PAGE_SIZE}
                  total={list.data.total}
                  onPage={(page) => onSearchChange({ page: page === 1 ? undefined : page })}
                />
              )}
            </div>
          )}
        </div>
      </section>

      <div className={cn('min-h-0 min-w-0 flex-1', !search.id && 'hidden lg:block')}>
        {search.id ? (
          <MessageDetail
            key={search.id}
            documentId={search.id}
            focusTitle={search.id !== initialId}
            onClose={() => onSearchChange({ id: undefined })}
          />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center text-secondary">
            <p>Choisissez un message dans la liste pour le lire et y répondre.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InboxRow({ message, selected }: { message: MessageSummary; selected: boolean }) {
  const unread = !message.opened_at;
  const rgpd = isOpenRgpd(message);
  const days = rgpd ? rgpdDaysLeft(message.createdAt) : 0;
  return (
    <li className="relative">
      <Link
        to="/messages"
        search={(previous: MessagesSearch) => ({ ...previous, id: message.documentId })}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'block border-l-[3px] py-3.5 pr-4 pl-[13px] outline-offset-[-2px] hover:bg-surface-hover md:pr-5 md:pl-[17px]',
          rgpd ? 'border-l-danger bg-danger-bg/60 hover:bg-danger-bg' : 'border-l-transparent',
          selected && (rgpd ? 'bg-danger-bg' : 'border-l-brand bg-selected-row hover:bg-selected-row'),
        )}
      >
        <span className="flex items-baseline gap-2">
          {unread ? (
            <span aria-hidden="true" className="size-2 shrink-0 translate-y-[-1px] rounded-full bg-brand" />
          ) : (
            <span aria-hidden="true" className="w-2 shrink-0" />
          )}
          <span className={cn('min-w-0 flex-1 truncate', unread && 'font-semibold')}>
            {senderName(message)}
            {unread && <span className="sr-only"> (non lu)</span>}
          </span>
          <span className="shrink-0 text-xs text-secondary">{formatInboxDate(new Date(message.createdAt))}</span>
        </span>
        <span className={cn('mt-0.5 block truncate pl-4', unread && 'font-semibold')}>{message.subject}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-4 text-xs text-secondary">
          {message.category === 'rgpd' ? (
            <span className="rounded-full bg-danger-bg px-2 py-px font-semibold text-danger">RGPD</span>
          ) : (
            <span>{MESSAGE_CATEGORIES[message.category] ?? message.category} ·</span>
          )}
          <span>{message.reference_number} ·</span>
          <span className={STATUS_TONE[message.status]}>{MESSAGE_STATUSES[message.status]}</span>
          {rgpd && <span className="ml-auto font-semibold text-danger">{daysLeftText(days)}</span>}
        </span>
      </Link>
    </li>
  );
}

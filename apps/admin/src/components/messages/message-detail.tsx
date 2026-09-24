/**
 * Détail d'un message (handoff 6.14) : catégorie, référence, objet, statut modifiable, bandeau RGPD
 * (échéance légale d'un mois, modèle de réponse), expéditeur, message et pièces jointes, historique,
 * réponse par e-mail en bas (plein écran sur mobile, derrière « Répondre »). L'ouverture est notée
 * dans l'historique (« Ouvert par … ») une seule fois.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  CircleAlert,
  Clock,
  Copy,
  Eye,
  Inbox,
  MailCheck,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Reply,
  Send,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { rgpdDaysLeft, rgpdDeadline, rgpdReplyTemplate } from '@communeo/core';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatDayTime } from '@/lib/dates';
import { describeFile } from '@/lib/media';
import {
  deleteMessage,
  markOpened,
  MESSAGE_CATEGORIES,
  MESSAGE_STATUSES,
  messageQuery,
  refreshMessages,
  senderName,
  setStatus,
  type HistoryEvent,
  type Message,
  type MessageStatus,
} from '@/lib/messages';
import { sessionQuery } from '@/lib/session';
import { cn } from '@/lib/utils';
import { daysLeftText, isOpenRgpd } from './messages-screen';
import { EMPTY_DRAFT, REPLY_FIELD_ID, ReplyForm, ReplySheet, type ReplyDraft } from './reply-form';

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');
const deadlineText = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' }).format(date);

export function MessageDetail({
  documentId,
  focusTitle,
  onClose,
}: {
  documentId: string;
  /** Choisi dans la liste : le titre reçoit le focus (lecteurs d'écran, clavier) */
  focusTitle: boolean;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const query = useQuery(messageQuery(documentId));
  const heading = useRef<HTMLHeadingElement>(null);
  const opened = useRef(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState(false);
  // Brouillon de réponse, partagé entre la zone du bas (ordinateur) et la feuille (mobile)
  const [draft, setDraft] = useState<ReplyDraft>(EMPTY_DRAFT);
  const { data: user } = useQuery(sessionQuery);
  const message = query.data;

  const template = () =>
    message
      ? rgpdReplyTemplate({
          firstName: message.first_name,
          lastName: message.last_name,
          siteName: user?.site?.name ?? 'la commune',
        })
      : '';
  const applyTemplate = () => {
    setDraft((current) => ({ ...current, text: template() }));
    setConfirmTemplate(false);
    // Mobile : la saisie est dans la feuille
    if (!window.matchMedia('(min-width: 1024px)').matches) setReplyOpen(true);
    requestAnimationFrame(() =>
      document
        .querySelectorAll<HTMLTextAreaElement>(`#${REPLY_FIELD_ID}, #${REPLY_FIELD_ID}-feuille`)
        .forEach((field) => field.offsetParent && field.focus()),
    );
  };
  const offerTemplate = () => (draft.text.trim() ? setConfirmTemplate(true) : applyTemplate());

  // Ouverture notée une fois, puis le compteur « non lus » suit
  useEffect(() => {
    if (!message || message.opened_at || opened.current) return;
    opened.current = true;
    void markOpened(documentId)
      .then((updated) =>
        client.setQueryData(messageQuery(documentId).queryKey, (current) =>
          current ? { ...current, opened_at: updated.opened_at, history: updated.history } : current,
        ),
      )
      .catch(() => undefined)
      .finally(() => {
        void client.invalidateQueries({ queryKey: ['messages', 'inbox'] });
        void client.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
      });
  }, [message, documentId, client]);

  const loaded = !!message;
  useEffect(() => {
    if (loaded && focusTitle) heading.current?.focus();
  }, [loaded, focusTitle]);

  const status = useMutation({
    mutationFn: (next: MessageStatus) => setStatus(documentId, next),
    onSuccess: (_, next) => toast.success(`Statut : ${MESSAGE_STATUSES[next]}.`),
    onError: (error) => toast.error(`Le statut n'a pas pu être changé : ${errorText(error)}`),
    onSettled: () => refreshMessages(client),
  });

  if (query.isPending) {
    return (
      <p aria-busy="true" className="p-8 text-center text-secondary">
        Chargement du message…
      </p>
    );
  }
  if (query.isError) {
    const missing = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 403);
    return (
      <div role="alert" className="p-8 text-center">
        <p className="font-semibold">{missing ? "Ce message n'existe plus." : "Le message n'a pas pu être chargé."}</p>
        <div className="mt-3 flex justify-center gap-2">
          {!missing && (
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Réessayer
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Retour aux messages
          </Button>
        </div>
      </div>
    );
  }

  if (!message) return null;

  const received = new Date(message.createdAt);
  const rgpd = isOpenRgpd(message);
  const name = senderName(message);

  return (
    <article aria-labelledby="titre-message" className="flex h-full flex-col bg-bg">
      {/* Mobile : retour à la liste */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-2 py-2 lg:hidden dark:bg-sidebar">
        <Button asChild variant="ghost" size="icon-lg">
          <Link
            to="/messages"
            search={(previous: Record<string, unknown>) => ({ ...previous, id: undefined })}
            aria-label="Retour aux messages"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{message.reference_number}</p>
          <p className="text-xs text-secondary">
            {MESSAGE_STATUSES[message.status]} · {formatDayTime(received)}
          </p>
        </div>
        <ActionsMenu message={message} onDelete={() => setConfirmDelete(true)} large />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Mobile : la liste (et son titre) est masquée quand un message est ouvert ; l'écran garde son h1 */}
        <h1 className="sr-only lg:hidden">Messages</h1>
        <div className="border-b border-border bg-surface px-4 py-5 md:px-6 dark:bg-sidebar">
          <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[13px] text-secondary">
                <CategoryBadge message={message} />
                <span className="hidden lg:inline">
                  {message.reference_number} · reçu le {formatDayTime(received)}
                </span>
                <span className="font-semibold text-text lg:hidden">{name}</span>
              </p>
              <h2 id="titre-message" ref={heading} tabIndex={-1} className="mt-2 text-xl outline-none">
                {message.subject}
              </h2>
            </div>
            <div className="hidden items-center gap-1 lg:flex">
              <StatusSelect value={message.status} busy={status.isPending} onChange={(next) => status.mutate(next)} />
              <ActionsMenu message={message} onDelete={() => setConfirmDelete(true)} />
            </div>
          </div>
          {rgpd && <RgpdBanner message={message} onTemplate={offerTemplate} />}
        </div>

        <div className="space-y-5 px-4 pt-5 pb-24 md:px-6 lg:pb-5">
          <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <dt className="text-[13px] text-secondary">Expéditeur</dt>
              <dd className="font-semibold">{name}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[13px] text-secondary">E-mail</dt>
              <dd className="break-words">
                <a href={`mailto:${message.email}`} className="text-brand underline underline-offset-2">
                  {message.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-secondary">Téléphone</dt>
              <dd>
                {message.phone ? (
                  <a
                    href={`tel:${message.phone.replace(/\s/g, '')}`}
                    className="text-brand underline underline-offset-2"
                  >
                    {message.phone}
                  </a>
                ) : (
                  <span className="text-secondary">Non renseigné</span>
                )}
              </dd>
            </div>
          </dl>

          <section aria-label="Message de l'habitant" className="rounded-xl border border-border bg-surface p-4 md:p-5">
            <p className="whitespace-pre-line">{message.message}</p>
            {!!message.attachments?.length && (
              <ul aria-label="Pièces jointes" className="mt-4 space-y-2 border-t border-border-row pt-3">
                {message.attachments.map((file) => (
                  <li key={file.id} className="flex items-center gap-2 text-[13px]">
                    <Paperclip aria-hidden="true" className="size-4 text-secondary" />
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand underline underline-offset-2"
                    >
                      {file.name}
                    </a>
                    <span className="text-secondary">{describeFile(file)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <History message={message} />
        </div>
      </div>

      {/* Réponse : en bas du volet (ordinateur), derrière « Répondre » sur mobile */}
      <div className="hidden border-t border-border bg-surface px-6 py-4 lg:block dark:bg-sidebar">
        <ReplyForm message={message} draft={draft} onDraft={setDraft} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-border bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden dark:bg-sidebar">
        <StatusSelect value={message.status} busy={status.isPending} onChange={(next) => status.mutate(next)} large />
        <Button size="lg" className="flex-1" onClick={() => setReplyOpen(true)}>
          <Reply aria-hidden="true" />
          Répondre
        </Button>
      </div>
      <ReplySheet message={message} draft={draft} onDraft={setDraft} open={replyOpen} onOpenChange={setReplyOpen} />

      <ConfirmDialog
        open={confirmTemplate}
        onOpenChange={setConfirmTemplate}
        tone="warning"
        title="Remplacer votre réponse par le modèle ?"
        description="Le texte déjà saisi sera remplacé par le modèle de réponse RGPD."
        confirmLabel="Remplacer"
        cancelLabel="Garder ma réponse"
        onConfirm={applyTemplate}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer le message ${message.reference_number} ?`}
        description="Le message, la réponse et l'historique seront effacés définitivement. À réserver aux demandes d'effacement (RGPD) et aux messages indésirables."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          try {
            await deleteMessage(message.documentId);
            toast.success(`Le message ${message.reference_number} a été supprimé.`);
            onClose();
          } catch (error) {
            toast.error(`Le message n'a pas pu être supprimé : ${errorText(error)}`);
          }
          setConfirmDelete(false);
          await refreshMessages(client);
        }}
      />
    </article>
  );
}

function CategoryBadge({ message }: { message: Message }) {
  const rgpd = message.category === 'rgpd';
  return (
    <span
      className={cn(
        'rounded-full px-2 py-px text-xs font-semibold',
        rgpd ? 'bg-danger-bg text-danger' : 'bg-neutral-bg text-neutral',
      )}
    >
      {MESSAGE_CATEGORIES[message.category] ?? message.category}
    </span>
  );
}

function StatusSelect({
  value,
  busy,
  onChange,
  large,
}: {
  value: MessageStatus;
  busy: boolean;
  onChange: (value: MessageStatus) => void;
  large?: boolean;
}) {
  return (
    <select
      aria-label="Statut du message"
      value={value}
      disabled={busy}
      onChange={(event) => onChange(event.target.value as MessageStatus)}
      className={cn(
        'rounded-lg border border-border-input bg-surface pr-8 pl-3 font-medium disabled:opacity-60 dark:bg-sidebar',
        large ? 'h-12 w-[140px]' : 'h-9 w-[150px] text-sm',
      )}
    >
      {Object.entries(MESSAGE_STATUSES).map(([status, label]) => (
        <option key={status} value={status}>
          {label}
        </option>
      ))}
    </select>
  );
}

function ActionsMenu({ message, onDelete, large }: { message: Message; onDelete: () => void; large?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={large ? 'icon-lg' : 'icon'}
          aria-label={`Autres actions pour le message ${message.reference_number}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onSelect={() =>
            void navigator.clipboard.writeText(message.reference_number).then(
              () => toast.success(`Référence ${message.reference_number} copiée.`),
              () => toast.error("La référence n'a pas pu être copiée."),
            )
          }
        >
          <Copy aria-hidden="true" />
          Copier la référence
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={onDelete}>
          <Trash2 aria-hidden="true" />
          Supprimer le message…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RgpdBanner({ message, onTemplate }: { message: Message; onTemplate: () => void }) {
  const deadline = rgpdDeadline(message.createdAt);
  const days = rgpdDaysLeft(message.createdAt);
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-3 rounded-lg border border-danger/40 bg-danger-bg px-4 py-3 text-danger"
    >
      <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <p className="text-text">
        {days >= 0 ? (
          <>
            <strong>Demande RGPD : réponse obligatoire avant le {deadlineText(deadline)}</strong> (délai légal d'un
            mois). {daysLeftText(days)}.
          </>
        ) : (
          <>
            <strong>Demande RGPD : le délai légal d'un mois a expiré le {deadlineText(deadline)}.</strong> Répondez au
            plus vite.
          </>
        )}{' '}
        <button type="button" onClick={onTemplate} className="font-medium text-brand underline underline-offset-2">
          Modèle de réponse
        </button>
      </p>
    </div>
  );
}

const HISTORY_ICON: Record<HistoryEvent['type'], typeof Inbox> = {
  received: Inbox,
  acknowledged: MailCheck,
  opened: Eye,
  replied: Send,
  status: RefreshCw,
};

function historyText(event: HistoryEvent): string {
  const when = formatDayTime(new Date(event.at));
  const by = event.by ? ` par ${event.by}` : '';
  switch (event.type) {
    case 'received':
      return `Reçu le ${when} via le formulaire de contact du site`;
    case 'acknowledged':
      return `Accusé de réception envoyé automatiquement le ${when}`;
    case 'opened':
      return `Ouvert${by} le ${when}`;
    case 'replied':
      return `Réponse envoyée${by} le ${when}${event.attachment ? `, avec ${event.attachment}` : ''}`;
    case 'status':
      return `Statut changé${event.from ? ` de « ${MESSAGE_STATUSES[event.from]} »` : ''} en « ${event.to ? MESSAGE_STATUSES[event.to] : '?'} »${by} le ${when}`;
  }
}

function History({ message }: { message: Message }) {
  // Messages reçus avant l'historique : la réception, reconstituée
  const history = message.history ?? [];
  const events: HistoryEvent[] = history.some((event) => event.type === 'received')
    ? history
    : [{ type: 'received', at: message.createdAt }, ...history];
  return (
    <section aria-labelledby="titre-historique">
      <h3 id="titre-historique" className="text-xs font-semibold tracking-wide text-secondary uppercase">
        Historique
      </h3>
      <ol className="mt-2 space-y-2">
        {events.map((event, index) => {
          const Icon = HISTORY_ICON[event.type] ?? CircleAlert;
          return (
            <li key={index} className="text-[13px] text-secondary">
              <p className="flex items-start gap-2">
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {historyText(event)}
              </p>
              {event.type === 'replied' && event.message && (
                <blockquote className="mt-2 ml-6 rounded-lg border border-border bg-surface px-3 py-2 whitespace-pre-line text-text">
                  {event.message}
                </blockquote>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

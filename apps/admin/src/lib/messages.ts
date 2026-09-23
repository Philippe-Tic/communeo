/**
 * Messages des habitants (handoff 6.14) : boîte de réception (recherche, non lus, catégorie,
 * statut), détail, ouverture notée dans l'historique, statut, réponse par e-mail (#186).
 */
import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { UploadedFile } from './media';

export const MESSAGE_CATEGORIES = {
  general: 'Général',
  urbanisme: 'Urbanisme',
  'etat-civil': 'État civil',
  voirie: 'Voirie',
  associations: 'Associations',
  rgpd: 'RGPD',
  autre: 'Autre',
} as const;
export type MessageCategory = keyof typeof MESSAGE_CATEGORIES;

export const MESSAGE_STATUSES = {
  received: 'Reçu',
  in_progress: 'En cours',
  resolved: 'Traité',
  closed: 'Clos',
} as const;
export type MessageStatus = keyof typeof MESSAGE_STATUSES;

export interface HistoryEvent {
  type: 'received' | 'acknowledged' | 'opened' | 'replied' | 'status';
  at: string;
  by?: string | null;
  from?: MessageStatus;
  to?: MessageStatus;
  attachment?: string;
  message?: string;
}

export interface MessageSummary {
  documentId: string;
  first_name: string;
  last_name: string;
  subject: string;
  category: MessageCategory;
  status: MessageStatus;
  reference_number: string;
  opened_at: string | null;
  createdAt: string;
}

export interface Message extends MessageSummary {
  email: string;
  phone: string | null;
  message: string;
  response: string | null;
  responded_at: string | null;
  acknowledgment_sent: boolean | null;
  history: HistoryEvent[] | null;
  attachments: UploadedFile[] | null;
}

export interface InboxParams {
  q: string;
  nonLus?: boolean;
  categorie?: MessageCategory;
  statut?: MessageStatus;
  page: number;
}

export const INBOX_PAGE_SIZE = 30;

export const senderName = (message: Pick<MessageSummary, 'first_name' | 'last_name'>) =>
  `${message.first_name} ${message.last_name}`.trim();

export function inboxUrl({ q, nonLus, categorie, statut, page }: InboxParams): string {
  const search = new URLSearchParams();
  [
    'documentId',
    'first_name',
    'last_name',
    'subject',
    'category',
    'status',
    'reference_number',
    'opened_at',
    'createdAt',
  ].forEach((field, index) => search.set(`fields[${index}]`, field));
  search.set('sort[0]', 'createdAt:desc');
  search.set('pagination[page]', String(page));
  search.set('pagination[pageSize]', String(INBOX_PAGE_SIZE));
  const text = q.trim();
  if (text)
    ['first_name', 'last_name', 'subject', 'reference_number', 'email'].forEach((field, index) =>
      search.set(`filters[$or][${index}][${field}][$containsi]`, text),
    );
  if (nonLus) search.set('filters[opened_at][$null]', 'true');
  if (categorie) search.set('filters[category][$eq]', categorie);
  if (statut) search.set('filters[status][$eq]', statut);
  return `/api/contact-submissions?${search}`;
}

export const inboxQuery = (params: InboxParams) =>
  queryOptions({
    queryKey: ['messages', 'inbox', params],
    queryFn: async () => {
      const response = await api<{
        data: MessageSummary[];
        meta: { pagination: { total: number; pageCount: number } };
      }>(inboxUrl(params));
      return {
        rows: response.data,
        total: response.meta.pagination.total,
        pageCount: Math.max(1, response.meta.pagination.pageCount),
      };
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

export const messageQuery = (documentId: string) =>
  queryOptions({
    queryKey: ['messages', 'detail', documentId],
    queryFn: async () =>
      (await api<{ data: Message }>(`/api/contact-submissions/${documentId}?populate[attachments]=true`)).data,
  });

/** Ouverture : notée une seule fois côté serveur (« Ouvert par … ») */
export async function markOpened(documentId: string): Promise<Message> {
  return (await api<{ data: Message }>(`/api/contact-submissions/${documentId}/open`, { method: 'POST' })).data;
}

export async function setStatus(documentId: string, status: MessageStatus): Promise<void> {
  await api(`/api/contact-submissions/${documentId}`, { method: 'PUT', json: { data: { status } } });
}

export async function sendReply(
  documentId: string,
  reply: { message: string; resolve: boolean; attachmentFileId?: number },
): Promise<Message> {
  return (await api<{ data: Message }>(`/api/contact-submissions/${documentId}/reply`, { method: 'POST', json: reply }))
    .data;
}

export async function deleteMessage(documentId: string): Promise<void> {
  await api(`/api/contact-submissions/${documentId}`, { method: 'DELETE' });
}

/** Après une action : la boîte, le détail et le compteur de la barre latérale */
export const refreshMessages = (client: QueryClient) => client.invalidateQueries({ queryKey: ['messages'] });

/**
 * Associations de la commune (handoff 6.13) : publiées (annuaire du site), propositions d'habitants
 * à examiner, refusées. Publication et refus motivé par les routes de modération (#187) ; le refus
 * part par e-mail au demandeur. Pas de brouillon : une association publiée part à la prochaine mise
 * en ligne.
 */
import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { UploadedFile } from './media';

export type AssociationStatus = 'published' | 'pending' | 'rejected';

export interface Association {
  documentId: string;
  name: string;
  description: string | null;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  logo: UploadedFile | null;
  status: AssociationStatus;
  submission_source: 'manual' | 'public_form' | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  createdAt: string;
}

export type AssociationData = Pick<
  Association,
  'name' | 'description' | 'category' | 'contact_name' | 'contact_email' | 'contact_phone' | 'website' | 'address'
> & { logo: number | null };

export const ASSOCIATIONS_PAGE_SIZE = 25;

const LOGO = ['url', 'formats', 'name', 'ext', 'size', 'mime']
  .map((field, index) => `populate[logo][fields][${index}]=${field}`)
  .join('&');

export interface AssociationParams {
  status: AssociationStatus;
  q: string;
  page: number;
}

export const associationsQuery = ({ status, q, page }: AssociationParams) =>
  queryOptions({
    queryKey: ['associations', 'list', { status, q, page }],
    queryFn: async () => {
      const search = new URLSearchParams({
        'filters[status][$eq]': status,
        // Annuaire par nom, propositions de la plus récente à la plus ancienne
        'sort[0]': status === 'published' ? 'name:asc' : 'createdAt:desc',
        'pagination[page]': String(page),
        'pagination[pageSize]': String(ASSOCIATIONS_PAGE_SIZE),
      });
      if (q.trim()) search.set('filters[name][$containsi]', q.trim());
      const response = await api<{ data: Association[]; meta: { pagination: { total: number; pageCount: number } } }>(
        `/api/associations?${search}&${LOGO}`,
      );
      return {
        rows: response.data,
        total: response.meta.pagination.total,
        pageCount: Math.max(1, response.meta.pagination.pageCount),
      };
    },
    placeholderData: keepPreviousData,
  });

/** Nombre par onglet */
export const associationCountsQuery = queryOptions({
  queryKey: ['associations', 'counts'],
  queryFn: async () => {
    const count = async (status: AssociationStatus) =>
      (
        await api<{ meta: { pagination: { total: number } } }>(
          `/api/associations?filters[status][$eq]=${status}&pagination[pageSize]=1&fields[0]=documentId`,
        )
      ).meta.pagination.total;
    const [published, pending, rejected] = await Promise.all([count('published'), count('pending'), count('rejected')]);
    return { published, pending, rejected };
  },
});

export async function saveAssociation(documentId: string | null, data: AssociationData): Promise<Association> {
  const response = documentId
    ? await api<{ data: Association }>(`/api/associations/${documentId}`, { method: 'PUT', json: { data } })
    : // Ajoutée par la mairie : publiée tout de suite
      await api<{ data: Association }>('/api/associations', {
        method: 'POST',
        json: { data: { ...data, status: 'published', submission_source: 'manual' } },
      });
  return response.data;
}

export async function publishAssociation(documentId: string): Promise<Association> {
  return (await api<{ data: Association }>(`/api/associations/${documentId}/publish`, { method: 'POST' })).data;
}

export async function rejectAssociation(documentId: string, reason: string): Promise<{ emailed: boolean }> {
  const response = await api<{ emailed: boolean }>(`/api/associations/${documentId}/reject`, {
    method: 'POST',
    json: { reason },
  });
  return { emailed: response.emailed };
}

export const deleteAssociation = (documentId: string) => api(`/api/associations/${documentId}`, { method: 'DELETE' });

/** Après une action : les listes, les compteurs, et l'en-tête « Mettre en ligne » (l'annuaire change) */
export const refreshAssociations = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: ['associations'] }),
    client.invalidateQueries({ queryKey: ['publication'] }),
  ]);

/** Motifs de refus courants : un raccourci remplit le champ, toujours modifiable */
export const REJECTION_PRESETS = [
  {
    label: 'Association hors commune',
    text: "Bonjour, merci pour votre proposition. L'annuaire du site présente les associations dont le siège ou l'activité principale est dans la commune ; la vôtre n'y correspond pas.",
  },
  {
    label: 'Informations incomplètes',
    text: "Bonjour, merci pour votre proposition. Il nous manque le numéro RNA de l'association et le nom d'un contact référent pour la publier. Vous pouvez nous les transmettre en répondant à ce message.",
  },
  {
    label: 'Déjà référencée',
    text: "Bonjour, merci pour votre proposition. Cette association figure déjà dans l'annuaire du site. Pour modifier ses informations, contactez directement la mairie.",
  },
] as const;

/**
 * Équipe municipale (élus et services) : pas de brouillon, chaque modification est enregistrée
 * tout de suite et part à la prochaine mise en ligne. L'ordre (display_order) est celui du site.
 */
import { queryOptions } from '@tanstack/react-query';
import { api } from './api';
import type { UploadedFile } from './media';

export type TeamRole = 'maire' | 'adjoint' | 'conseiller' | 'dgs' | 'agent';

export interface TeamMember {
  documentId: string;
  first_name: string;
  last_name: string;
  role: TeamRole;
  title: string | null;
  delegation: string | null;
  bio: string | null;
  email: string | null;
  office_hours: string | null;
  display_order: number | null;
  photo: (UploadedFile & { formats?: { thumbnail?: { url: string } } | null }) | null;
}

export const teamQuery = queryOptions({
  queryKey: ['team'],
  queryFn: async () => {
    const members: TeamMember[] = [];
    for (let page = 1; ; page += 1) {
      const response = await api<{ data: TeamMember[]; meta: { pagination: { pageCount: number } } }>(
        `/api/team-members?populate[photo][fields][0]=url&populate[photo][fields][1]=formats&populate[photo][fields][2]=name&populate[photo][fields][3]=ext&populate[photo][fields][4]=size&sort[0]=display_order:asc&sort[1]=last_name:asc&pagination[page]=${page}&pagination[pageSize]=100`,
      );
      members.push(...response.data);
      if (page >= response.meta.pagination.pageCount) return members;
    }
  },
});

export type MemberData = Omit<TeamMember, 'documentId' | 'photo'> & { photo: number | null };

export async function saveMember(documentId: string | null, data: Partial<MemberData>): Promise<TeamMember> {
  const response = documentId
    ? await api<{ data: TeamMember }>(`/api/team-members/${documentId}`, { method: 'PUT', json: { data } })
    : await api<{ data: TeamMember }>('/api/team-members', { method: 'POST', json: { data } });
  return response.data;
}

export const deleteMember = (documentId: string) => api(`/api/team-members/${documentId}`, { method: 'DELETE' });

/** Nouvel ordre d'un groupe : seules les personnes dont la position change sont enregistrées */
export async function saveOrder(members: TeamMember[]) {
  const changes = members.map((member, index) => ({ member, order: (index + 1) * 10 })).filter(({ member, order }) => member.display_order !== order);
  await Promise.all(changes.map(({ member, order }) => saveMember(member.documentId, { display_order: order })));
}

export const fullName = (member: Pick<TeamMember, 'first_name' | 'last_name'>) => `${member.first_name} ${member.last_name}`.trim();

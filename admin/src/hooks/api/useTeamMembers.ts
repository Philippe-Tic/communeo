import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'
import { uploadFile } from './useOfficialDocuments'

export type TeamMemberRole = 'maire' | 'adjoint' | 'conseiller' | 'dgs' | 'agent'

export interface TeamMember {
  id: number
  documentId: string
  first_name: string
  last_name: string
  role: TeamMemberRole
  delegation?: string
  bio?: string
  photo?: {
    id: number
    url: string
    alternativeText?: string
  }
  display_order: number
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface CreateTeamMemberData {
  first_name: string
  last_name: string
  role: TeamMemberRole
  delegation?: string
  bio?: string
  photo?: number
  display_order?: number
}

export interface UpdateTeamMemberData extends Partial<CreateTeamMemberData> {
  id: string
}

export interface TeamMembersResponse {
  data: TeamMember[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export { uploadFile }

export const TEAM_MEMBERS_QUERY_KEYS = {
  all: ['team-members'] as const,
  lists: () => [...TEAM_MEMBERS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...TEAM_MEMBERS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...TEAM_MEMBERS_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...TEAM_MEMBERS_QUERY_KEYS.details(), documentId] as const,
}

export const ROLE_LABELS: Record<TeamMemberRole, string> = {
  maire: 'Maire',
  adjoint: 'Adjoint(e)',
  conseiller: 'Conseiller(e)',
  dgs: 'DGS',
  agent: 'Agent',
}

export const ROLE_COLORS: Record<TeamMemberRole, string> = {
  maire: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  adjoint: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  conseiller: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  dgs: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  agent: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export const useTeamMembers = (params: {
  page?: number
  pageSize?: number
  search?: string
  role?: TeamMemberRole
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.search) queryParams.append('filters[$or][0][first_name][$containsi]', params.search)
  if (params.search) queryParams.append('filters[$or][1][last_name][$containsi]', params.search)
  if (params.role) queryParams.append('filters[role][$eq]', params.role)
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'asc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    queryParams.append('sort', 'display_order:asc')
  }

  queryParams.append('populate', '*')

  return useQuery({
    queryKey: TEAM_MEMBERS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<TeamMembersResponse> => {
      const url = `/api/team-members?${queryParams.toString()}`
      return apiClient.get<TeamMembersResponse>(url)
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useTeamMember = (documentId: string) => {
  return useQuery({
    queryKey: TEAM_MEMBERS_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<TeamMember> => {
      const url = `/api/team-members/${documentId}?populate=*`
      const response = await apiClient.get<{ data: TeamMember }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreateTeamMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTeamMemberData): Promise<TeamMember> => {
      const response = await apiClient.post<{ data: TeamMember }>('/api/team-members', { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_MEMBERS_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateTeamMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTeamMemberData): Promise<TeamMember> => {
      const response = await apiClient.put<{ data: TeamMember }>(`/api/team-members/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(TEAM_MEMBERS_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: TEAM_MEMBERS_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteTeamMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/team-members/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      queryClient.removeQueries({ queryKey: TEAM_MEMBERS_QUERY_KEYS.detail(documentId) })
      queryClient.invalidateQueries({ queryKey: TEAM_MEMBERS_QUERY_KEYS.lists() })
    },
  })
}

export const useReorderTeamMembers = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (members: Array<{ id: string; display_order: number }>): Promise<void> => {
      await Promise.all(
        members.map(({ id, display_order }) =>
          apiClient.put(`/api/team-members/${id}`, { data: { display_order } })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_MEMBERS_QUERY_KEYS.lists() })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

export interface SiteUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  municipality_role: 'admin' | 'editor'
  active: boolean
  confirmed: boolean
  blocked: boolean
  createdAt: string
  updatedAt: string
  site: {
    id: number
    documentId: string
    name: string
    slug: string
  }
}

export interface CreateUserData {
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  municipality_role: 'admin' | 'editor'
  active?: boolean
}

export interface UpdateUserData {
  id: number
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  municipality_role?: 'admin' | 'editor'
  active?: boolean
}

export { USER_ROLE_LABELS, USER_ROLE_COLORS } from '../../lib/constants/user-types'

export const USERS_QUERY_KEYS = {
  all: ['users'] as const,
  lists: () => [...USERS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...USERS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...USERS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...USERS_QUERY_KEYS.details(), id] as const,
}

export const useUsers = (params: { search?: string; role?: string } = {}) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<SiteUser[]> => {
      const response = await apiClient.get<{ data: SiteUser[] }>('/api/user-management')
      let users = response.data
      if (params.search) {
        const s = params.search.toLowerCase()
        users = users.filter(u =>
          u.username.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          u.first_name.toLowerCase().includes(s) ||
          u.last_name.toLowerCase().includes(s)
        )
      }
      if (params.role) {
        users = users.filter(u => u.municipality_role === params.role)
      }
      return users
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useUser = (id: number) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.detail(id),
    queryFn: async (): Promise<SiteUser> => {
      const response = await apiClient.get<{ data: SiteUser }>(`/api/user-management/${id}`)
      return response.data
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUserData): Promise<SiteUser> => {
      const response = await apiClient.post<{ data: SiteUser }>('/api/user-management', { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateUserData): Promise<SiteUser> => {
      const response = await apiClient.put<{ data: SiteUser }>(`/api/user-management/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(USERS_QUERY_KEYS.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/user-management/${id}`)
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: USERS_QUERY_KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() })
    },
  })
}

export const useResendInvitation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<{ ok: boolean }> => {
      return apiClient.post<{ ok: boolean }>(`/api/user-management/${id}/resend-invitation`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() })
    },
  })
}

export const useAdminResetPassword = () => {
  return useMutation({
    mutationFn: async (id: number): Promise<{ ok: boolean }> => {
      return apiClient.post<{ ok: boolean }>(`/api/user-management/${id}/reset-password`)
    },
  })
}

export interface AcceptInvitationData {
  token: string
  password: string
  passwordConfirmation: string
}

export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: async (data: AcceptInvitationData): Promise<{ ok: boolean }> => {
      return apiClient.postWithoutAuth<{ ok: boolean }>('/api/user-management/accept-invitation', data)
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

export interface SiteUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  municipality_role: 'mayor' | 'deputy' | 'secretary' | 'editor'
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
  password: string
  first_name: string
  last_name: string
  phone?: string
  municipality_role: 'mayor' | 'deputy' | 'secretary' | 'editor'
  active?: boolean
}

export interface UpdateUserData {
  id: number
  username?: string
  email?: string
  password?: string
  first_name?: string
  last_name?: string
  phone?: string
  municipality_role?: 'mayor' | 'deputy' | 'secretary' | 'editor'
  active?: boolean
}

export const ROLE_LABELS: Record<string, string> = {
  mayor: 'Maire',
  deputy: 'Adjoint',
  secretary: 'Secrétaire',
  editor: 'Rédacteur',
}

export const ROLE_COLORS: Record<string, string> = {
  mayor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  deputy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  secretary: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  editor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

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

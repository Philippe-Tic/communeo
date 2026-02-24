import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'
import { AUTH_QUERY_KEYS } from './useAuth'
import type { SiteUser } from './useUsers'

export interface UpdateProfileData {
  first_name?: string
  last_name?: string
  phone?: string
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateProfileData): Promise<SiteUser> => {
      const response = await apiClient.put<{ data: SiteUser }>('/api/user-management/me', { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.currentUser })
    },
  })
}

export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: async (): Promise<{ ok: boolean }> => {
      return apiClient.post<{ ok: boolean }>('/api/user-management/me/reset-password')
    },
  })
}

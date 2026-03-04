import { useQuery } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'
import type { SiteUser } from './useUsers'

const SUPER_ADMIN_USERS_KEYS = {
  all: ['super-admin-users'] as const,
  list: (siteFilter?: string) => [...SUPER_ADMIN_USERS_KEYS.all, 'list', siteFilter] as const,
}

export const useSuperAdminUsers = (params: { site?: string; search?: string; role?: string } = {}) => {
  return useQuery({
    queryKey: SUPER_ADMIN_USERS_KEYS.list(params.site),
    queryFn: async (): Promise<SiteUser[]> => {
      const queryParams = params.site ? `?site=${params.site}` : ''
      const response = await apiClient.get<{ data: SiteUser[] }>(`/api/user-management${queryParams}`)
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
    staleTime: 1000 * 60 * 2,
  })
}

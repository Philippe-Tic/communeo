import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

// Types
export interface LoginCredentials {
  identifier: string // email or username
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  municipality_role: 'admin' | 'editor'
  site: number // site ID
}

export interface AuthResponse {
  jwt: string
  user: {
    id: number
    username: string
    email: string
    confirmed: boolean
    blocked: boolean
    first_name: string
    last_name: string
    municipality_role: 'super_admin' | 'admin' | 'editor'
    site?: {
      id: number
      documentId: string
      name: string
      slug: string
    }
  }
}

export interface User {
  id: number
  username: string
  email: string
  confirmed: boolean
  blocked: boolean
  first_name: string
  last_name: string
  municipality_role: 'super_admin' | 'admin' | 'editor'
  site?: {
    id: number
    documentId: string
    name: string
    slug: string
  }
}

// Query keys
export const AUTH_QUERY_KEYS = {
  currentUser: ['auth', 'currentUser'] as const,
  user: (token: string) => ['auth', 'user', token] as const,
}

// Hooks
export const useCurrentUser = (token: string | null) => {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.currentUser,
    queryFn: async (): Promise<User> => {
      if (!token) {
        throw new Error('No token provided')
      }
      return apiClient.get<User>('/api/users/me?populate=site')
    },
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      return apiClient.postWithoutAuth<AuthResponse>('/api/auth/local', credentials)
    },
    onSuccess: (data) => {
      // Store token
      localStorage.setItem('auth_token', data.jwt)

      // Set user data in cache
      queryClient.setQueryData(AUTH_QUERY_KEYS.currentUser, data.user)

      // Invalidate to refresh
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.currentUser })
    },
    onError: () => {
      // Clear any cached user data on login error
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.currentUser })
      localStorage.removeItem('auth_token')
    },
  })
}

export const useRegister = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
      return apiClient.postWithoutAuth<AuthResponse>('/api/auth/local/register', credentials)
    },
    onSuccess: (data) => {
      // Store token
      localStorage.setItem('auth_token', data.jwt)

      // Set user data in cache
      queryClient.setQueryData(AUTH_QUERY_KEYS.currentUser, data.user)

      // Invalidate to refresh
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.currentUser })
    },
    onError: () => {
      // Clear any cached user data on register error
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.currentUser })
      localStorage.removeItem('auth_token')
    },
  })
}

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string): Promise<{ ok: boolean }> => {
      return apiClient.postWithoutAuth<{ ok: boolean }>('/api/user-management/forgot-password', { email })
    },
  })
}

export const useResetPassword = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      code: string
      password: string
      passwordConfirmation: string
    }): Promise<AuthResponse> => {
      return apiClient.postWithoutAuth<AuthResponse>('/api/auth/reset-password', data)
    },
    onSuccess: (data) => {
      // Store token
      localStorage.setItem('auth_token', data.jwt)

      // Set user data in cache
      queryClient.setQueryData(AUTH_QUERY_KEYS.currentUser, data.user)

      // Invalidate to refresh
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.currentUser })
    },
    onError: () => {
      // Clear any cached user data on reset error
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.currentUser })
      localStorage.removeItem('auth_token')
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      // No API call needed for logout in this implementation
      return Promise.resolve()
    },
    onSuccess: () => {
      // Clear token
      localStorage.removeItem('auth_token')

      // Clear all cached data
      queryClient.clear()
    },
  })
}

// Utility function to check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Date.now() / 1000
    return payload.exp < currentTime
  } catch {
    return true
  }
}

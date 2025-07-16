import { useQueryClient } from '@tanstack/react-query'
import React, { useCallback, useMemo } from 'react'
import { AUTH_QUERY_KEYS, useCurrentUser, type User } from '../hooks/api/useAuth'
import { useAuth } from '../hooks/useAuth'
import { UserContext, type UserContextType, type UserProfile } from './UserContextDefinition'

// Re-export types for convenience
export type { UserContextType, UserProfile }

interface UserProviderProps {
  children: React.ReactNode
}

// Transform User to UserProfile
const transformUserToUserProfile = (user: User): UserProfile => {
  return {
    ...user,
    createdAt: new Date().toISOString(), // Fallback if not provided by API
    updatedAt: new Date().toISOString(), // Fallback if not provided by API
    site: {
      ...user.site,
      theme: undefined, // Will be populated when needed
      contact_mail: undefined,
      contact_phone: undefined,
      address: undefined,
    }
  }
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  // Use the existing useCurrentUser hook to get /me data
  const {
    data: rawUser,
    isLoading: loading,
    error,
    refetch
  } = useCurrentUser(token)

  // Transform the raw user data to UserProfile format
  const user = useMemo(() => {
    return rawUser ? transformUserToUserProfile(rawUser) : null
  }, [rawUser])

  // Memoized computed values
  const fullName = useMemo(() => {
    if (!user) return ''
    return `${user.first_name} ${user.last_name}`.trim()
  }, [user])

  const initials = useMemo(() => {
    if (!user) return ''
    const firstInitial = user.first_name?.charAt(0)?.toUpperCase() || ''
    const lastInitial = user.last_name?.charAt(0)?.toUpperCase() || ''
    return `${firstInitial}${lastInitial}`
  }, [user])

  // Refresh user data from /me endpoint
  const refetchUser = useCallback(async () => {
    try {
      await refetch()
    } catch (error) {
      console.error('Error refetching user data:', error)
      throw error
    }
  }, [refetch])

  // Update user data optimistically (useful for immediate UI updates)
  const updateUser = useCallback((userData: Partial<UserProfile>) => {
    if (!user) return

    const updatedUser = { ...user, ...userData }

    // Update the cache optimistically
    queryClient.setQueryData(AUTH_QUERY_KEYS.currentUser, updatedUser)
  }, [user, queryClient])

  // Check if user has a specific role
  const hasRole = useCallback((role: UserProfile['municipality_role']) => {
    return user?.municipality_role === role
  }, [user])

  // Check if user belongs to a specific site
  const belongsToSite = useCallback((siteId: number) => {
    return user?.site?.id === siteId
  }, [user])

  const value: UserContextType = {
    user: user || null,
    loading,
    error: error as Error | null,
    refetchUser,
    updateUser,
    hasRole,
    belongsToSite,
    fullName,
    initials,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

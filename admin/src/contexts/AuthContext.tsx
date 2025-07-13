import React, { useEffect, useState } from 'react'
import { isTokenExpired, useCurrentUser, useLogin, useLogout } from '../hooks/api/useAuth'
import { AuthContext, type AuthContextType, type User } from './AuthContextDefinition'

// Re-export types for convenience
export type { AuthContextType, User }

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)

  // Use Tanstack Query hooks
  const { data: user, isLoading: isUserLoading, error: userError } = useCurrentUser(token)
  const loginMutation = useLogin()
  const logoutMutation = useLogout()

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')

    if (storedToken && !isTokenExpired(storedToken)) {
      setToken(storedToken)
    } else {
      // Token is invalid or expired, clear it
      localStorage.removeItem('auth_token')
    }

    setInitializing(false)
  }, [])

  // Handle token changes and user fetch errors
  useEffect(() => {
    if (userError && token) {
      // If there's an error fetching user data, clear the token
      localStorage.removeItem('auth_token')
      setToken(null)
    }
  }, [userError, token])

    const login = async (email: string, password: string): Promise<void> => {
    const result = await loginMutation.mutateAsync({
      identifier: email,
      password,
    })

    setToken(result.jwt)

    // Token is already stored by the mutation's onSuccess
  }

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync()
      setToken(null)
    } catch (error) {
      // Even if logout fails, clear local state
      console.error('Logout error:', error)
      localStorage.removeItem('auth_token')
      setToken(null)
    }
  }

  // Determine loading state
  const loading = initializing || isUserLoading || loginMutation.isPending || logoutMutation.isPending

  const value: AuthContextType = {
    user: user || null,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

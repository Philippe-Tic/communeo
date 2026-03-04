import { Loader2 } from 'lucide-react'
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface SuperAdminRouteProps {
  children: React.ReactNode
}

export const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth()

  // DEBUG temporaire — à supprimer après résolution
  console.log('[SuperAdminRoute]', { loading, isAuthenticated, user, role: user?.municipality_role })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.municipality_role !== 'super_admin') {
    console.log('[SuperAdminRoute] REDIRECT — municipality_role:', user?.municipality_role)
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

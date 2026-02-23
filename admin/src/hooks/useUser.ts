import React from 'react'
import { UserContext, type UserContextType } from '../contexts/UserContextDefinition'

// Hook to use the UserContext
export const useUser = (): UserContextType => {
  const context = React.useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// Additional helper hooks for common use cases
export const useUserRole = () => {
  const { user, hasRole } = useUser()
  return {
    role: user?.municipality_role,
    hasRole,
    isAdmin: hasRole('admin'),
    isEditor: hasRole('editor'),
  }
}

export const useUserSite = () => {
  const { user, belongsToSite } = useUser()
  return {
    site: user?.site,
    belongsToSite,
    siteId: user?.site?.id,
    siteName: user?.site?.name,
    siteSlug: user?.site?.slug,
  }
}

export const useUserProfile = () => {
  const { user, fullName, initials, updateUser, refetchUser } = useUser()
  return {
    user,
    fullName,
    initials,
    updateUser,
    refetchUser,
    email: user?.email,
    username: user?.username,
    firstName: user?.first_name,
    lastName: user?.last_name,
    isConfirmed: user?.confirmed || false,
    isBlocked: user?.blocked || false,
  }
}

// Hook to check if user can access site configuration
export const useCanManageSite = () => {
  const { hasRole } = useUserRole()
  const { siteId } = useUserSite()

  const canManageSite = Boolean(siteId) && hasRole('admin')
  const hasSite = Boolean(siteId)
  const canEditConfig = hasRole('admin')

  return {
    canManageSite,
    hasSite,
    canEditConfig,
    siteId,
  }
}

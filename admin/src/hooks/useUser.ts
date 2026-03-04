import React from 'react'
import { UserContext, type UserContextType } from '../contexts/UserContextDefinition'
import { useSiteContext } from '../contexts/SiteContext'

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
    isSuperAdmin: user?.municipality_role === 'super_admin',
    isAdmin: hasRole('admin'),
    isEditor: hasRole('editor'),
  }
}

export const useUserSite = () => {
  const { user, belongsToSite } = useUser()
  const { impersonatedSite, isImpersonating } = useSiteContext()

  const effectiveSite = isImpersonating ? impersonatedSite : user?.site

  return {
    site: effectiveSite,
    belongsToSite,
    siteId: effectiveSite?.id,
    siteName: effectiveSite?.name,
    siteSlug: effectiveSite?.slug,
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
  const { hasRole, isSuperAdmin } = useUserRole()
  const { siteId } = useUserSite()

  const hasSite = Boolean(siteId)
  const canManageSite = hasSite && (hasRole('admin') || isSuperAdmin)
  const canEditConfig = hasRole('admin') || isSuperAdmin

  return {
    canManageSite,
    hasSite,
    canEditConfig,
    siteId,
  }
}

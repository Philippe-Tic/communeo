import React, { createContext, useCallback, useContext, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export interface ImpersonatedSite {
  id: number
  documentId: string
  name: string
  slug: string
}

interface SiteContextType {
  impersonatedSite: ImpersonatedSite | null
  enterSite: (site: ImpersonatedSite) => void
  exitSite: () => void
  isImpersonating: boolean
}

const SiteContext = createContext<SiteContextType | undefined>(undefined)

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient()
  const [impersonatedSite, setImpersonatedSite] = useState<ImpersonatedSite | null>(() => {
    const stored = sessionStorage.getItem('impersonated_site')
    return stored ? JSON.parse(stored) : null
  })

  const enterSite = useCallback((site: ImpersonatedSite) => {
    setImpersonatedSite(site)
    sessionStorage.setItem('impersonated_site', JSON.stringify(site))
    queryClient.removeQueries()
  }, [queryClient])

  const exitSite = useCallback(() => {
    setImpersonatedSite(null)
    sessionStorage.removeItem('impersonated_site')
    queryClient.removeQueries()
  }, [queryClient])

  return (
    <SiteContext.Provider
      value={{
        impersonatedSite,
        enterSite,
        exitSite,
        isImpersonating: !!impersonatedSite,
      }}
    >
      {children}
    </SiteContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSiteContext = () => {
  const context = useContext(SiteContext)
  if (!context) {
    throw new Error('useSiteContext must be used within a SiteProvider')
  }
  return context
}

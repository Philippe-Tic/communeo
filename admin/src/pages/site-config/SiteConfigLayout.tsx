import { Outlet, useLocation } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../../components/common'
import { PageHeader } from '../../components/layout'
import { SiteConfigNav, SiteConfigMobileNav, SECTIONS } from '../../components/site-config'
import { useSite } from '../../hooks/api/useSites'
import { useCanManageSite, useUserSite } from '../../hooks/useUser'
import { useIsMobile } from '../../hooks/useIsMobile'

export function SiteConfigLayout() {
  const { site: userSite } = useUserSite()
  const { canEditConfig, hasSite } = useCanManageSite()
  const { data: site, isLoading, error } = useSite(userSite?.documentId || '')
  const isMobile = useIsMobile()
  const location = useLocation()

  if (!hasSite) {
    return <ErrorState title="Site non trouvé" message="Aucun site associé à votre compte" />
  }

  if (!canEditConfig) {
    return (
      <ErrorState
        title="Accès refusé"
        message="Seuls les maires et adjoints peuvent modifier la configuration du site"
      />
    )
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorState title="Erreur de chargement" message="Impossible de charger la configuration du site" />
  if (!site) return <ErrorState title="Site non trouvé" message="Aucune configuration de site disponible" />

  const currentKey = location.pathname.split('/').pop() || 'general'
  const currentSection = SECTIONS.find(s => s.key === currentKey)

  return (
    <div className="mx-auto w-full">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={currentSection?.label || 'Configuration du site'}
          subtitle="Paramètres du site"
          breadcrumbs={[
            { label: 'Site', href: '/site/general' },
            ...(currentSection ? [{ label: currentSection.label }] : []),
          ]}
        />

        {isMobile ? (
          <div className="flex flex-col gap-6">
            <SiteConfigMobileNav sections={SECTIONS} />
            <Outlet context={{ site }} />
          </div>
        ) : (
          <div className="flex gap-6">
            <SiteConfigNav sections={SECTIONS} />
            <div className="flex-1 flex flex-col gap-6">
              <Outlet context={{ site }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

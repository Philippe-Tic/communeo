import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useSite } from '../hooks/api/useSites'
import { useCanManageSite, useUserSite } from '../hooks/useUser'

export const SiteConfig = () => {
  const { site: userSite } = useUserSite()
  const { canEditConfig, hasSite } = useCanManageSite()
  const { data: site, isLoading, error } = useSite(userSite?.documentId || '')
  const navigate = useNavigate()

  if (!hasSite) {
    return <ErrorState title="Site non trouvé" message="Aucun site associé à votre compte" />
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorState title="Erreur de chargement" message="Impossible de charger la configuration du site" />
  if (!site) return <ErrorState title="Site non trouvé" message="Aucune configuration de site disponible" />

  return (
    <div className="mx-auto w-full">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Configuration du site"
          subtitle="Paramètres et informations du site"
          actions={canEditConfig ? [
            {
              label: "Modifier",
              onClick: () => navigate('/site/edit'),
              colorScheme: "blue"
            }
          ] : []}
        />

        {!canEditConfig && (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Information :</strong> Vous pouvez consulter la configuration mais seuls les administrateurs peuvent la modifier.
            </p>
          </div>
        )}

        {/* Informations générales */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Informations générales
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Nom du site
                </p>
                <p className="text-lg font-semibold">
                  {site.name}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Slug
                </p>
                <p className="text-lg">
                  {site.slug}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Email de contact
                </p>
                <p className="text-lg">
                  {site.contact_mail}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact et adresse */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Informations de contact
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {site.contact_phone && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Téléphone
                  </p>
                  <p className="text-lg">
                    {site.contact_phone}
                  </p>
                </div>
              )}

              {site.address && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Adresse
                  </p>
                  <p className="whitespace-pre-line text-lg">
                    {site.address}
                  </p>
                </div>
              )}
            </div>

            {(!site.contact_phone && !site.address) && (
              <p className="italic text-muted-foreground">
                Aucune information de contact additionnelle configurée
              </p>
            )}
          </div>
        </div>

        {/* Logo */}
        {site.logo && (
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                Logo du site
              </h2>

              <div>
                <img
                  src={site.logo.url}
                  alt={site.logo.alternativeText || `Logo de ${site.name}`}
                  className="max-h-[200px] rounded-md object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {/* Couleurs du thème */}
        {site.colors && (
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                Configuration des couleurs
              </h2>

              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Paramètres JSON des couleurs du thème
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm">
                  {JSON.stringify(site.colors, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Déploiement automatique */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Déploiement automatique
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">Statut</p>
                <Badge variant={site.auto_deploy_enabled ? 'default' : 'secondary'}>
                  {site.auto_deploy_enabled ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>
              {site.auto_deploy_enabled && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Délai</p>
                  <p className="text-lg">{site.auto_deploy_delay || 300} secondes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informations système */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Informations système
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Créé le
                </p>
                <p className="text-lg">
                  {new Date(site.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Modifié le
                </p>
                <p className="text-lg">
                  {new Date(site.updatedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  ID du site
                </p>
                <p className="font-mono text-lg">
                  {site.documentId}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

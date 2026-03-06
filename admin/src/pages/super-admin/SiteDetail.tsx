import { PageHeader } from '@/components/layout'
import { StatsCard } from '@/components/pages'
import { Badge } from '@/components/ui/badge'
import { useSiteContext } from '@/contexts/SiteContext'
import { useDeleteSiteManagement, useSiteManagementDetail } from '@/hooks/api/useSiteManagement'
import { USER_ROLE_COLORS, USER_ROLE_LABELS } from '@/lib/constants/user-types'
import { formatDate } from '@/lib/format'
import { Calendar, File, FileText, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

export const SiteDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { enterSite } = useSiteContext()
  const { data: site, isLoading } = useSiteManagementDetail(id || '')
  const deleteMutation = useDeleteSiteManagement()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    )
  }

  if (!site) {
    return <p className="py-12 text-center text-muted-foreground">Site non trouvé</p>
  }

  const handleEnter = () => {
    enterSite({ id: site.id, documentId: site.documentId, name: site.name, slug: site.slug })
    navigate('/dashboard')
  }

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer la mairie "${site.name}" ? Cette action est irréversible.`)) return
    await deleteMutation.mutateAsync(site.documentId)
    navigate('/super-admin/sites')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={site.name}
        subtitle={site.slug}
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin' },
          { label: 'Mairies', href: '/super-admin/sites' },
          { label: site.name },
        ]}
        actions={[
          { label: 'Accéder', onClick: handleEnter },
          { label: 'Supprimer', onClick: handleDelete, variant: 'outline', colorScheme: 'red', loading: deleteMutation.isPending },
        ]}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          label="Pages"
          value={site._stats?.pages ?? 0}
          color="blue"
          icon={<File className="h-5 w-5" />}
        />
        <StatsCard
          label="Actualités"
          value={site._stats?.articles ?? 0}
          color="green"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatsCard
          label="Evenements"
          value={site._stats?.events ?? 0}
          color="purple"
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* Site Info */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="mb-4 text-lg font-semibold">Informations</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Slug</dt>
            <dd className="font-medium">{site.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email contact</dt>
            <dd className="font-medium">{site.contact_mail || '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Netlify Site ID</dt>
            <dd className="font-mono text-xs">{site.netlify_site_id || '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Créé le</dt>
            <dd className="font-medium">{formatDate(site.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Users */}
      <div className="glass-card rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            <Users className="mr-2 inline-block h-5 w-5" />
            Utilisateurs ({site._users?.length ?? 0})
          </h2>
        </div>

        {site._users && site._users.length > 0 ? (
          <div className="divide-y">
            {site._users.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{user.first_name} {user.last_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={USER_ROLE_COLORS[user.municipality_role] || ''}>
                    {USER_ROLE_LABELS[user.municipality_role] || user.municipality_role}
                  </Badge>
                  {user.blocked && (
                    <Badge variant="outline" className="text-xs">Invitation</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-muted-foreground">Aucun utilisateur</p>
        )}
      </div>

      {/* Deployments */}
      {site._deployments && site._deployments.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Derniers déploiements</h2>
          <div className="divide-y">
            {site._deployments.map((dep: any) => (
              <div key={dep.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{formatDate(dep.createdAt)}</span>
                <Badge variant={dep.status === 'success' ? 'default' : dep.status === 'failed' ? 'destructive' : 'secondary'}>
                  {dep.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

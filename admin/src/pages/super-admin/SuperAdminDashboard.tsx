import { PageHeader } from '@/components/layout'
import { StatsCard } from '@/components/pages'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSiteManagementList, useSiteManagementStats } from '@/hooks/api/useSiteManagement'
import { formatDate } from '@/lib/format'
import { Building2, Plus, Rocket, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const SuperAdminDashboard = () => {
  const navigate = useNavigate()
  const { data: stats, isLoading: statsLoading } = useSiteManagementStats()
  const { data: sites, isLoading: sitesLoading } = useSiteManagementList()

  const recentSites = sites?.slice(0, 5) || []

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Super Admin"
        subtitle="Vue globale de la plateforme"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          label="Mairies"
          value={stats?.sites ?? 0}
          color="blue"
          icon={<Building2 className="h-5 w-5" />}
          isLoading={statsLoading}
        />
        <StatsCard
          label="Utilisateurs"
          value={stats?.users ?? 0}
          color="green"
          icon={<Users className="h-5 w-5" />}
          isLoading={statsLoading}
        />
        <StatsCard
          label="Deploiements (30j)"
          value={stats?.recentDeployments ?? 0}
          color="purple"
          icon={<Rocket className="h-5 w-5" />}
          isLoading={statsLoading}
        />
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mairies</h2>
          <Button size="sm" onClick={() => navigate('/super-admin/sites/new')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nouvelle mairie
          </Button>
        </div>

        {sitesLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-muted" />)}
          </div>
        ) : recentSites.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Aucune mairie</p>
        ) : (
          <div className="divide-y">
            {recentSites.map((site) => (
              <button
                key={site.documentId}
                onClick={() => navigate(`/super-admin/sites/${site.documentId}`)}
                className="flex w-full items-center justify-between px-2 py-3 text-left transition-colors hover:bg-accent/50"
              >
                <div>
                  <p className="font-medium">{site.name}</p>
                  <p className="text-sm text-muted-foreground">{site.slug}</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {site._stats && (
                    <span>{site._stats.users} utilisateur{site._stats.users !== 1 ? 's' : ''}</span>
                  )}
                  {site._stats?.lastDeployment && (
                    <Badge variant="secondary" className="text-xs">
                      {formatDate(site._stats.lastDeployment.createdAt)}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {sites && sites.length > 5 && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/sites')}>
              Voir toutes les mairies ({sites.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

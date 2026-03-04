import { PageHeader } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSiteContext } from '@/contexts/SiteContext'
import { useDeleteSiteManagement, useSiteManagementList } from '@/hooks/api/useSiteManagement'
import { formatDate } from '@/lib/format'
import { Building2, Eye, LogIn, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export const Sites = () => {
  const navigate = useNavigate()
  const { enterSite } = useSiteContext()
  const { data: sites, isLoading } = useSiteManagementList()
  const deleteMutation = useDeleteSiteManagement()
  const [search, setSearch] = useState('')

  const filteredSites = (sites || []).filter((site) => {
    if (!search) return true
    const s = search.toLowerCase()
    return site.name.toLowerCase().includes(s) || site.slug.toLowerCase().includes(s)
  })

  const handleEnterSite = (site: { id: number; documentId: string; name: string; slug: string }) => {
    enterSite(site)
    navigate('/dashboard')
  }

  const handleDelete = async (documentId: string, name: string) => {
    if (!window.confirm(`Supprimer la mairie "${name}" ? Cette action est irréversible et supprimera aussi le site Netlify et tous les utilisateurs associés.`)) {
      return
    }
    await deleteMutation.mutateAsync(documentId)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mairies"
        subtitle="Gestion de toutes les mairies de la plateforme"
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Mairies' }]}
        actions={[
          {
            label: 'Nouvelle mairie',
            onClick: () => navigate('/super-admin/sites/new'),
          },
        ]}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une mairie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="animate-pulse space-y-0 divide-y">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-muted/30" />)}
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Building2 className="h-10 w-10" />
            <p>{search ? 'Aucune mairie trouvée' : 'Aucune mairie'}</p>
            {!search && (
              <Button size="sm" onClick={() => navigate('/super-admin/sites/new')}>
                <Plus className="mr-1.5 h-4 w-4" />
                Créer la première mairie
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Mairie</th>
                <th className="hidden px-4 py-3 md:table-cell">Slug</th>
                <th className="hidden px-4 py-3 lg:table-cell">Utilisateurs</th>
                <th className="hidden px-4 py-3 lg:table-cell">Contenu</th>
                <th className="hidden px-4 py-3 md:table-cell">Dernier deploiement</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSites.map((site) => (
                <tr key={site.documentId} className="transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/super-admin/sites/${site.documentId}`)}
                      className="font-medium text-foreground hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      {site.name}
                    </button>
                    <p className="text-xs text-muted-foreground md:hidden">{site.slug}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{site.slug}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <Badge variant="secondary">{site._stats?.users ?? 0}</Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {site._stats ? `${site._stats.pages}p / ${site._stats.articles}a` : '-'}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {site._stats?.lastDeployment
                      ? formatDate(site._stats.lastDeployment.createdAt)
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/super-admin/sites/${site.documentId}`)}
                        title="Voir le détail"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEnterSite(site)}
                        title="Accéder à cette mairie"
                      >
                        <LogIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(site.documentId, site.name)}
                        disabled={deleteMutation.isPending}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

import { PageHeader } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSiteManagementList } from '@/hooks/api/useSiteManagement'
import { useSuperAdminUsers } from '@/hooks/api/useSuperAdminUsers'
import { useDeleteUser, useResendInvitation, useAdminResetPassword } from '@/hooks/api/useUsers'
import { USER_ROLE_COLORS, USER_ROLE_LABELS } from '@/lib/constants/user-types'
import { KeyRound, Mail, Search, Trash2, Users } from 'lucide-react'
import { useState } from 'react'

export const SuperAdminUsers = () => {
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState<string>('')

  const { data: sites } = useSiteManagementList()
  const { data: users, isLoading } = useSuperAdminUsers({
    site: siteFilter || undefined,
    search,
  })

  const deleteMutation = useDeleteUser()
  const resendMutation = useResendInvitation()
  const resetMutation = useAdminResetPassword()

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Supprimer l'utilisateur "${name}" ?`)) return
    await deleteMutation.mutateAsync(id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        subtitle="Gestion globale des utilisateurs de la plateforme"
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Utilisateurs' }]}
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Toutes les mairies</option>
          {sites?.map((site) => (
            <option key={site.documentId} value={site.documentId}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="animate-pulse space-y-0 divide-y">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-muted/30" />)}
          </div>
        ) : !users || users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Users className="h-10 w-10" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Utilisateur</th>
                <th className="hidden px-4 py-3 md:table-cell">Email</th>
                <th className="hidden px-4 py-3 lg:table-cell">Mairie</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="hidden px-4 py-3 md:table-cell">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{user.email}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {user.site ? (
                      <Badge variant="outline" className="text-xs">{user.site.name}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={USER_ROLE_COLORS[user.municipality_role] || ''}>
                      {USER_ROLE_LABELS[user.municipality_role] || user.municipality_role}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {user.blocked ? (
                      <Badge variant="outline" className="text-xs text-amber-600">Invitation</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-green-600">Actif</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {user.blocked ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => resendMutation.mutate(user.id)}
                          disabled={resendMutation.isPending}
                          title="Renvoyer l'invitation"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => resetMutation.mutate(user.id)}
                          disabled={resetMutation.isPending}
                          title="Réinitialiser le mot de passe"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(user.id, `${user.first_name} ${user.last_name}`)}
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

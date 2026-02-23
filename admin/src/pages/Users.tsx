import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/common'
import { FilterPanel, PageHeader } from '../components/layout'
import { useUsers, useDeleteUser, USER_ROLE_LABELS, USER_ROLE_COLORS, type SiteUser } from '../hooks/api/useUsers'
import { toaster } from '../lib/toaster'

export const Users = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<string, string>>({ search: '', role: '' })
  const [userToDelete, setUserToDelete] = useState<SiteUser | null>(null)

  const { data: users, isLoading, error } = useUsers({
    search: filters.search || undefined,
    role: filters.role || undefined,
  })
  const deleteMutation = useDeleteUser()

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    try {
      await deleteMutation.mutateAsync(userToDelete.id)
      toaster.create({ title: 'Utilisateur supprimé', description: `L'utilisateur "${userToDelete.username}" a été supprimé.`, type: 'success', duration: 3000 })
      setUserToDelete(null)
    } catch (error: any) {
      toaster.create({ title: 'Erreur', description: error?.message || 'Impossible de supprimer cet utilisateur.', type: 'error', duration: 5000 })
    }
  }

  const filterFields = [
    { key: 'search', label: 'Recherche', type: 'text' as const, placeholder: 'Rechercher un utilisateur...' },
    {
      key: 'role', label: 'Rôle', type: 'select' as const,
      options: [
        { value: 'admin', label: 'Administrateur' },
        { value: 'editor', label: 'Rédacteur' },
      ],
    },
  ]

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Utilisateurs"
          subtitle="Gérez les utilisateurs de votre site"
          actions={[{ label: 'Inviter un utilisateur', onClick: () => navigate('/users/new') }]}
        />

        <FilterPanel filters={filters} fields={filterFields} onChange={handleFilterChange} />

        {isLoading && <p className="text-center text-muted-foreground">Chargement...</p>}
        {error && <p className="text-center text-destructive">Erreur lors du chargement des utilisateurs.</p>}

        {users && users.length === 0 && !isLoading && (
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="text-lg font-medium">Aucun utilisateur trouvé</p>
            <p className="mt-1 text-sm text-muted-foreground">Commencez par créer un utilisateur.</p>
            <Button className="mt-4" onClick={() => navigate('/users/new')}>Inviter un utilisateur</Button>
          </div>
        )}

        {users && users.length > 0 && (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Nom</th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium sm:table-cell">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rôle</th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium md:table-cell">Statut</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/users/${user.id}`)} className="text-left hover:text-primary transition-colors">
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </button>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={USER_ROLE_COLORS[user.municipality_role] || ''}>
                        {USER_ROLE_LABELS[user.municipality_role] || user.municipality_role}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {user.blocked ? (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          Invitation en attente
                        </Badge>
                      ) : (
                        <Badge variant={user.active ? 'default' : 'secondary'}>
                          {user.active ? 'Actif' : 'Inactif'}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/users/${user.id}/edit`)}>Modifier</Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setUserToDelete(user)}>Supprimer</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmDialog
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDelete}
          title="Supprimer l'utilisateur"
          message={`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userToDelete?.first_name} ${userToDelete?.last_name}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}

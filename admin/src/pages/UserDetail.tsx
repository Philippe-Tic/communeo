import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useUser, useDeleteUser, USER_ROLE_LABELS, USER_ROLE_COLORS } from '../hooks/api/useUsers'
import { toaster } from '../lib/toaster'

export const UserDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: user, isLoading, error } = useUser(Number(id) || 0)
  const deleteMutation = useDeleteUser()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  if (isLoading) return <LoadingSpinner message="Chargement de l'utilisateur..." />
  if (error || !user) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Utilisateur non trouvé</p>
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(user.id)
      toaster.create({ title: 'Utilisateur supprimé', type: 'success', duration: 3000 })
      navigate('/users')
    } catch (error: any) {
      toaster.create({ title: 'Erreur', description: error?.message || 'Impossible de supprimer.', type: 'error', duration: 5000 })
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`${user.first_name} ${user.last_name}`}
          actions={[
            { label: 'Modifier', onClick: () => navigate(`/users/${user.id}/edit`) },
            { label: 'Supprimer', onClick: () => setShowDeleteDialog(true), variant: 'outline' as const, colorScheme: 'red' },
            { label: 'Retour', onClick: () => navigate('/users'), variant: 'outline' as const },
          ]}
          breadcrumbs={[
            { label: 'Utilisateurs', href: '/users' },
            { label: `${user.first_name} ${user.last_name}` },
          ]}
        />

        <div className="rounded-md border bg-card p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Nom d'utilisateur</p>
              <p className="font-medium">@{user.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prénom</p>
              <p className="font-medium">{user.first_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nom</p>
              <p className="font-medium">{user.last_name}</p>
            </div>
            {user.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Téléphone</p>
                <p className="font-medium">{user.phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Rôle</p>
              <Badge className={USER_ROLE_COLORS[user.municipality_role] || ''}>
                {USER_ROLE_LABELS[user.municipality_role] || user.municipality_role}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <Badge variant={user.active ? 'default' : 'secondary'}>
                {user.active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Créé le</p>
              <p className="text-sm">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </div>

        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Supprimer l'utilisateur"
          message={`Êtes-vous sûr de vouloir supprimer "${user.first_name} ${user.last_name}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}

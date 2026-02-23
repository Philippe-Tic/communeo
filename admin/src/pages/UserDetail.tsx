import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useUser, useDeleteUser, useResendInvitation, useAdminResetPassword, USER_ROLE_LABELS, USER_ROLE_COLORS } from '../hooks/api/useUsers'
import { toaster } from '../lib/toaster'

export const UserDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: user, isLoading, error } = useUser(Number(id) || 0)
  const deleteMutation = useDeleteUser()
  const resendMutation = useResendInvitation()
  const resetMutation = useAdminResetPassword()
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

  const handleResendInvitation = async () => {
    try {
      await resendMutation.mutateAsync(user.id)
      toaster.create({ title: 'Invitation renvoyée', description: "Un nouvel email d'invitation a été envoyé.", type: 'success', duration: 3000 })
    } catch (error: any) {
      toaster.create({ title: 'Erreur', description: error?.message || "Impossible de renvoyer l'invitation.", type: 'error', duration: 5000 })
    }
  }

  const handleResetPassword = async () => {
    try {
      await resetMutation.mutateAsync(user.id)
      toaster.create({ title: 'Email envoyé', description: 'Un email de réinitialisation de mot de passe a été envoyé.', type: 'success', duration: 3000 })
    } catch (error: any) {
      toaster.create({ title: 'Erreur', description: error?.message || "Impossible d'envoyer l'email.", type: 'error', duration: 5000 })
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
              {user.blocked ? (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Invitation en attente
                </Badge>
              ) : (
                <Badge variant={user.active ? 'default' : 'secondary'}>
                  {user.active ? 'Actif' : 'Inactif'}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Créé le</p>
              <p className="text-sm">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </div>

        {user.blocked && (
          <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Invitation en attente</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Cet utilisateur n'a pas encore activé son compte.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleResendInvitation}
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending ? 'Envoi...' : "Renvoyer l'invitation"}
            </Button>
          </div>
        )}

        {!user.blocked && (
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="font-medium">Mot de passe</p>
              <p className="text-sm text-muted-foreground">
                Envoyer un email pour réinitialiser le mot de passe.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleResetPassword}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? 'Envoi...' : 'Réinitialiser le mot de passe'}
            </Button>
          </div>
        )}

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

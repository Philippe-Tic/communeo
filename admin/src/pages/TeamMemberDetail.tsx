import { Badge } from '@/components/ui/badge'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useTeamMember, useDeleteTeamMember, ROLE_COLORS, ROLE_LABELS } from '../hooks/api/useTeamMembers'
import { toaster } from '../lib/toaster'

export function TeamMemberDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: member, isLoading, error } = useTeamMember(id || '')
  const deleteMutation = useDeleteTeamMember()

  const handleDelete = async () => {
    if (!member) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${member.first_name} ${member.last_name} ?`)) {
      try {
        await deleteMutation.mutateAsync(member.documentId)
        toaster.create({
          title: 'Membre supprimé',
          description: `${member.first_name} ${member.last_name} a été supprimé avec succès.`,
          type: 'success',
          duration: 3000,
        })
        navigate('/team-members')
      } catch {
        toaster.create({
          title: 'Erreur',
          description: 'Une erreur est survenue lors de la suppression.',
          type: 'error',
          duration: 5000,
        })
      }
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Chargement du membre..." />
  }

  if (error || !member) {
    return (
      <ErrorState
        title="Membre non trouvé"
        message="Le membre que vous recherchez n'existe pas ou n'a pas pu être chargé."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const headerActions = [
    {
      label: 'Retour',
      onClick: () => navigate('/team-members'),
      variant: 'outline' as const,
      colorScheme: 'gray',
    },
    {
      label: 'Modifier',
      onClick: () => navigate(`/team-members/${member.documentId}/edit`),
      colorScheme: 'blue',
    },
    {
      label: 'Supprimer',
      onClick: handleDelete,
      variant: 'outline' as const,
      colorScheme: 'red',
      loading: deleteMutation.isPending,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`${member.first_name} ${member.last_name}`}
          subtitle={ROLE_LABELS[member.role]}
          actions={headerActions}
          breadcrumbs={[
            { label: 'Équipe', href: '/team-members' },
            { label: `${member.first_name} ${member.last_name}` },
          ]}
        />

        <div className="rounded-md border bg-card p-6">
          <div className="flex flex-col gap-6">
            {/* Role badge */}
            <div className="flex flex-wrap gap-2">
              <Badge className={ROLE_COLORS[member.role] || ''}>
                {ROLE_LABELS[member.role] || member.role}
              </Badge>
            </div>

            {/* Photo */}
            {member.photo && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">Photo</p>
                <img
                  src={member.photo.url}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="max-h-[300px] rounded-md object-cover"
                />
              </div>
            )}

            {/* Delegation */}
            {member.delegation && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">Délégation</p>
                <p>{member.delegation}</p>
              </div>
            )}

            {/* Bio */}
            {member.bio && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">Biographie</p>
                <p className="whitespace-pre-line">{member.bio}</p>
              </div>
            )}

            {/* Info */}
            <div>
              <p className="mb-2 font-medium text-muted-foreground">Informations</p>
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">
                  Ordre d'affichage : {member.display_order}
                </p>
                <p className="text-sm text-muted-foreground">
                  Créé le : {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Modifié le : {new Date(member.updatedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

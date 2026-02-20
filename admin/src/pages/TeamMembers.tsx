import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/common'
import { DataGrid, FilterPanel, PageHeader } from '../components/layout'
import { TeamMemberCard } from '../components/pages'
import {
  useTeamMembers,
  useDeleteTeamMember,
  useReorderTeamMembers,
  type TeamMember,
  type TeamMemberRole,
} from '../hooks/api'
import { toaster } from '../lib/toaster'

export const TeamMembers = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    role: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null)

  const { data: membersData, isLoading, error } = useTeamMembers({
    page: currentPage,
    pageSize: 50,
    search: filters.search || undefined,
    role: filters.role !== '' ? filters.role as TeamMemberRole : undefined,
  })

  const deleteMutation = useDeleteTeamMember()
  const reorderMutation = useReorderTeamMembers()

  const members = membersData?.data || []

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleDeleteMember = async () => {
    if (!memberToDelete) return

    try {
      await deleteMutation.mutateAsync(memberToDelete.documentId)
      toaster.create({
        title: 'Membre supprimé',
        description: `${memberToDelete.first_name} ${memberToDelete.last_name} a été supprimé avec succès.`,
        type: 'success',
        duration: 3000,
      })
      setMemberToDelete(null)
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleMoveUp = async (member: TeamMember) => {
    const idx = members.findIndex(m => m.documentId === member.documentId)
    if (idx <= 0) return

    const prev = members[idx - 1]
    try {
      await reorderMutation.mutateAsync([
        { id: member.documentId, display_order: prev.display_order },
        { id: prev.documentId, display_order: member.display_order },
      ])
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du réordonnement.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleMoveDown = async (member: TeamMember) => {
    const idx = members.findIndex(m => m.documentId === member.documentId)
    if (idx < 0 || idx >= members.length - 1) return

    const next = members[idx + 1]
    try {
      await reorderMutation.mutateAsync([
        { id: member.documentId, display_order: next.display_order },
        { id: next.documentId, display_order: member.display_order },
      ])
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du réordonnement.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const filterFields = [
    {
      key: 'search',
      label: 'Recherche',
      type: 'text' as const,
      placeholder: 'Rechercher par nom...',
    },
    {
      key: 'role',
      label: 'Rôle',
      type: 'select' as const,
      options: [
        { value: 'maire', label: 'Maire' },
        { value: 'adjoint', label: 'Adjoint(e)' },
        { value: 'conseiller', label: 'Conseiller(e)' },
        { value: 'dgs', label: 'DGS' },
        { value: 'agent', label: 'Agent' },
      ],
    },
  ]

  const headerActions = [
    {
      label: 'Nouveau membre',
      onClick: () => navigate('/team-members/new'),
      colorScheme: 'blue',
    },
  ]

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Équipe municipale"
          subtitle="Gérez les membres de l'équipe municipale"
          actions={headerActions}
        />

        <FilterPanel
          filters={filters}
          fields={filterFields}
          onChange={handleFilterChange}
        />

        <DataGrid
          data={members}
          renderItem={(member: TeamMember, index: number) => (
            <TeamMemberCard
              member={member}
              onEdit={(m) => navigate(`/team-members/${m.documentId}/edit`)}
              onView={(m) => navigate(`/team-members/${m.documentId}`)}
              onDelete={setMemberToDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirst={index === 0}
              isLast={index === members.length - 1}
            />
          )}
          isLoading={isLoading}
          error={!!error}
          emptyTitle="Aucun membre trouvé"
          emptyDescription="Commencez par ajouter le premier membre de l'équipe"
          emptyActionLabel="Ajouter un membre"
          onEmptyAction={() => navigate('/team-members/new')}
          columns={{ base: 1, md: 2, lg: 3 }}
        />

        <ConfirmDialog
          isOpen={!!memberToDelete}
          onClose={() => setMemberToDelete(null)}
          onConfirm={handleDeleteMember}
          title="Supprimer le membre"
          message={`Êtes-vous sûr de vouloir supprimer ${memberToDelete?.first_name} ${memberToDelete?.last_name} ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/common'
import { DataGrid, FilterPanel, PageHeader } from '../components/layout'
import { AssociationCard } from '../components/pages'
import {
  useAssociations,
  useDeleteAssociation,
  type Association,
  type AssociationCategory,
  type AssociationStatus,
} from '../hooks/api'
import { toaster } from '../lib/toaster'

export const Associations = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    category: '',
    status: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [associationToDelete, setAssociationToDelete] = useState<Association | null>(null)

  const { data: associationsData, isLoading, error } = useAssociations({
    page: currentPage,
    pageSize: 50,
    search: filters.search || undefined,
    category: filters.category !== '' ? filters.category as AssociationCategory : undefined,
    status: filters.status !== '' ? filters.status as AssociationStatus : undefined,
  })

  const deleteMutation = useDeleteAssociation()

  const associations = associationsData?.data || []

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleDelete = async () => {
    if (!associationToDelete) return

    try {
      await deleteMutation.mutateAsync(associationToDelete.documentId)
      toaster.create({
        title: 'Association supprimée',
        description: `${associationToDelete.name} a été supprimée avec succès.`,
        type: 'success',
        duration: 3000,
      })
      setAssociationToDelete(null)
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
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
      key: 'category',
      label: 'Catégorie',
      type: 'select' as const,
      options: [
        { value: 'sport', label: 'Sport' },
        { value: 'culture', label: 'Culture' },
        { value: 'social', label: 'Social' },
        { value: 'environnement', label: 'Environnement' },
        { value: 'education', label: 'Éducation' },
        { value: 'autre', label: 'Autre' },
      ],
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: 'pending', label: 'En attente' },
        { value: 'published', label: 'Publiée' },
        { value: 'rejected', label: 'Rejetée' },
      ],
    },
  ]

  const headerActions = [
    {
      label: 'Nouvelle association',
      onClick: () => navigate('/associations/new'),
      colorScheme: 'blue',
    },
  ]

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Associations"
          subtitle="Gérez l'annuaire des associations de la commune"
          actions={headerActions}
        />

        <FilterPanel
          filters={filters}
          fields={filterFields}
          onChange={handleFilterChange}
        />

        <DataGrid
          data={associations}
          renderItem={(association: Association) => (
            <AssociationCard
              association={association}
              onEdit={(a) => navigate(`/associations/${a.documentId}/edit`)}
              onView={(a) => navigate(`/associations/${a.documentId}`)}
              onDelete={setAssociationToDelete}
            />
          )}
          isLoading={isLoading}
          error={!!error}
          emptyTitle="Aucune association trouvée"
          emptyDescription="Commencez par ajouter la première association"
          emptyActionLabel="Ajouter une association"
          onEmptyAction={() => navigate('/associations/new')}
          columns={{ base: 1, md: 2, lg: 3 }}
        />

        <ConfirmDialog
          isOpen={!!associationToDelete}
          onClose={() => setAssociationToDelete(null)}
          onConfirm={handleDelete}
          title="Supprimer l'association"
          message={`Êtes-vous sûr de vouloir supprimer "${associationToDelete?.name}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}

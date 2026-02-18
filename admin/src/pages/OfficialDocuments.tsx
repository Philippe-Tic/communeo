import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/common'
import { DataGrid, FilterPanel, PageHeader } from '../components/layout'
import { OfficialDocumentCard } from '../components/pages'
import {
  useArchiveOfficialDocument,
  useDeleteOfficialDocument,
  useOfficialDocuments,
  usePublishOfficialDocument,
  type OfficialDocument,
} from '../hooks/api'
import { toaster } from '../lib/toaster'

export const OfficialDocuments = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    status: '',
    document_type: '',
    year: '',
    sortBy: 'document_date',
    sortOrder: 'desc',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [docToDelete, setDocToDelete] = useState<OfficialDocument | null>(null)

  const { data: documentsData, isLoading, error } = useOfficialDocuments({
    page: currentPage,
    pageSize: 20,
    search: filters.search || undefined,
    status: filters.status !== '' ? filters.status as 'draft' | 'published' | 'archived' : undefined,
    document_type: filters.document_type || undefined,
    year: filters.year ? Number(filters.year) : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder as 'asc' | 'desc',
  })

  const deleteMutation = useDeleteOfficialDocument()
  const publishMutation = usePublishOfficialDocument()
  const archiveMutation = useArchiveOfficialDocument()

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleDelete = async () => {
    if (!docToDelete) return

    try {
      await deleteMutation.mutateAsync(docToDelete.documentId)
      toaster.create({
        title: 'Document supprimé',
        description: `Le document "${docToDelete.title}" a été supprimé avec succès.`,
        type: 'success',
        duration: 3000,
      })
      setDocToDelete(null)
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handlePublish = async (doc: OfficialDocument) => {
    try {
      await publishMutation.mutateAsync(doc.documentId)
      toaster.create({
        title: 'Document publié',
        description: `Le document "${doc.title}" a été publié avec succès.`,
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la publication.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleArchive = async (doc: OfficialDocument) => {
    try {
      await archiveMutation.mutateAsync(doc.documentId)
      toaster.create({
        title: 'Document archivé',
        description: `Le document "${doc.title}" a été archivé avec succès.`,
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: "Une erreur est survenue lors de l'archivage.",
        type: 'error',
        duration: 5000,
      })
    }
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }))

  const filterFields = [
    {
      key: 'search',
      label: 'Recherche',
      type: 'text' as const,
      placeholder: 'Rechercher un document...',
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: 'published', label: 'Publié' },
        { value: 'draft', label: 'Brouillon' },
        { value: 'archived', label: 'Archivé' },
      ],
    },
    {
      key: 'document_type',
      label: 'Type',
      type: 'select' as const,
      options: [
        { value: 'pv-conseil-municipal', label: 'PV de conseil municipal' },
        { value: 'deliberation', label: 'Délibération' },
        { value: 'arrete', label: 'Arrêté' },
        { value: 'plu', label: 'PLU' },
        { value: 'scot', label: 'SCoT' },
        { value: 'carte-communale', label: 'Carte communale' },
        { value: 'budget-primitif', label: 'Budget primitif' },
        { value: 'compte-administratif', label: 'Compte administratif' },
        { value: 'rapport-orientations-budgetaires', label: "Rapport d'orientations budgétaires" },
        { value: 'autre', label: 'Autre' },
      ],
    },
    {
      key: 'year',
      label: 'Année',
      type: 'select' as const,
      options: yearOptions,
    },
    {
      key: 'sortBy',
      label: 'Trier par',
      type: 'select' as const,
      options: [
        { value: 'document_date', label: 'Date du document' },
        { value: 'title', label: 'Titre' },
        { value: 'createdAt', label: 'Date de création' },
        { value: 'year', label: 'Année' },
      ],
    },
    {
      key: 'sortOrder',
      label: 'Ordre',
      type: 'select' as const,
      options: [
        { value: 'asc', label: 'Croissant' },
        { value: 'desc', label: 'Décroissant' },
      ],
    },
  ]

  const headerActions = [
    {
      label: 'Nouveau document',
      onClick: () => navigate('/documents/new'),
      colorScheme: 'blue',
    },
  ]

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Documents officiels"
          subtitle="Gérez les documents officiels de votre commune"
          actions={headerActions}
        />

        <FilterPanel
          filters={filters}
          fields={filterFields}
          onChange={handleFilterChange}
        />

        <DataGrid
          data={documentsData?.data || []}
          renderItem={(doc: OfficialDocument) => (
            <OfficialDocumentCard
              document={doc}
              onEdit={(doc) => navigate(`/documents/${doc.documentId}/edit`)}
              onView={(doc) => navigate(`/documents/${doc.documentId}`)}
              onDelete={setDocToDelete}
              onPublish={handlePublish}
              onArchive={handleArchive}
            />
          )}
          isLoading={isLoading}
          error={!!error}
          emptyTitle="Aucun document trouvé"
          emptyDescription="Commencez par ajouter votre premier document officiel"
          emptyActionLabel="Ajouter un document"
          onEmptyAction={() => navigate('/documents/new')}
          columns={{ base: 1, md: 2, lg: 3 }}
        />

        <ConfirmDialog
          isOpen={!!docToDelete}
          onClose={() => setDocToDelete(null)}
          onConfirm={handleDelete}
          title="Supprimer le document"
          message={`Êtes-vous sûr de vouloir supprimer le document "${docToDelete?.title}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}

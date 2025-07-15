import { Box, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/common'
import { DataGrid, FilterPanel, PageHeader } from '../components/layout'
import { PageCard } from '../components/pages'
import { useDeletePage, usePages, type Page } from '../hooks/api'
import { toaster } from '../lib/toaster'

export const Pages = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    status: '',
    sortBy: 'menu_order',
    sortOrder: 'asc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null)

  // API hooks
  const { data: pagesData, isLoading, error } = usePages({
    page: currentPage,
    pageSize: 20,
    search: filters.search || undefined,
    status: filters.status !== '' ? filters.status as 'draft' | 'published' | 'archived' : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder as 'asc' | 'desc'
  })

  const deleteMutation = useDeletePage()

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleDeletePage = async () => {
    if (!pageToDelete) return

    try {
      await deleteMutation.mutateAsync(pageToDelete.documentId)
      toaster.create({
        title: 'Page supprimée',
        description: `La page "${pageToDelete.title}" a été supprimée avec succès.`,
        type: 'success',
        duration: 3000,
      })
      setPageToDelete(null)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const openDeleteDialog = (page: Page) => {
    setPageToDelete(page)
  }

  const filterFields = [
    {
      key: 'search',
      label: 'Recherche',
      type: 'text' as const,
      placeholder: 'Rechercher une page...'
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: 'published', label: 'Publié' },
        { value: 'draft', label: 'Brouillon' },
        { value: 'archived', label: 'Archivé' }
      ]
    },
    {
      key: 'sortBy',
      label: 'Trier par',
      type: 'select' as const,
      options: [
        { value: 'title', label: 'Titre' },
        { value: 'updatedAt', label: 'Date de modification' },
        { value: 'menu_order', label: 'Ordre du menu' }
      ]
    },
    {
      key: 'sortOrder',
      label: 'Ordre',
      type: 'select' as const,
      options: [
        { value: 'asc', label: 'Croissant' },
        { value: 'desc', label: 'Décroissant' }
      ]
    }
  ]

  const headerActions = [
    {
      label: 'Nouvelle page',
      onClick: () => navigate('/pages/new'),
      colorScheme: 'blue'
    }
  ]

  return (
    <Box p={6}>
      <VStack align="stretch" gap={6}>
        <PageHeader
          title="Pages"
          subtitle="Gérez les pages de votre site"
          actions={headerActions}
        />

        <FilterPanel
          filters={filters}
          fields={filterFields}
          onChange={handleFilterChange}
        />

        <DataGrid
          data={pagesData?.data || []}
          renderItem={(page: Page) => (
            <PageCard
              page={page}
              onEdit={(page) => navigate(`/pages/${page.documentId}/edit`)}
              onView={(page) => navigate(`/pages/${page.documentId}`)}
              onDelete={openDeleteDialog}
            />
          )}
          isLoading={isLoading}
          error={!!error}
          emptyTitle="Aucune page trouvée"
          emptyDescription="Commencez par créer votre première page"
          emptyActionLabel="Créer une page"
          onEmptyAction={() => navigate('/pages/new')}
          columns={{ base: 1, md: 2, lg: 3 }}
        />

        <ConfirmDialog
          isOpen={!!pageToDelete}
          onClose={() => setPageToDelete(null)}
          onConfirm={handleDeletePage}
          title="Supprimer la page"
          message={`Êtes-vous sûr de vouloir supprimer la page "${pageToDelete?.title}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </VStack>
    </Box>
  )
}

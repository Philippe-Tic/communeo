import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/common'
import { DataGrid, FilterPanel, PageHeader } from '../components/layout'
import { ArticleCard } from '../components/pages'
import { useArticles, useDeleteArticle, usePublishArticle, useToggleArticleFeatured, useUnpublishArticle, type Article } from '../hooks/api'
import { toaster } from '../lib/toaster'

export const Articles = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    status: '',
    category: '',
    featured: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null)

  // API hooks
  const { data: articlesData, isLoading, error } = useArticles({
    page: currentPage,
    pageSize: 20,
    search: filters.search || undefined,
    status: filters.status !== '' ? filters.status as 'draft' | 'published' | 'archived' : undefined,
    category: filters.category !== '' ? filters.category as 'news' | 'event' | 'information' | 'emergency' : undefined,
    featured: filters.featured !== '' ? filters.featured === 'true' : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder as 'asc' | 'desc'
  })

  const deleteMutation = useDeleteArticle()
  const publishMutation = usePublishArticle()
  const unpublishMutation = useUnpublishArticle()
  const toggleFeaturedMutation = useToggleArticleFeatured()

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleDeleteArticle = async () => {
    if (!articleToDelete) return

    try {
      await deleteMutation.mutateAsync(articleToDelete.documentId)
      toaster.create({
        title: 'Article supprimé',
        description: `L'article "${articleToDelete.title}" a été supprimé avec succès.`,
        type: 'success',
        duration: 3000,
      })
      setArticleToDelete(null)
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

  const handlePublishArticle = async (article: Article) => {
    try {
      await publishMutation.mutateAsync(article.documentId)
      toaster.create({
        title: 'Article publié',
        description: `L'article "${article.title}" a été publié avec succès.`,
        type: 'success',
        duration: 3000,
      })
    } catch (error) {
      console.error('Erreur lors de la publication:', error)
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la publication.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleUnpublishArticle = async (article: Article) => {
    try {
      await unpublishMutation.mutateAsync(article.documentId)
      toaster.create({
        title: 'Article dépublié',
        description: `L'article "${article.title}" a été dépublié avec succès.`,
        type: 'success',
        duration: 3000,
      })
    } catch (error) {
      console.error('Erreur lors de la dépublication:', error)
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la dépublication.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleToggleFeatured = async (article: Article) => {
    try {
      await toggleFeaturedMutation.mutateAsync({
        documentId: article.documentId,
        featured: !article.featured
      })
      toaster.create({
        title: article.featured ? 'Article retiré de la une' : 'Article mis à la une',
        description: `L'article "${article.title}" a été ${article.featured ? 'retiré de la une' : 'mis à la une'}.`,
        type: 'success',
        duration: 3000,
      })
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la modification.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const openDeleteDialog = (article: Article) => {
    setArticleToDelete(article)
  }

  const filterFields = [
    {
      key: 'search',
      label: 'Recherche',
      type: 'text' as const,
      placeholder: 'Rechercher un article...'
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
      key: 'category',
      label: 'Catégorie',
      type: 'select' as const,
      options: [
        { value: 'news', label: 'Actualité' },
        { value: 'event', label: 'Événement' },
        { value: 'information', label: 'Information' },
        { value: 'emergency', label: 'Urgence' }
      ]
    },
    {
      key: 'featured',
      label: 'À la une',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Oui' },
        { value: 'false', label: 'Non' }
      ]
    },
    {
      key: 'sortBy',
      label: 'Trier par',
      type: 'select' as const,
      options: [
        { value: 'title', label: 'Titre' },
        { value: 'createdAt', label: 'Date de création' },
        { value: 'publication_date', label: 'Date de publication' },
        { value: 'view_count', label: 'Nombre de vues' }
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
      label: 'Nouvel article',
      onClick: () => navigate('/articles/new'),
      colorScheme: 'blue'
    }
  ]

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Articles"
          subtitle="Gérez les articles de votre site"
          actions={headerActions}
        />

        <FilterPanel
          filters={filters}
          fields={filterFields}
          onChange={handleFilterChange}
        />

        <DataGrid
          data={articlesData?.data || []}
          renderItem={(article: Article) => (
            <ArticleCard
              article={article}
              onEdit={(article) => navigate(`/articles/${article.documentId}/edit`)}
              onView={(article) => navigate(`/articles/${article.documentId}`)}
              onDelete={openDeleteDialog}
              onToggleFeatured={handleToggleFeatured}
              onPublish={handlePublishArticle}
              onUnpublish={handleUnpublishArticle}
            />
          )}
          isLoading={isLoading}
          error={!!error}
          emptyTitle="Aucun article trouvé"
          emptyDescription="Commencez par créer votre premier article"
          emptyActionLabel="Créer un article"
          onEmptyAction={() => navigate('/articles/new')}
          columns={{ base: 1, md: 2, lg: 3 }}
        />

        <ConfirmDialog
          isOpen={!!articleToDelete}
          onClose={() => setArticleToDelete(null)}
          onConfirm={handleDeleteArticle}
          title="Supprimer l'article"
          message={`Êtes-vous sûr de vouloir supprimer l'article "${articleToDelete?.title}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}

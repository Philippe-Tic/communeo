import { Badge } from '@/components/ui/badge'
import { ARTICLE_CATEGORY_COLORS, ARTICLE_CATEGORY_LABELS } from '@/lib/constants/article-types'
import { formatDate } from '@/lib/format'
import { Star } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { CategoryBadge, ErrorState, LoadingSpinner, StatusBadge } from '../components/common'
import { PageHeader } from '../components/layout'
import { useArticle, useDeleteArticle, useToggleArticleFeatured } from '../hooks/api/useArticles'
import { toaster } from '../lib/toaster'

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: article, isLoading, error } = useArticle(id || '')
  const deleteArticleMutation = useDeleteArticle()
  const toggleFeaturedMutation = useToggleArticleFeatured()

  const handleDelete = async () => {
    if (!article) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'article "${article.title}" ?`)) {
      try {
        await deleteArticleMutation.mutateAsync(article.documentId)
        toaster.create({
          title: 'Article supprimé',
          description: `L'article "${article.title}" a été supprimé avec succès.`,
          type: 'success',
          duration: 3000,
        })
        navigate('/articles')
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
  }

  const handleToggleFeatured = async () => {
    if (!article) return

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

  if (isLoading) {
    return <LoadingSpinner message="Chargement de l'article..." />
  }

  if (error || !article) {
    return (
      <ErrorState
        title="Article non trouvé"
        message="L'article que vous recherchez n'existe pas ou n'a pas pu être chargé."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const headerActions = [
    {
      label: 'Retour',
      onClick: () => navigate('/articles'),
      variant: 'outline' as const,
      colorScheme: 'gray'
    },
    {
      label: article.featured ? 'Retirer de la une' : 'Mettre à la une',
      onClick: handleToggleFeatured,
      variant: 'outline' as const,
      colorScheme: 'orange',
      loading: toggleFeaturedMutation.isPending
    },
    {
      label: 'Modifier',
      onClick: () => navigate(`/articles/${article.documentId}/edit`),
      colorScheme: 'blue'
    },
    {
      label: 'Supprimer',
      onClick: handleDelete,
      variant: 'outline' as const,
      colorScheme: 'red',
      loading: deleteArticleMutation.isPending
    }
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={article.title}
          subtitle={`/${article.slug}`}
          actions={headerActions}
          breadcrumbs={[
            { label: 'Articles', href: '/articles' },
            { label: article.title },
          ]}
        />

        <div className="rounded-md border bg-card p-6">
          <div className="flex flex-col gap-6">
            {/* Status and badges */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={article.status} />
              <CategoryBadge value={article.category} labels={ARTICLE_CATEGORY_LABELS} colors={ARTICLE_CATEGORY_COLORS} />
              {article.featured && (
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  <Star className="mr-1 inline h-3 w-3" /> À la une
                </Badge>
              )}
            </div>

            {/* Featured image */}
            {article.image && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">
                  Image à la une
                </p>
                <img
                  src={article.image.url}
                  alt={article.image.alternativeText || article.title}
                  className="max-h-[300px] rounded-md object-cover"
                />
              </div>
            )}

            {/* Summary */}
            {article.summary && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">
                  Résumé
                </p>
                <p>{article.summary}</p>
              </div>
            )}

            {/* Meta description */}
            {article.meta_description && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">
                  Description SEO
                </p>
                <p className="text-sm text-muted-foreground">{article.meta_description}</p>
              </div>
            )}

            {/* Content */}
            <div>
              <p className="mb-2 font-medium text-muted-foreground">
                Contenu
              </p>
              <div
                className="rounded-md border bg-muted/50 p-4"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>

            {/* Article info */}
            <div>
              <p className="mb-2 font-medium text-muted-foreground">
                Informations
              </p>
              <div className="flex flex-col items-start gap-2">
                {article.author && (
                  <p className="text-sm text-muted-foreground">
                    Auteur: {article.author}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Vues: {article.view_count}
                </p>
                <p className="text-sm text-muted-foreground">
                  Créé le: {formatDate(article.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Modifié le: {formatDate(article.updatedAt)}
                </p>
                {article.publication_date && (
                  <p className="text-sm text-muted-foreground">
                    Publié le: {formatDate(article.publication_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

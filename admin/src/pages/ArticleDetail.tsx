import { Badge, Box, HStack, Image, Text, VStack } from '@chakra-ui/react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingSpinner, StatusBadge } from '../components/common'
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'news': return 'blue'
      case 'event': return 'purple'
      case 'information': return 'green'
      case 'emergency': return 'red'
      default: return 'gray'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'news': return 'Actualité'
      case 'event': return 'Événement'
      case 'information': return 'Information'
      case 'emergency': return 'Urgence'
      default: return category
    }
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
    <Box maxWidth="4xl" mx="auto" p={6}>
      <VStack gap={6} align="stretch">
        <PageHeader
          title={article.title}
          subtitle={`/${article.slug}`}
          actions={headerActions}
        />

        <Box p={6} borderWidth={1} borderRadius="md" bg="white">
          <VStack gap={6} align="stretch">
            {/* Status and badges */}
            <HStack wrap="wrap" gap={2}>
              <StatusBadge status={article.status} />
              <Badge colorScheme={getCategoryColor(article.category)} size="sm">
                {getCategoryLabel(article.category)}
              </Badge>
              {article.featured && (
                <Badge colorScheme="orange" size="sm">
                  ⭐ À la une
                </Badge>
              )}
            </HStack>

            {/* Featured image */}
            {article.image && (
              <Box>
                <Text fontWeight="medium" color="gray.600" mb={2}>
                  Image à la une
                </Text>
                <Image
                  src={article.image.url}
                  alt={article.image.alternativeText || article.title}
                  maxH="300px"
                  borderRadius="md"
                  objectFit="cover"
                />
              </Box>
            )}

            {/* Summary */}
            {article.summary && (
              <Box>
                <Text fontWeight="medium" color="gray.600" mb={2}>
                  Résumé
                </Text>
                <Text>{article.summary}</Text>
              </Box>
            )}

            {/* Meta description */}
            {article.meta_description && (
              <Box>
                <Text fontWeight="medium" color="gray.600" mb={2}>
                  Description SEO
                </Text>
                <Text fontSize="sm" color="gray.600">{article.meta_description}</Text>
              </Box>
            )}

            {/* Content */}
            <Box>
              <Text fontWeight="medium" color="gray.600" mb={2}>
                Contenu
              </Text>
              <Box
                p={4}
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
                bg="gray.50"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </Box>

            {/* Article info */}
            <Box>
              <Text fontWeight="medium" color="gray.600" mb={2}>
                Informations
              </Text>
              <VStack gap={2} align="start">
                {article.author && (
                  <Text fontSize="sm" color="gray.600">
                    Auteur: {article.author}
                  </Text>
                )}
                <Text fontSize="sm" color="gray.600">
                  Vues: {article.view_count}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Créé le: {new Date(article.createdAt).toLocaleDateString('fr-FR')}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Modifié le: {new Date(article.updatedAt).toLocaleDateString('fr-FR')}
                </Text>
                {article.publication_date && (
                  <Text fontSize="sm" color="gray.600">
                    Publié le: {new Date(article.publication_date).toLocaleDateString('fr-FR')}
                  </Text>
                )}
                <Text fontSize="sm" color="gray.600">
                  Site: {article.site.name}
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}

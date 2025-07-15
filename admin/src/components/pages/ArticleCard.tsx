import { Badge, Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Article } from '../../hooks/api/useArticles'
import { StatusBadge } from '../common'

interface ArticleCardProps {
  article: Article
  onEdit: (article: Article) => void
  onView: (article: Article) => void
  onDelete: (article: Article) => void
  onToggleFeatured?: (article: Article) => void
  onPublish?: (article: Article) => void
  onUnpublish?: (article: Article) => void
}

export const ArticleCard = ({
  article,
  onEdit,
  onView,
  onDelete,
  onToggleFeatured,
  onPublish,
  onUnpublish
}: ArticleCardProps) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  return (
    <Box
      borderWidth={1}
      borderRadius="md"
      p={4}
      bg="white"
      h="full"
      _hover={{ shadow: 'md' }}
      transition="all 0.2s"
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <VStack align="start" gap={2} mb={3}>
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
        <Heading size="md" lineHeight="shorter">
          {article.title}
        </Heading>
      </VStack>

      {/* Body */}
      <VStack align="start" gap={3} flex={1}>
        {article.image && (
          <Box
            w="full"
            h="120px"
            bg="gray.100"
            borderRadius="md"
            backgroundImage={`url(${article.image.url})`}
            backgroundSize="cover"
            backgroundPosition="center"
          />
        )}

        {article.summary && (
          <Text fontSize="sm" color="gray.600" lineHeight="base">
            {article.summary}
          </Text>
        )}

        <VStack align="start" gap={1} fontSize="xs" color="gray.500" w="full">
          <HStack justify="space-between" w="full">
            <Text>
              Vues: {article.view_count}
            </Text>
            {article.author && (
              <Text>
                Par: {article.author}
              </Text>
            )}
          </HStack>
          <Text>
            Créé: {formatDate(article.createdAt)}
          </Text>
          {article.publication_date && (
            <Text>
              Publié: {formatDate(article.publication_date)}
            </Text>
          )}
        </VStack>
      </VStack>

      {/* Footer Actions */}
      <VStack gap={2} mt={4}>
        <HStack w="full" justify="space-between">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(article)}
          >
            Voir
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            onClick={() => onEdit(article)}
          >
            Modifier
          </Button>
        </HStack>

        <HStack w="full" gap={1} flexWrap="wrap">
          {onToggleFeatured && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onToggleFeatured(article)}
              title={article.featured ? 'Retirer de la une' : 'Mettre à la une'}
            >
              {article.featured ? '⭐' : '☆'}
            </Button>
          )}
          {onPublish && article.status !== 'published' && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onPublish(article)}
              title="Publier"
            >
              📤
            </Button>
          )}
          {onUnpublish && article.status === 'published' && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onUnpublish(article)}
              title="Dépublier"
            >
              📥
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onDelete(article)}
            color="red.500"
            title="Supprimer"
          >
            🗑️
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}

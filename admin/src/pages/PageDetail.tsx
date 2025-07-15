import { Box, Text, VStack } from '@chakra-ui/react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingSpinner, StatusBadge } from '../components/common'
import { PageHeader } from '../components/layout'
import { useDeletePage, usePage } from '../hooks/api/usePages'
import { toaster } from '../lib/toaster'

export function PageDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: page, isLoading, error } = usePage(id || '')
  const deletePageMutation = useDeletePage()

  const handleDelete = async () => {
    if (!page) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la page "${page.title}" ?`)) {
      try {
        await deletePageMutation.mutateAsync(page.documentId)
        toaster.create({
          title: 'Page supprimée',
          description: `La page "${page.title}" a été supprimée avec succès.`,
          type: 'success',
          duration: 3000,
        })
        navigate('/pages')
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

  if (isLoading) {
    return <LoadingSpinner message="Chargement de la page..." />
  }

  if (error || !page) {
    return (
      <ErrorState
        title="Page non trouvée"
        message="La page que vous recherchez n'existe pas ou n'a pas pu être chargée."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const headerActions = [
    {
      label: 'Retour',
      onClick: () => navigate('/pages'),
      variant: 'outline' as const,
      colorScheme: 'gray'
    },
    {
      label: 'Modifier',
      onClick: () => navigate(`/pages/${page.documentId}/edit`),
      colorScheme: 'blue'
    },
    {
      label: 'Supprimer',
      onClick: handleDelete,
      variant: 'outline' as const,
      colorScheme: 'red',
      loading: deletePageMutation.isPending
    }
  ]

  return (
    <Box maxWidth="4xl" mx="auto" p={6}>
      <VStack gap={6} align="stretch">
        <PageHeader
          title={page.title}
          subtitle={`/${page.slug}`}
          actions={headerActions}
        />

        <Box p={6} borderWidth={1} borderRadius="md" bg="white">
          <VStack gap={4} align="stretch">
            <Box>
              <Text fontWeight="medium" color="gray.600" mb={2}>
                Statut
              </Text>
              <StatusBadge status={page.status} />
            </Box>

            {page.meta_description && (
              <Box>
                <Text fontWeight="medium" color="gray.600" mb={2}>
                  Description
                </Text>
                <Text>{page.meta_description}</Text>
              </Box>
            )}

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
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            </Box>

            <Box>
              <Text fontWeight="medium" color="gray.600" mb={2}>
                Informations
              </Text>
              <VStack gap={2} align="start">
                <Text fontSize="sm" color="gray.600">
                  Créé le: {new Date(page.createdAt).toLocaleDateString('fr-FR')}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Modifié le: {new Date(page.updatedAt).toLocaleDateString('fr-FR')}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Ordre du menu: {page.menu_order}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Template: {page.template}
                </Text>
                {page.is_homepage && (
                  <Text fontSize="sm" color="blue.600" fontWeight="medium">
                    ✓ Page d'accueil
                  </Text>
                )}
              </VStack>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}

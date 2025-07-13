import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDeletePage, usePage } from '../hooks/api/usePages'
import { toaster } from '../lib/toaster'

export function PageDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: page, isLoading, error } = usePage(parseInt(id || ''))
  const deletePageMutation = useDeletePage()

  const handleDelete = async () => {
    if (!page) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la page "${page.title}" ?`)) {
      try {
        await deletePageMutation.mutateAsync(page.id)
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
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="lg" />
      </Box>
    )
  }

  if (error || !page) {
    return (
      <Box p={6}>
        <Text color="red.500">Erreur lors du chargement de la page</Text>
      </Box>
    )
  }

  return (
    <Box maxWidth="4xl" mx="auto" p={6}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Heading size="lg">{page.title}</Heading>
          <HStack>
            <Button
              variant="outline"
              onClick={() => navigate('/pages')}
            >
              Retour
            </Button>
            <Button
              onClick={() => navigate(`/pages/${page.id}/edit`)}
            >
              Modifier
            </Button>
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleDelete}
              loading={deletePageMutation.isPending}
            >
              Supprimer
            </Button>
          </HStack>
        </HStack>

        <Stack gap={6}>
          <Box>
            <Heading size="md" mb={4}>Informations générales</Heading>
            <Stack gap={3}>
              <HStack>
                <Text fontWeight="medium" minW="120px">Statut:</Text>
                <Badge colorScheme={page.status === 'published' ? 'green' : page.status === 'draft' ? 'yellow' : 'gray'}>
                  {page.status === 'published' ? 'Publié' : page.status === 'draft' ? 'Brouillon' : 'Archivé'}
                </Badge>
              </HStack>
              <HStack>
                <Text fontWeight="medium" minW="120px">Slug:</Text>
                <Text>{page.slug}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium" minW="120px">Template:</Text>
                <Text>{page.template || 'default'}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium" minW="120px">Ordre menu:</Text>
                <Text>{page.menu_order}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium" minW="120px">Page d'accueil:</Text>
                <Badge colorScheme={page.is_homepage ? 'green' : 'gray'}>
                  {page.is_homepage ? 'Oui' : 'Non'}
                </Badge>
              </HStack>
              <HStack>
                <Text fontWeight="medium" minW="120px">Créé le:</Text>
                <Text>{new Date(page.createdAt).toLocaleDateString()}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium" minW="120px">Mis à jour le:</Text>
                <Text>{new Date(page.updatedAt).toLocaleDateString()}</Text>
              </HStack>
            </Stack>
          </Box>

          <Box>
            <Heading size="md" mb={4}>Contenu</Heading>
            <Box
              p={4}
              bg="gray.50"
              rounded="md"
              whiteSpace="pre-wrap"
              maxH="400px"
              overflowY="auto"
            >
              {page.content}
            </Box>
          </Box>

          {(page.seo_title || page.seo_description) && (
            <Box>
              <Heading size="md" mb={4}>SEO</Heading>
              <Stack gap={3}>
                {page.seo_title && (
                  <HStack>
                    <Text fontWeight="medium" minW="120px">Titre SEO:</Text>
                    <Text>{page.seo_title}</Text>
                  </HStack>
                )}
                {page.seo_description && (
                  <HStack>
                    <Text fontWeight="medium" minW="120px">Description SEO:</Text>
                    <Text>{page.seo_description}</Text>
                  </HStack>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      </VStack>
    </Box>
  )
}

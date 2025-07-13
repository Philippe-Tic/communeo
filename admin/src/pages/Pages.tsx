import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Input,
  Spinner,
  Stack,
  Text,
  VStack
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useDeletePage,
  usePages,
  usePublishPage,
  useSetHomepage,
  useUnpublishPage,
  type Page
} from '../hooks/api'
import { toaster } from '../lib/toaster'

// Icons (vous pouvez les remplacer par vos icônes préférées)
const AddIcon = () => <span>+</span>
const EditIcon = () => <span>✏️</span>
const DeleteIcon = () => <span>🗑️</span>
const PublishIcon = () => <span>📢</span>
const UnpublishIcon = () => <span>📝</span>
const HomeIcon = () => <span>🏠</span>
const EyeIcon = () => <span>👁️</span>
const MoreIcon = () => <span>⋮</span>

interface PageFilters {
  search: string
  status: 'all' | 'draft' | 'published' | 'archived'
  sortBy: 'title' | 'updatedAt' | 'menu_order'
  sortOrder: 'asc' | 'desc'
}

interface PageCardProps {
  page: Page
  onEdit: (page: Page) => void
  onView: (page: Page) => void
  onDelete: (page: Page) => void
  onPublishToggle: (page: Page) => void
  onSetHomepage: (page: Page) => void
}

const PageCard: React.FC<PageCardProps> = ({
  page,
  onEdit,
  onView,
  onDelete,
  onPublishToggle,
  onSetHomepage
}) => {
  const [showActions, setShowActions] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'green'
      case 'draft':
        return 'yellow'
      case 'archived':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Publié'
      case 'draft':
        return 'Brouillon'
      case 'archived':
        return 'Archivé'
      default:
        return status
    }
  }

  return (
    <Box p={4} shadow="sm" borderWidth={1} borderRadius="md" bg="white" position="relative">
      <VStack align="stretch" gap={3}>
        <Flex justify="space-between" align="start">
          <VStack align="start" flex={1} gap={1}>
            <Text fontWeight="bold" fontSize="md">
              {page.title}
            </Text>
            <Text fontSize="sm" color="gray.500">
              /{page.slug}
            </Text>
            <HStack gap={2}>
              <Badge colorScheme={getStatusColor(page.status)} size="sm">
                {getStatusText(page.status)}
              </Badge>
              {page.is_homepage && (
                <Badge colorScheme="blue" size="sm">
                  Accueil
                </Badge>
              )}
            </HStack>
          </VStack>
          <Box position="relative">
            <IconButton
              aria-label="Plus d'actions"
              size="sm"
              variant="ghost"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreIcon />
            </IconButton>
            {showActions && (
              <Box
                position="absolute"
                top="100%"
                right={0}
                mt={1}
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
                shadow="lg"
                p={2}
                zIndex={10}
                minW="200px"
              >
                <Stack gap={1}>
                  <Button
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => {
                      onEdit(page)
                      setShowActions(false)
                    }}
                    display="flex"
                    alignItems="center"
                    gap={2}
                  >
                    <EditIcon />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => {
                      onView(page)
                      setShowActions(false)
                    }}
                    display="flex"
                    alignItems="center"
                    gap={2}
                  >
                    <EyeIcon />
                    Voir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => {
                      onPublishToggle(page)
                      setShowActions(false)
                    }}
                    display="flex"
                    alignItems="center"
                    gap={2}
                  >
                    {page.status === 'published' ? <UnpublishIcon /> : <PublishIcon />}
                    {page.status === 'published' ? 'Dépublier' : 'Publier'}
                  </Button>
                  {!page.is_homepage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      justifyContent="flex-start"
                      onClick={() => {
                        onSetHomepage(page)
                        setShowActions(false)
                      }}
                      display="flex"
                      alignItems="center"
                      gap={2}
                    >
                      <HomeIcon />
                      Définir comme page d'accueil
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    colorScheme="red"
                    onClick={() => {
                      onDelete(page)
                      setShowActions(false)
                    }}
                    display="flex"
                    alignItems="center"
                    gap={2}
                  >
                    <DeleteIcon />
                    Supprimer
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        </Flex>
        <Text fontSize="sm" color="gray.500">
          Modifié le {new Date(page.updatedAt).toLocaleDateString('fr-FR')}
        </Text>
      </VStack>
      {/* Overlay to close dropdown when clicking outside */}
      {showActions && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          onClick={() => setShowActions(false)}
          zIndex={5}
        />
      )}
    </Box>
  )
}

export const Pages: React.FC = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<PageFilters>({
    search: '',
    status: 'all',
    sortBy: 'menu_order',
    sortOrder: 'asc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // API hooks
  const { data: pagesData, isLoading, error } = usePages({
    page: currentPage,
    pageSize: 20,
    search: filters.search || undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  })

  const deleteMutation = useDeletePage()
  const publishMutation = usePublishPage()
  const unpublishMutation = useUnpublishPage()
  const setHomepageMutation = useSetHomepage()

  const handleFilterChange = (key: keyof PageFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleDeletePage = async (page: Page) => {
    try {
      await deleteMutation.mutateAsync(page.id)
      toaster.create({
        title: 'Page supprimée',
        description: `La page "${page.title}" a été supprimée avec succès.`,
        type: 'success',
        duration: 3000,
      })
      setShowDeleteModal(false)
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

  const handlePublishToggle = async (page: Page) => {
    try {
      if (page.status === 'published') {
        await unpublishMutation.mutateAsync(page.id)
        toaster.create({
          title: 'Page dépubliée',
          description: `La page "${page.title}" a été dépubliée.`,
          type: 'info',
          duration: 3000,
        })
      } else {
        await publishMutation.mutateAsync(page.id)
        toaster.create({
          title: 'Page publiée',
          description: `La page "${page.title}" a été publiée.`,
          type: 'success',
          duration: 3000,
        })
      }
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de modifier le statut de la page.',
        type: 'error',
        duration: 3000,
      })
    }
  }

  const handleSetHomepage = async (page: Page) => {
    try {
      await setHomepageMutation.mutateAsync(page.id)
      toaster.create({
        title: 'Page d\'accueil définie',
        description: `"${page.title}" est maintenant la page d'accueil.`,
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de définir cette page comme page d\'accueil.',
        type: 'error',
        duration: 3000,
      })
    }
  }

  const openDeleteDialog = (page: Page) => {
    setPageToDelete(page)
    setShowDeleteModal(true)
  }

  if (error) {
    return (
      <Box p={6}>
        <Box p={6} borderColor="red.200" borderWidth={1} borderRadius="md" bg="red.50">
          <VStack>
            <Text color="red.500" fontSize="lg" fontWeight="bold">
              Erreur de chargement
            </Text>
            <Text color="red.600">
              Impossible de charger les pages. Veuillez réessayer.
            </Text>
          </VStack>
        </Box>
      </Box>
    )
  }

  return (
    <Box p={6}>
      <VStack align="stretch" gap={6}>
        {/* Header */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="lg" mb={2}>
              Pages
            </Heading>
            <Text color="gray.600">
              Gérez les pages de votre site
            </Text>
          </Box>
          <Button
            colorScheme="blue"
            onClick={() => navigate('/pages/new')}
            size={{ base: 'md', md: 'lg' }}
            display="flex"
            alignItems="center"
            gap={2}
          >
            <AddIcon />
            Nouvelle page
          </Button>
        </Flex>

        {/* Filters */}
        <Box p={4} borderWidth={1} borderRadius="md" bg="white">
          <Grid
            templateColumns={{
              base: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(4, 1fr)'
            }}
            gap={4}
          >
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Recherche
              </Text>
              <Input
                placeholder="Rechercher une page..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Statut
              </Text>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0',
                  width: '100%'
                }}
              >
                <option value="all">Tous les statuts</option>
                <option value="published">Publié</option>
                <option value="draft">Brouillon</option>
                <option value="archived">Archivé</option>
              </select>
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Trier par
              </Text>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0',
                  width: '100%'
                }}
              >
                <option value="menu_order">Ordre du menu</option>
                <option value="title">Titre</option>
                <option value="updatedAt">Date de modification</option>
              </select>
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Ordre
              </Text>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0',
                  width: '100%'
                }}
              >
                <option value="asc">Croissant</option>
                <option value="desc">Décroissant</option>
              </select>
            </Box>
          </Grid>
        </Box>

        {/* Content */}
        <Box p={4} borderWidth={1} borderRadius="md" bg="white">
          {isLoading ? (
            <Flex justify="center" p={8}>
              <Spinner size="lg" />
            </Flex>
          ) : !pagesData?.data?.length ? (
            <Box p={8} textAlign="center">
              <Text fontSize="lg" color="gray.500" mb={4}>
                Aucune page trouvée
              </Text>
              <Button
                colorScheme="blue"
                onClick={() => navigate('/pages/new')}
                display="flex"
                alignItems="center"
                gap={2}
              >
                <AddIcon />
                Créer votre première page
              </Button>
            </Box>
          ) : (
            <Grid
              templateColumns={{
                base: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)'
              }}
              gap={4}
            >
              {pagesData.data.map((page) => (
                <PageCard
                  key={page.id}
                  page={page}
                  onEdit={(page) => navigate(`/pages/${page.id}/edit`)}
                  onView={(page) => navigate(`/pages/${page.id}`)}
                  onDelete={openDeleteDialog}
                  onPublishToggle={handlePublishToggle}
                  onSetHomepage={handleSetHomepage}
                />
              ))}
            </Grid>
          )}
        </Box>

        {/* Pagination */}
        {pagesData?.meta?.pagination && pagesData.meta.pagination.pageCount > 1 && (
          <Box p={4} borderWidth={1} borderRadius="md" bg="white">
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                Page {pagesData.meta.pagination.page} sur {pagesData.meta.pagination.pageCount}
                ({pagesData.meta.pagination.total} pages au total)
              </Text>
              <HStack>
                <Button
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagesData.meta.pagination.pageCount, prev + 1))}
                  disabled={currentPage === pagesData.meta.pagination.pageCount}
                >
                  Suivant
                </Button>
              </HStack>
            </Flex>
          </Box>
        )}
      </VStack>

      {/* Delete confirmation dialog */}
      {showDeleteModal && (
        <>
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.600"
            zIndex={999}
            onClick={() => {
              setShowDeleteModal(false)
              setPageToDelete(null)
            }}
          />
          <Box
            position="fixed"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            bg="white"
            p={6}
            borderRadius="md"
            shadow="xl"
            zIndex={1000}
            maxW="400px"
            w="90%"
          >
            <VStack gap={4} align="stretch">
              <Heading size="md">
                Supprimer la page
              </Heading>
              <Text>
                Êtes-vous sûr de vouloir supprimer la page "{pageToDelete?.title}" ?
                Cette action ne peut pas être annulée.
              </Text>
              <HStack justify="flex-end" gap={3}>
                <Button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setPageToDelete(null)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  colorScheme="red"
                  onClick={() => pageToDelete && handleDeletePage(pageToDelete)}
                  loading={deleteMutation.isPending}
                >
                  Supprimer
                </Button>
              </HStack>
            </VStack>
          </Box>
        </>
      )}
    </Box>
  )
}

import { Badge, Box, HStack, Image, Text, VStack } from '@chakra-ui/react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useDeleteEvent, useEvent, useToggleEventFeatured } from '../hooks/api/useEvents'
import { toaster } from '../lib/toaster'

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: event, isLoading, error } = useEvent(id || '')
  const deleteEventMutation = useDeleteEvent()
  const toggleFeaturedMutation = useToggleEventFeatured()

  const handleDelete = async () => {
    if (!event) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`)) {
      try {
        await deleteEventMutation.mutateAsync(event.documentId)
        toaster.create({
          title: 'Événement supprimé',
          description: `L'événement "${event.title}" a été supprimé avec succès.`,
          type: 'success',
          duration: 3000,
        })
        navigate('/events')
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
    if (!event) return

    try {
      await toggleFeaturedMutation.mutateAsync({
        documentId: event.documentId,
        featured: !event.featured
      })
      toaster.create({
        title: event.featured ? 'Événement retiré de la une' : 'Événement mis à la une',
        description: `L'événement "${event.title}" a été ${event.featured ? 'retiré de la une' : 'mis à la une'}.`,
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
    return <LoadingSpinner message="Chargement de l'événement..." />
  }

  if (error || !event) {
    return (
      <ErrorState
        title="Événement non trouvé"
        message="L'événement que vous recherchez n'existe pas ou n'a pas pu être chargé."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cultural': return 'purple'
      case 'sport': return 'blue'
      case 'meeting': return 'green'
      case 'celebration': return 'orange'
      case 'workshop': return 'teal'
      case 'conference': return 'gray'
      default: return 'gray'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'cultural': return 'Culturel'
      case 'sport': return 'Sport'
      case 'meeting': return 'Réunion'
      case 'celebration': return 'Célébration'
      case 'workshop': return 'Atelier'
      case 'conference': return 'Conférence'
      default: return category
    }
  }

  const isUpcoming = new Date(event.start_date) > new Date()
  const isPast = new Date(event.end_date || event.start_date) < new Date()

  const headerActions = [
    {
      label: 'Retour',
      onClick: () => navigate('/events'),
      variant: 'outline' as const,
      colorScheme: 'gray'
    },
    {
      label: event.featured ? 'Retirer de la une' : 'Mettre à la une',
      onClick: handleToggleFeatured,
      variant: 'outline' as const,
      colorScheme: 'orange',
      loading: toggleFeaturedMutation.isPending
    },
    {
      label: 'Modifier',
      onClick: () => navigate(`/events/${event.documentId}/edit`),
      colorScheme: 'blue'
    },
    {
      label: 'Supprimer',
      onClick: handleDelete,
      variant: 'outline' as const,
      colorScheme: 'red',
      loading: deleteEventMutation.isPending
    }
  ]

  return (
    <Box maxWidth="4xl" mx="auto" p={6}>
      <VStack gap={6} align="stretch">
        <PageHeader
          title={event.title}
          subtitle={`/${event.slug}`}
          actions={headerActions}
        />

        <Box p={6} borderWidth={1} borderRadius="md" bg="white">
          <VStack gap={6} align="stretch">
            {/* Status and badges */}
            <HStack wrap="wrap" gap={2}>
              <Badge colorScheme={getCategoryColor(event.category)} size="sm">
                {getCategoryLabel(event.category)}
              </Badge>
              {event.featured && (
                <Badge colorScheme="orange" size="sm">
                  ⭐ À la une
                </Badge>
              )}
              {isUpcoming && (
                <Badge colorScheme="green" size="sm">
                  📅 À venir
                </Badge>
              )}
              {isPast && (
                <Badge colorScheme="gray" size="sm">
                  ⏰ Passé
                </Badge>
              )}
              {event.registration_required && (
                <Badge colorScheme="blue" size="sm">
                  📝 Inscription requise
                </Badge>
              )}
            </HStack>

            {/* Featured image */}
            {event.image && (
              <Box>
                <Text fontWeight="medium" color="gray.600" mb={2}>
                  Image
                </Text>
                <Image
                  src={event.image.url}
                  alt={event.image.alternativeText || event.title}
                  maxH="300px"
                  borderRadius="md"
                  objectFit="cover"
                />
              </Box>
            )}

            {/* Event details */}
            <Box>
              <Text fontWeight="medium" color="gray.600" mb={2}>
                Détails de l'événement
              </Text>
              <VStack gap={3} align="start">
                <HStack>
                  <Text fontWeight="medium" color="blue.600">
                    📅 Début: {new Date(event.start_date).toLocaleString('fr-FR')}
                  </Text>
                </HStack>

                {event.end_date && (
                  <HStack>
                    <Text color="gray.600">
                      ➡️ Fin: {new Date(event.end_date).toLocaleString('fr-FR')}
                    </Text>
                  </HStack>
                )}

                {event.location && (
                  <HStack>
                    <Text color="gray.600">
                      📍 Lieu: {event.location}
                    </Text>
                  </HStack>
                )}

                {event.address && (
                  <HStack>
                    <Text color="gray.600">
                      🏠 Adresse: {event.address}
                    </Text>
                  </HStack>
                )}

                {event.price && (
                  <HStack>
                    <Text color="green.600" fontWeight="medium">
                      💰 Prix: {event.price}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Box>

            {/* Description */}
            <Box>
              <Text fontWeight="medium" color="gray.600" mb={2}>
                Description
              </Text>
              <Box
                p={4}
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
                bg="gray.50"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </Box>

            {/* Event info */}
            <Box>
              <Text fontWeight="medium" color="gray.600" mb={2}>
                Informations
              </Text>
              <VStack gap={2} align="start">
                {event.organizer && (
                  <Text fontSize="sm" color="gray.600">
                    Organisateur: {event.organizer}
                  </Text>
                )}
                {event.contact_email && (
                  <Text fontSize="sm" color="gray.600">
                    Email de contact: {event.contact_email}
                  </Text>
                )}
                {event.contact_phone && (
                  <Text fontSize="sm" color="gray.600">
                    Téléphone: {event.contact_phone}
                  </Text>
                )}
                {event.max_participants && (
                  <Text fontSize="sm" color="gray.600">
                    Participants maximum: {event.max_participants}
                  </Text>
                )}
                {event.registration_deadline && (
                  <Text fontSize="sm" color="gray.600">
                    Date limite d'inscription: {new Date(event.registration_deadline).toLocaleDateString('fr-FR')}
                  </Text>
                )}
                {event.external_link && (
                  <Text fontSize="sm" color="blue.600">
                    <a href={event.external_link} target="_blank" rel="noopener noreferrer">
                      🔗 Lien externe
                    </a>
                  </Text>
                )}
                <Text fontSize="sm" color="gray.600">
                  Créé le: {new Date(event.createdAt).toLocaleDateString('fr-FR')}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Modifié le: {new Date(event.updatedAt).toLocaleDateString('fr-FR')}
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}

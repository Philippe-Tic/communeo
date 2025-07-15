import { Badge, Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Event } from '../../hooks/api/useEvents'

interface EventCardProps {
  event: Event
  onEdit: (event: Event) => void
  onView: (event: Event) => void
  onDelete: (event: Event) => void
  onToggleFeatured?: (event: Event) => void
  onDuplicate?: (event: Event) => void
}

export const EventCard = ({
  event,
  onEdit,
  onView,
  onDelete,
  onToggleFeatured,
  onDuplicate
}: EventCardProps) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR')
  }

  const isUpcoming = new Date(event.start_date) > new Date()
  const isPast = new Date(event.end_date || event.start_date) < new Date()

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
              📝 Inscription
            </Badge>
          )}
        </HStack>
        <Heading size="md" lineHeight="shorter">
          {event.title}
        </Heading>
      </VStack>

      {/* Body */}
      <VStack align="start" gap={3} flex={1}>
        {event.image && (
          <Box
            w="full"
            h="120px"
            bg="gray.100"
            borderRadius="md"
            backgroundImage={`url(${event.image.url})`}
            backgroundSize="cover"
            backgroundPosition="center"
          />
        )}

        <VStack align="start" gap={2} w="full">
          <HStack>
            <Text fontSize="sm" fontWeight="medium" color="blue.600">
              📅 {formatDateTime(event.start_date)}
            </Text>
          </HStack>

          {event.end_date && (
            <HStack>
              <Text fontSize="sm" color="gray.600">
                ➡️ {formatDateTime(event.end_date)}
              </Text>
            </HStack>
          )}

          {event.location && (
            <HStack>
              <Text fontSize="sm" color="gray.600">
                📍 {event.location}
              </Text>
            </HStack>
          )}

          {event.price && (
            <HStack>
              <Text fontSize="sm" color="green.600" fontWeight="medium">
                💰 {event.price}
              </Text>
            </HStack>
          )}
        </VStack>

        <Text fontSize="sm" color="gray.600" lineHeight="base">
          {event.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
        </Text>

        <VStack align="start" gap={1} fontSize="xs" color="gray.500" w="full">
          {event.organizer && (
            <Text>
              Organisateur: {event.organizer}
            </Text>
          )}
          {event.max_participants && (
            <Text>
              Max participants: {event.max_participants}
            </Text>
          )}
          <Text>
            Créé: {formatDate(event.createdAt)}
          </Text>
        </VStack>
      </VStack>

      {/* Footer Actions */}
      <VStack gap={2} mt={4}>
        <HStack w="full" justify="space-between">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(event)}
          >
            Voir
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            onClick={() => onEdit(event)}
          >
            Modifier
          </Button>
        </HStack>

        <HStack w="full" gap={1} flexWrap="wrap">
          {onToggleFeatured && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onToggleFeatured(event)}
              title={event.featured ? 'Retirer de la une' : 'Mettre à la une'}
            >
              {event.featured ? '⭐' : '☆'}
            </Button>
          )}
          {onDuplicate && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onDuplicate(event)}
              title="Dupliquer l'événement"
            >
              📋
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onDelete(event)}
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

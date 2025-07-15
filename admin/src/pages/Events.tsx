import { Box, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/common'
import { DataGrid, FilterPanel, PageHeader } from '../components/layout'
import { EventCard } from '../components/pages'
import { useDeleteEvent, useDuplicateEvent, useEvents, useToggleEventFeatured, type Event } from '../hooks/api'
import { toaster } from '../lib/toaster'

export const Events = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    category: '',
    featured: '',
    upcoming: '',
    sortBy: 'start_date',
    sortOrder: 'asc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)

  // API hooks
  const { data: eventsData, isLoading, error } = useEvents({
    page: currentPage,
    pageSize: 20,
    search: filters.search || undefined,
    category: filters.category !== '' ? filters.category as 'cultural' | 'sport' | 'meeting' | 'celebration' | 'workshop' | 'conference' : undefined,
    featured: filters.featured !== '' ? filters.featured === 'true' : undefined,
    upcoming: filters.upcoming !== '' ? filters.upcoming === 'true' : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder as 'asc' | 'desc'
  })

  const deleteMutation = useDeleteEvent()
  const toggleFeaturedMutation = useToggleEventFeatured()
  const duplicateMutation = useDuplicateEvent()

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return

    try {
      await deleteMutation.mutateAsync(eventToDelete.documentId)
      toaster.create({
        title: 'Événement supprimé',
        description: `L'événement "${eventToDelete.title}" a été supprimé avec succès.`,
        type: 'success',
        duration: 3000,
      })
      setEventToDelete(null)
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

  const handleToggleFeatured = async (event: Event) => {
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

  const handleDuplicateEvent = async (event: Event) => {
    try {
      await duplicateMutation.mutateAsync(event)
      toaster.create({
        title: 'Événement dupliqué',
        description: `L'événement "${event.title}" a été dupliqué avec succès.`,
        type: 'success',
        duration: 3000,
      })
    } catch (error) {
      console.error('Erreur lors de la duplication:', error)
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la duplication.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const openDeleteDialog = (event: Event) => {
    setEventToDelete(event)
  }

  const filterFields = [
    {
      key: 'search',
      label: 'Recherche',
      type: 'text' as const,
      placeholder: 'Rechercher un événement...'
    },
    {
      key: 'category',
      label: 'Catégorie',
      type: 'select' as const,
      options: [
        { value: 'cultural', label: 'Culturel' },
        { value: 'sport', label: 'Sport' },
        { value: 'meeting', label: 'Réunion' },
        { value: 'celebration', label: 'Célébration' },
        { value: 'workshop', label: 'Atelier' },
        { value: 'conference', label: 'Conférence' }
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
      key: 'upcoming',
      label: 'Événements',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'À venir uniquement' },
        { value: 'false', label: 'Tous les événements' }
      ]
    },
    {
      key: 'sortBy',
      label: 'Trier par',
      type: 'select' as const,
      options: [
        { value: 'title', label: 'Titre' },
        { value: 'start_date', label: 'Date de début' },
        { value: 'createdAt', label: 'Date de création' }
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
      label: 'Nouvel événement',
      onClick: () => navigate('/events/new'),
      colorScheme: 'blue'
    }
  ]

  return (
    <Box p={6}>
      <VStack align="stretch" gap={6}>
        <PageHeader
          title="Événements"
          subtitle="Gérez les événements de votre site"
          actions={headerActions}
        />

        <FilterPanel
          filters={filters}
          fields={filterFields}
          onChange={handleFilterChange}
        />

        <DataGrid
          data={eventsData?.data || []}
          renderItem={(event: Event) => (
            <EventCard
              event={event}
              onEdit={(event) => navigate(`/events/${event.documentId}/edit`)}
              onView={(event) => navigate(`/events/${event.documentId}`)}
              onDelete={openDeleteDialog}
              onToggleFeatured={handleToggleFeatured}
              onDuplicate={handleDuplicateEvent}
            />
          )}
          isLoading={isLoading}
          error={!!error}
          emptyTitle="Aucun événement trouvé"
          emptyDescription="Commencez par créer votre premier événement"
          emptyActionLabel="Créer un événement"
          onEmptyAction={() => navigate('/events/new')}
          columns={{ base: 1, md: 2, lg: 3 }}
        />

        <ConfirmDialog
          isOpen={!!eventToDelete}
          onClose={() => setEventToDelete(null)}
          onConfirm={handleDeleteEvent}
          title="Supprimer l'événement"
          message={`Êtes-vous sûr de vouloir supprimer l'événement "${eventToDelete?.title}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </VStack>
    </Box>
  )
}

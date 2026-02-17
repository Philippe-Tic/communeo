import { Badge } from '@/components/ui/badge'
import { ArrowRight, Banknote, Calendar, CalendarCheck, ClipboardList, Clock, ExternalLink, Home, MapPin, Star } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useDeleteEvent, useEvent, useToggleEventFeatured } from '../hooks/api/useEvents'
import { toaster } from '../lib/toaster'

const CATEGORY_COLORS: Record<string, string> = {
  cultural: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  sport: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  meeting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  celebration: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  workshop: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  conference: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

const CATEGORY_LABELS: Record<string, string> = {
  cultural: 'Culturel',
  sport: 'Sport',
  meeting: 'Réunion',
  celebration: 'Célébration',
  workshop: 'Atelier',
  conference: 'Conférence',
}

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
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={event.title}
          subtitle={`/${event.slug}`}
          actions={headerActions}
        />

        <div className="rounded-md border bg-card p-6">
          <div className="flex flex-col gap-6">
            {/* Status and badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={CATEGORY_COLORS[event.category] || ''}>
                {CATEGORY_LABELS[event.category] || event.category}
              </Badge>
              {event.featured && (
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  <Star className="mr-1 inline h-3 w-3" /> À la une
                </Badge>
              )}
              {isUpcoming && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CalendarCheck className="mr-1 inline h-3 w-3" /> À venir
                </Badge>
              )}
              {isPast && (
                <Badge variant="secondary">
                  <Clock className="mr-1 inline h-3 w-3" /> Passé
                </Badge>
              )}
              {event.registration_required && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <ClipboardList className="mr-1 inline h-3 w-3" /> Inscription requise
                </Badge>
              )}
            </div>

            {/* Featured image */}
            {event.image && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">
                  Image
                </p>
                <img
                  src={event.image.url}
                  alt={event.image.alternativeText || event.title}
                  className="max-h-[300px] rounded-md object-cover"
                />
              </div>
            )}

            {/* Event details */}
            <div>
              <p className="mb-2 font-medium text-muted-foreground">
                Détails de l'événement
              </p>
              <div className="flex flex-col items-start gap-3">
                <p className="flex items-center gap-1.5 font-medium text-primary">
                  <Calendar className="h-4 w-4" /> Début: {new Date(event.start_date).toLocaleString('fr-FR')}
                </p>

                {event.end_date && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <ArrowRight className="h-4 w-4" /> Fin: {new Date(event.end_date).toLocaleString('fr-FR')}
                  </p>
                )}

                {event.location && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> Lieu: {event.location}
                  </p>
                )}

                {event.address && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Home className="h-4 w-4" /> Adresse: {event.address}
                  </p>
                )}

                {event.price && (
                  <p className="flex items-center gap-1.5 font-medium text-green-600 dark:text-green-400">
                    <Banknote className="h-4 w-4" /> Prix: {event.price}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="mb-2 font-medium text-muted-foreground">
                Description
              </p>
              <div
                className="rounded-md border bg-muted/50 p-4"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>

            {/* Event info */}
            <div>
              <p className="mb-2 font-medium text-muted-foreground">
                Informations
              </p>
              <div className="flex flex-col items-start gap-2">
                {event.organizer && (
                  <p className="text-sm text-muted-foreground">
                    Organisateur: {event.organizer}
                  </p>
                )}
                {event.contact_email && (
                  <p className="text-sm text-muted-foreground">
                    Email de contact: {event.contact_email}
                  </p>
                )}
                {event.contact_phone && (
                  <p className="text-sm text-muted-foreground">
                    Téléphone: {event.contact_phone}
                  </p>
                )}
                {event.max_participants && (
                  <p className="text-sm text-muted-foreground">
                    Participants maximum: {event.max_participants}
                  </p>
                )}
                {event.registration_deadline && (
                  <p className="text-sm text-muted-foreground">
                    Date limite d'inscription: {new Date(event.registration_deadline).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {event.external_link && (
                  <p className="text-sm text-primary">
                    <a href={event.external_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> Lien externe
                    </a>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Créé le: {new Date(event.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Modifié le: {new Date(event.updatedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

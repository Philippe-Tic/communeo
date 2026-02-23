import { Badge } from '@/components/ui/badge'
import { EVENT_CATEGORY_COLORS, EVENT_CATEGORY_LABELS } from '@/lib/constants/event-types'
import { formatDate, formatDateTime, stripHtml } from '@/lib/format'
import { ArrowRight, Banknote, Calendar, CalendarCheck, ClipboardList, Clock, Copy, MapPin, Star } from 'lucide-react'
import type { Event } from '../../hooks/api/useEvents'
import { CardActionsMenu, CategoryBadge } from '../common'

interface EventCardProps {
  event: Event
  onEdit: (event: Event) => void
  onView: (event: Event) => void
  onDelete: (event: Event) => void
  onToggleFeatured?: (event: Event) => void
  onDuplicate?: (event: Event) => void
}

export const EventCard = ({
  event, onEdit, onView, onDelete, onToggleFeatured, onDuplicate
}: EventCardProps) => {
  const isUpcoming = new Date(event.start_date) > new Date()
  const isPast = new Date(event.end_date || event.start_date) < new Date()

  const extraActions = [
    ...(onToggleFeatured ? [{
      label: event.featured ? 'Retirer de la une' : 'Mettre à la une',
      icon: <Star className="h-4 w-4" />,
      onClick: () => onToggleFeatured(event),
    }] : []),
    ...(onDuplicate ? [{
      label: 'Dupliquer',
      icon: <Copy className="h-4 w-4" />,
      onClick: () => onDuplicate(event),
    }] : []),
  ]

  return (
    <div className="glass-card flex h-full flex-col rounded-xl p-4">
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-2">
            <CategoryBadge value={event.category} labels={EVENT_CATEGORY_LABELS} colors={EVENT_CATEGORY_COLORS} />
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
                <ClipboardList className="mr-1 inline h-3 w-3" /> Inscription
              </Badge>
            )}
          </div>

          <CardActionsMenu
            onEdit={() => onEdit(event)}
            onView={() => onView(event)}
            onDelete={() => onDelete(event)}
            extraActions={extraActions}
          />
        </div>
        <h3 className="text-lg font-semibold leading-tight">{event.title}</h3>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3">
        {event.image && (
          <div
            className="h-[120px] w-full rounded-md bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${event.image.url})` }}
          />
        )}

        <div className="space-y-1">
          <p className="flex items-center gap-1 text-sm font-medium text-primary">
            <Calendar className="h-3.5 w-3.5" /> {formatDateTime(event.start_date)}
          </p>
          {event.end_date && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowRight className="h-3.5 w-3.5" /> {formatDateTime(event.end_date)}
            </p>
          )}
          {event.location && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {event.location}
            </p>
          )}
          {event.price && (
            <p className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
              <Banknote className="h-3.5 w-3.5" /> {event.price}
            </p>
          )}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {stripHtml(event.description).substring(0, 150)}...
        </p>

        <div className="mt-auto space-y-1 text-xs text-muted-foreground">
          {event.organizer && <p>Organisateur: {event.organizer}</p>}
          {event.max_participants && <p>Max participants: {event.max_participants}</p>}
          <p>Créé: {formatDate(event.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Event } from '../../hooks/api/useEvents'

interface EventCardProps {
  event: Event
  onEdit: (event: Event) => void
  onView: (event: Event) => void
  onDelete: (event: Event) => void
  onToggleFeatured?: (event: Event) => void
  onDuplicate?: (event: Event) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  cultural: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  sport: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  meeting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  celebration: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  workshop: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  conference: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

const CATEGORY_LABELS: Record<string, string> = {
  cultural: 'Culturel', sport: 'Sport', meeting: 'Réunion',
  celebration: 'Célébration', workshop: 'Atelier', conference: 'Conférence',
}

export const EventCard = ({
  event, onEdit, onView, onDelete, onToggleFeatured, onDuplicate
}: EventCardProps) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR')
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('fr-FR')

  const isUpcoming = new Date(event.start_date) > new Date()
  const isPast = new Date(event.end_date || event.start_date) < new Date()

  return (
    <div className="flex h-full flex-col rounded-md border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge className={CATEGORY_COLORS[event.category] || ''}>{CATEGORY_LABELS[event.category] || event.category}</Badge>
          {event.featured && <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">⭐ À la une</Badge>}
          {isUpcoming && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">📅 À venir</Badge>}
          {isPast && <Badge variant="secondary">⏰ Passé</Badge>}
          {event.registration_required && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">📝 Inscription</Badge>}
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
          <p className="text-sm font-medium text-primary">📅 {formatDateTime(event.start_date)}</p>
          {event.end_date && <p className="text-sm text-muted-foreground">➡️ {formatDateTime(event.end_date)}</p>}
          {event.location && <p className="text-sm text-muted-foreground">📍 {event.location}</p>}
          {event.price && <p className="text-sm font-medium text-green-600 dark:text-green-400">💰 {event.price}</p>}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {event.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
        </p>

        <div className="mt-auto space-y-1 text-xs text-muted-foreground">
          {event.organizer && <p>Organisateur: {event.organizer}</p>}
          {event.max_participants && <p>Max participants: {event.max_participants}</p>}
          <p>Créé: {formatDate(event.createdAt)}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 space-y-2">
        <div className="flex w-full justify-between">
          <Button size="sm" variant="outline" onClick={() => onView(event)}>Voir</Button>
          <Button size="sm" onClick={() => onEdit(event)}>Modifier</Button>
        </div>

        <div className="flex w-full flex-wrap gap-1">
          {onToggleFeatured && (
            <Button size="sm" variant="ghost" onClick={() => onToggleFeatured(event)} title={event.featured ? 'Retirer de la une' : 'Mettre à la une'}>
              {event.featured ? '⭐' : '☆'}
            </Button>
          )}
          {onDuplicate && (
            <Button size="sm" variant="ghost" onClick={() => onDuplicate(event)} title="Dupliquer l'événement">📋</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDelete(event)} className="text-destructive" title="Supprimer">🗑️</Button>
        </div>
      </div>
    </div>
  )
}

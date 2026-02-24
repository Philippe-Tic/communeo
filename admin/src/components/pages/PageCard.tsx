import { Badge } from '@/components/ui/badge'
import { formatDate, stripHtml, truncateText } from '@/lib/format'
import { Clock } from 'lucide-react'
import type { Page } from '../../hooks/api/usePages'
import { CardActionsMenu, StatusBadge } from '../common'

interface PageCardProps {
  page: Page
  onEdit: (page: Page) => void
  onView: (page: Page) => void
  onDelete: (page: Page) => void
}

export function PageCard({ page, onEdit, onView, onDelete }: PageCardProps) {
  const isScheduled = page.scheduled_at && new Date(page.scheduled_at) > new Date()

  return (
    <div className="glass-card relative cursor-pointer rounded-xl p-4" onClick={() => onView(page)}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <p className="text-lg font-bold leading-tight">
              {truncateText(page.title, 50)}
            </p>
            <p className="text-sm text-muted-foreground">/{page.slug}</p>
          </div>

          <CardActionsMenu
            onEdit={() => onEdit(page)}
            onView={() => onView(page)}
            onDelete={() => onDelete(page)}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {truncateText(stripHtml(page.content) || 'Aucun contenu', 100)}
        </p>

        <div className="flex items-center gap-2">
          <StatusBadge status={page.status} />
          {isScheduled && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              <Clock className="mr-1 inline h-3 w-3" /> Programmé
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Modifié: {formatDate(page.updatedAt)}</span>
          <span>Ordre: {page.menu_order}</span>
        </div>
      </div>
    </div>
  )
}

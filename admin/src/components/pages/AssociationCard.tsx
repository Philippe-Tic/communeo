import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { getMediaUrl } from '@/lib/utils'
import { Mail, UserCircle } from 'lucide-react'
import type { Association } from '../../hooks/api/useAssociations'
import { CATEGORY_COLORS, CATEGORY_LABELS, STATUS_CONFIG } from '../../hooks/api/useAssociations'
import { CardActionsMenu, CategoryBadge } from '../common'

interface AssociationCardProps {
  association: Association
  onEdit: (association: Association) => void
  onView: (association: Association) => void
  onDelete: (association: Association) => void
}

export const AssociationCard = ({
  association, onEdit, onView, onDelete
}: AssociationCardProps) => {
  const statusConfig = STATUS_CONFIG[association.status]

  return (
    <div className="glass-card flex h-full flex-col rounded-xl p-4">
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1.5">
            <CategoryBadge value={association.category} labels={CATEGORY_LABELS} colors={CATEGORY_COLORS} />
            <Badge className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>

          <CardActionsMenu
            onView={() => onView(association)}
            onEdit={() => onEdit(association)}
            onDelete={() => onDelete(association)}
          />
        </div>
      </div>

      {/* Logo */}
      {association.logo && (
        <div
          className="mb-3 h-[80px] w-full rounded-md bg-muted bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${getMediaUrl(association.logo.url)})` }}
        />
      )}

      {/* Name */}
      <h3 className="text-lg font-semibold leading-tight">{association.name}</h3>

      {/* Contact email */}
      {association.contact_email && (
        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          <span className="truncate">{association.contact_email}</span>
        </div>
      )}

      {/* Submitted by */}
      {association.submission_source === 'public_form' && association.submitted_by_name && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserCircle className="h-3.5 w-3.5" />
          <span>Soumis par {association.submitted_by_name}</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 text-xs text-muted-foreground">
        <p>Créé le {formatDate(association.createdAt)}</p>
      </div>
    </div>
  )
}

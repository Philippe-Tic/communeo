import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Eye, Mail, MoreVertical, Pencil, Trash2, UserCircle } from 'lucide-react'
import type { Association } from '../../hooks/api/useAssociations'
import { CATEGORY_COLORS, CATEGORY_LABELS, STATUS_CONFIG } from '../../hooks/api/useAssociations'

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
    <div className="flex h-full flex-col rounded-md border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={CATEGORY_COLORS[association.category] || ''}>
              {CATEGORY_LABELS[association.category] || association.category}
            </Badge>
            <Badge className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(association)}>
                <Eye className="mr-2 h-4 w-4" /> Voir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(association)}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(association)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Logo */}
      {association.logo && (
        <div
          className="mb-3 h-[80px] w-full rounded-md bg-muted bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${association.logo.url})` }}
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
        <p>Créé le {new Date(association.createdAt).toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
  )
}

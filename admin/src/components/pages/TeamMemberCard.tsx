import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronUp, Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { TeamMember } from '../../hooks/api/useTeamMembers'
import { ROLE_COLORS, ROLE_LABELS } from '../../hooks/api/useTeamMembers'

interface TeamMemberCardProps {
  member: TeamMember
  onEdit: (member: TeamMember) => void
  onView: (member: TeamMember) => void
  onDelete: (member: TeamMember) => void
  onMoveUp?: (member: TeamMember) => void
  onMoveDown?: (member: TeamMember) => void
  isFirst?: boolean
  isLast?: boolean
}

export const TeamMemberCard = ({
  member, onEdit, onView, onDelete, onMoveUp, onMoveDown, isFirst, isLast
}: TeamMemberCardProps) => {
  return (
    <div className="flex h-full flex-col rounded-md border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <Badge className={ROLE_COLORS[member.role] || ''}>
            {ROLE_LABELS[member.role] || member.role}
          </Badge>

          <div className="flex items-center gap-1">
            {onMoveUp && !isFirst && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMoveUp(member)} title="Monter">
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && !isLast && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMoveDown(member)} title="Descendre">
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(member)}>
                  <Pencil className="mr-2 h-4 w-4" /> Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onView(member)}>
                  <Eye className="mr-2 h-4 w-4" /> Voir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(member)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Photo */}
      {member.photo && (
        <div
          className="mb-3 h-[120px] w-full rounded-md bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${member.photo.url})` }}
        />
      )}

      {/* Name */}
      <h3 className="text-lg font-semibold leading-tight">
        {member.first_name} {member.last_name}
      </h3>

      {/* Delegation */}
      {member.delegation && (
        <p className="mt-1 text-sm text-muted-foreground">{member.delegation}</p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 text-xs text-muted-foreground">
        <p>Ordre : {member.display_order}</p>
      </div>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { getMediaUrl } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { TeamMember } from '../../hooks/api/useTeamMembers'
import { ROLE_COLORS, ROLE_LABELS } from '../../hooks/api/useTeamMembers'
import { CardActionsMenu, CategoryBadge } from '../common'

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
    <div className="glass-card flex h-full cursor-pointer flex-col rounded-xl p-4" onClick={() => onView(member)}>
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <CategoryBadge value={member.role} labels={ROLE_LABELS} colors={ROLE_COLORS} />

          <div className="flex items-center gap-1">
            {onMoveUp && !isFirst && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onMoveUp(member) }} title="Monter">
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && !isLast && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onMoveDown(member) }} title="Descendre">
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}

            <CardActionsMenu
              onEdit={() => onEdit(member)}
              onView={() => onView(member)}
              onDelete={() => onDelete(member)}
            />
          </div>
        </div>
      </div>

      {/* Photo */}
      {member.photo && (
        <div
          className="mb-3 h-[120px] w-full rounded-md bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${getMediaUrl(member.photo.url)})` }}
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

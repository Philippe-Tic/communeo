import type { TeamMemberRole } from '../../hooks/api/useTeamMembers'

export const TEAM_MEMBER_ROLE_LABELS: Record<TeamMemberRole, string> = {
  maire: 'Maire',
  adjoint: 'Adjoint(e)',
  conseiller: 'Conseiller(e)',
  dgs: 'DGS',
  agent: 'Agent',
}

export const TEAM_MEMBER_ROLE_COLORS: Record<TeamMemberRole, string> = {
  maire: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  adjoint: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  conseiller: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  dgs: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  agent: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export const TEAM_MEMBER_ROLE_OPTIONS = Object.entries(TEAM_MEMBER_ROLE_LABELS).map(
  ([value, label]) => ({ value, label })
)

import { Skeleton } from '@/components/ui/skeleton'

interface StatsCardProps {
  label: string
  value: string | number
  color: string
  icon?: React.ReactNode
  isLoading?: boolean
}

const COLOR_MAP: Record<string, { text: string; iconBg: string; iconText: string }> = {
  blue: { text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600', iconText: 'text-white' },
  green: { text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600', iconText: 'text-white' },
  purple: { text: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600', iconText: 'text-white' },
  red: { text: 'text-red-600 dark:text-red-400', iconBg: 'bg-gradient-to-br from-red-500 to-red-600', iconText: 'text-white' },
  orange: { text: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600', iconText: 'text-white' },
}

export function StatsCard({ label, value, color, icon, isLoading }: StatsCardProps) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-start gap-4">
        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${colors.iconBg} ${colors.iconText} shadow-sm`}>
            {icon}
          </div>
        )}
        <div className="space-y-1">
          {isLoading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <p className={`text-3xl font-bold leading-none ${colors.text}`}>{value}</p>
          )}
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

interface StatsCardProps {
  label: string
  value: string | number
  color: string
  icon?: React.ReactNode
  isLoading?: boolean
}

const COLOR_MAP: Record<string, { text: string; icon: string }> = {
  blue: { text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500' },
  green: { text: 'text-green-600 dark:text-green-400', icon: 'text-green-500' },
  purple: { text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-500' },
  red: { text: 'text-red-600 dark:text-red-400', icon: 'text-red-500' },
  orange: { text: 'text-orange-600 dark:text-orange-400', icon: 'text-orange-500' },
}

export function StatsCard({ label, value, color, icon, isLoading }: StatsCardProps) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3">
        {icon && (
          <div className={colors.icon}>{icon}</div>
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

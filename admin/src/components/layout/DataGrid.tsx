import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '../common'

interface DataGridProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  isLoading?: boolean
  error?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
  columns?: {
    base?: number
    md?: number
    lg?: number
  }
  gap?: number
  skeletonCount?: number
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="mt-2 flex gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}

export function DataGrid<T>({
  data,
  renderItem,
  isLoading = false,
  error = false,
  emptyTitle = 'Aucun élément trouvé',
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  skeletonCount = 6,
}: DataGridProps<T>) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorState />
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((item, index) => (
        <div key={index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}

import { Box, Grid } from '@chakra-ui/react'
import { EmptyState, ErrorState, LoadingSpinner } from '../common'

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
  columns = { base: 1, md: 2, lg: 3 },
  gap = 4
}: DataGridProps<T>) {
  if (isLoading) {
    return <LoadingSpinner />
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
    <Grid
      templateColumns={{
        base: `repeat(${columns.base}, 1fr)`,
        md: `repeat(${columns.md}, 1fr)`,
        lg: `repeat(${columns.lg}, 1fr)`
      }}
      gap={gap}
    >
      {data.map((item, index) => (
        <Box key={index}>
          {renderItem(item, index)}
        </Box>
      ))}
    </Grid>
  )
}

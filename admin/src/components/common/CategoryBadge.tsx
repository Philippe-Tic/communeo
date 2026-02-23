import { Badge } from '@/components/ui/badge'

interface CategoryBadgeProps {
  value: string
  labels: Record<string, string>
  colors: Record<string, string>
}

export function CategoryBadge({ value, labels, colors }: CategoryBadgeProps) {
  return (
    <Badge className={colors[value] || ''}>
      {labels[value] || value}
    </Badge>
  )
}

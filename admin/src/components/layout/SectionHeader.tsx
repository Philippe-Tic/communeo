import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'

interface SectionHeaderProps {
  title: string
  linkTo: string
  linkLabel?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
}

export function SectionHeader({ title, linkTo, linkLabel = 'Voir tout', icon, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        {icon}
        {title}
        {badge}
      </h3>
      <RouterLink to={linkTo}>
        <Button variant="ghost" size="sm">
          {linkLabel} <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </RouterLink>
    </div>
  )
}

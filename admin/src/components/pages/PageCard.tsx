import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'
import type { Page } from '../../hooks/api/usePages'
import { DeleteIcon, EditIcon, EyeIcon } from '../../utils/icons'
import { StatusBadge } from '../common'

interface PageCardProps {
  page: Page
  onEdit: (page: Page) => void
  onView: (page: Page) => void
  onDelete: (page: Page) => void
}

export function PageCard({ page, onEdit, onView, onDelete }: PageCardProps) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="relative rounded-md border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <p className="text-lg font-bold leading-tight">
              {truncateText(page.title, 50)}
            </p>
            <p className="text-sm text-muted-foreground">/{page.slug}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(page)}>
                <EditIcon /> <span className="ml-2">Modifier</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onView(page)}>
                <EyeIcon /> <span className="ml-2">Voir</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(page)} className="text-destructive focus:text-destructive">
                <DeleteIcon /> <span className="ml-2">Supprimer</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground">
          {truncateText(page.content.replace(/<[^>]*>/g, '') || 'Aucun contenu', 100)}
        </p>

        <div className="flex items-center justify-between">
          <StatusBadge status={page.status} />
          {page.is_homepage && (
            <span className="text-xs font-medium text-primary">Page d'accueil</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Modifié: {new Date(page.updatedAt).toLocaleDateString('fr-FR')}</span>
          <span>Ordre: {page.menu_order}</span>
        </div>
      </div>
    </div>
  )
}

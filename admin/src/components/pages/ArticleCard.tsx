import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Clock, Download, Eye, MoreVertical, Pencil, Star, Trash2, Upload } from 'lucide-react'
import type { Article } from '../../hooks/api/useArticles'
import { StatusBadge } from '../common'

interface ArticleCardProps {
  article: Article
  onEdit: (article: Article) => void
  onView: (article: Article) => void
  onDelete: (article: Article) => void
  onToggleFeatured?: (article: Article) => void
  onPublish?: (article: Article) => void
  onUnpublish?: (article: Article) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  news: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  event: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  information: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  emergency: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const CATEGORY_LABELS: Record<string, string> = {
  news: 'Actualité', event: 'Événement', information: 'Information', emergency: 'Urgence',
}

export const ArticleCard = ({
  article, onEdit, onView, onDelete, onToggleFeatured, onPublish, onUnpublish
}: ArticleCardProps) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR')
  const isScheduled = article.scheduled_at && new Date(article.scheduled_at) > new Date()

  return (
    <div className="flex h-full flex-col rounded-md border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={article.status} />
            <Badge className={CATEGORY_COLORS[article.category] || ''}>
              {CATEGORY_LABELS[article.category] || article.category}
            </Badge>
            {isScheduled && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <Clock className="mr-1 inline h-3 w-3" /> Programmé
              </Badge>
            )}
            {article.featured && (
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                <Star className="mr-1 inline h-3 w-3" /> À la une
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(article)}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onView(article)}>
                <Eye className="mr-2 h-4 w-4" /> Voir
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onToggleFeatured && (
                <DropdownMenuItem onClick={() => onToggleFeatured(article)}>
                  <Star className="mr-2 h-4 w-4" /> {article.featured ? 'Retirer de la une' : 'Mettre à la une'}
                </DropdownMenuItem>
              )}
              {onPublish && article.status !== 'published' && (
                <DropdownMenuItem onClick={() => onPublish(article)}>
                  <Upload className="mr-2 h-4 w-4" /> Publier
                </DropdownMenuItem>
              )}
              {onUnpublish && article.status === 'published' && (
                <DropdownMenuItem onClick={() => onUnpublish(article)}>
                  <Download className="mr-2 h-4 w-4" /> Dépublier
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(article)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h3 className="text-lg font-semibold leading-tight">{article.title}</h3>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3">
        {article.image && (
          <div
            className="h-[120px] w-full rounded-md bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${article.image.url})` }}
          />
        )}

        {article.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
        )}

        <div className="mt-auto space-y-1 text-xs text-muted-foreground">
          <div className="flex w-full justify-between">
            <span>Vues: {article.view_count}</span>
            {article.author && <span>Par: {article.author}</span>}
          </div>
          <p>Créé: {formatDate(article.createdAt)}</p>
          {article.publication_date && <p>Publié: {formatDate(article.publication_date)}</p>}
          {isScheduled && <p>Programmé: {new Date(article.scheduled_at!).toLocaleString('fr-FR')}</p>}
        </div>
      </div>
    </div>
  )
}

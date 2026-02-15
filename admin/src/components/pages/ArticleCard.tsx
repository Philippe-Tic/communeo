import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

  return (
    <div className="flex h-full flex-col rounded-md border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={article.status} />
          <Badge className={CATEGORY_COLORS[article.category] || ''}>
            {CATEGORY_LABELS[article.category] || article.category}
          </Badge>
          {article.featured && (
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">⭐ À la une</Badge>
          )}
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
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 space-y-2">
        <div className="flex w-full justify-between">
          <Button size="sm" variant="outline" onClick={() => onView(article)}>Voir</Button>
          <Button size="sm" onClick={() => onEdit(article)}>Modifier</Button>
        </div>

        <div className="flex w-full flex-wrap gap-1">
          {onToggleFeatured && (
            <Button size="sm" variant="ghost" onClick={() => onToggleFeatured(article)} title={article.featured ? 'Retirer de la une' : 'Mettre à la une'}>
              {article.featured ? '⭐' : '☆'}
            </Button>
          )}
          {onPublish && article.status !== 'published' && (
            <Button size="sm" variant="ghost" onClick={() => onPublish(article)} title="Publier">📤</Button>
          )}
          {onUnpublish && article.status === 'published' && (
            <Button size="sm" variant="ghost" onClick={() => onUnpublish(article)} title="Dépublier">📥</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDelete(article)} className="text-destructive" title="Supprimer">🗑️</Button>
        </div>
      </div>
    </div>
  )
}

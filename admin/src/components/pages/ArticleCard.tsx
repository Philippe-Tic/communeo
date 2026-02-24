import { Badge } from '@/components/ui/badge'
import { ARTICLE_CATEGORY_COLORS, ARTICLE_CATEGORY_LABELS } from '@/lib/constants/article-types'
import { formatDate } from '@/lib/format'
import { getMediaUrl } from '@/lib/utils'
import { Clock, Download, Star, Upload } from 'lucide-react'
import type { Article } from '../../hooks/api/useArticles'
import { CardActionsMenu, CategoryBadge, StatusBadge } from '../common'

interface ArticleCardProps {
  article: Article
  onEdit: (article: Article) => void
  onView: (article: Article) => void
  onDelete: (article: Article) => void
  onToggleFeatured?: (article: Article) => void
  onPublish?: (article: Article) => void
  onUnpublish?: (article: Article) => void
}

export const ArticleCard = ({
  article, onEdit, onView, onDelete, onToggleFeatured, onPublish, onUnpublish
}: ArticleCardProps) => {
  const isScheduled = article.scheduled_at && new Date(article.scheduled_at) > new Date()

  const extraActions = [
    ...(onToggleFeatured ? [{
      label: article.featured ? 'Retirer de la une' : 'Mettre à la une',
      icon: <Star className="h-4 w-4" />,
      onClick: () => onToggleFeatured(article),
    }] : []),
    ...(onPublish && article.status !== 'published' ? [{
      label: 'Publier',
      icon: <Upload className="h-4 w-4" />,
      onClick: () => onPublish(article),
    }] : []),
    ...(onUnpublish && article.status === 'published' ? [{
      label: 'Dépublier',
      icon: <Download className="h-4 w-4" />,
      onClick: () => onUnpublish(article),
    }] : []),
  ]

  return (
    <div className="glass-card flex h-full flex-col rounded-xl p-4">
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={article.status} />
            <CategoryBadge value={article.category} labels={ARTICLE_CATEGORY_LABELS} colors={ARTICLE_CATEGORY_COLORS} />
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

          <CardActionsMenu
            onEdit={() => onEdit(article)}
            onView={() => onView(article)}
            onDelete={() => onDelete(article)}
            extraActions={extraActions}
          />
        </div>
        <h3 className="text-lg font-semibold leading-tight">{article.title}</h3>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3">
        {article.image && (
          <div
            className="h-[120px] w-full rounded-md bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${getMediaUrl(article.image.url)})` }}
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

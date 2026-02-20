import { cn } from '@/lib/utils'

interface ContentPreviewProps {
  html: string
  title?: string
  type: 'page' | 'article' | 'event'
  className?: string
}

export function ContentPreview({
  html,
  title,
  type,
  className,
}: ContentPreviewProps) {
  const typeLabel =
    type === 'page'
      ? 'Page'
      : type === 'article'
        ? 'Article'
        : 'Événement'

  return (
    <div
      className={cn(
        'preview-container overflow-y-auto rounded-lg border bg-white dark:bg-gray-950',
        className
      )}
    >
      {/* Simulated site header */}
      <div className="border-b bg-gray-50 px-6 py-3 dark:bg-gray-900">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary">
            Aperçu {typeLabel}
          </span>
          <span>Accueil / {typeLabel}s / {title || '...'}</span>
        </div>
      </div>

      {/* Simulated page content */}
      <div className="px-6 py-8">
        {title && (
          <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
        )}

        {html ? (
          <div
            className="preview-prose prose prose-sm max-w-none dark:prose-invert sm:prose-base"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="italic text-muted-foreground">
            Commencez à écrire pour voir l'aperçu...
          </p>
        )}
      </div>
    </div>
  )
}

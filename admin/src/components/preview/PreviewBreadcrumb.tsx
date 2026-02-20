interface PreviewBreadcrumbProps {
  contentType: string
  title: string
}

const TYPE_LABELS: Record<string, string> = {
  page: 'Pages',
  article: 'Actualités',
  event: 'Événements',
}

export function PreviewBreadcrumb({ contentType, title }: PreviewBreadcrumbProps) {
  const typeLabel = TYPE_LABELS[contentType] || contentType

  return (
    <div className="preview-breadcrumb">
      <a href="#">Accueil</a>
      <span>&rsaquo;</span>
      <a href="#">{typeLabel}</a>
      <span>&rsaquo;</span>
      {title || 'Sans titre'}
    </div>
  )
}

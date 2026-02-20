interface PreviewHeroProps {
  title: string
  subtitle?: string
}

export function PreviewHero({ title, subtitle }: PreviewHeroProps) {
  return (
    <div className="preview-hero">
      <h1>{title || 'Titre de la page'}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}

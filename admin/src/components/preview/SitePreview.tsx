import { useSitePreviewConfig } from '@/hooks/useSitePreviewConfig'
import { PreviewNavigation } from './PreviewNavigation'
import { PreviewHero } from './PreviewHero'
import { PreviewBreadcrumb } from './PreviewBreadcrumb'
import { PreviewFooter } from './PreviewFooter'
import '@/styles/site-preview.css'

interface SitePreviewProps {
  title: string
  content: string
  contentType: 'page' | 'article' | 'event'
  subtitle?: string
}

export function SitePreview({ title, content, contentType, subtitle }: SitePreviewProps) {
  const { config, isLoading } = useSitePreviewConfig()

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/50 p-12">
        <p className="text-sm text-muted-foreground">Chargement de l'aperçu...</p>
      </div>
    )
  }

  const cssVars = {
    '--preview-color-primary': config.primaryColor,
    '--preview-color-secondary': config.secondaryColor,
  } as React.CSSProperties

  return (
    <div
      className={`site-preview min-h-full h-full theme-${config.theme}`}
      style={cssVars}
    >
      <PreviewNavigation
        siteName={config.siteName}
        logoUrl={config.logoUrl}
      />
      <PreviewHero title={title} subtitle={subtitle} />
      <PreviewBreadcrumb contentType={contentType} title={title} />
      <div className="preview-content">
        <div
          className="prose prose-lg"
          dangerouslySetInnerHTML={{ __html: content || '<p style="color: #9ca3af; font-style: italic;">Commencez à écrire du contenu...</p>' }}
        />
      </div>
      <PreviewFooter siteName={config.siteName} />
    </div>
  )
}

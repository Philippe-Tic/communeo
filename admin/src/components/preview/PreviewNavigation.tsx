interface PreviewNavigationProps {
  siteName: string
  logoUrl: string | null
}

const NAV_LINKS = ['Accueil', 'Actualités', 'Événements', 'Documents', 'Contact']

export function PreviewNavigation({ siteName, logoUrl }: PreviewNavigationProps) {
  return (
    <div className="preview-nav">
      <div className="preview-nav-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {logoUrl && (
            <img src={logoUrl} alt="" className="nav-logo" />
          )}
          <span className="nav-site-name">{siteName}</span>
        </div>
        <div className="nav-links">
          {NAV_LINKS.map((link, i) => (
            <span key={link} className={`nav-link${i === 0 ? ' active' : ''}`}>
              {link}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

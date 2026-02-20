interface PreviewFooterProps {
  siteName: string
}

export function PreviewFooter({ siteName }: PreviewFooterProps) {
  const year = new Date().getFullYear()

  return (
    <div className="preview-footer">
      <div className="footer-name">{siteName}</div>
      <div className="footer-copy">&copy; {year} - Tous droits réservés</div>
    </div>
  )
}

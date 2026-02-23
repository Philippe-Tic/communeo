export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR')
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('fr-FR')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Auto-generates IDs on heading elements and extracts a TOC structure
 * from HTML content. Works at build time (no TipTap dependency).
 */

export interface TocItem {
  id: string
  text: string
  level: number
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Add IDs to headings in HTML and return both the modified HTML
 * and an array of TOC items.
 */
export function addHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = []
  const usedIds = new Set<string>()

  const processed = html.replace(
    /<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag, attrs, content) => {
      // Strip HTML tags from content for text and ID
      const text = content.replace(/<[^>]*>/g, '').trim()
      let id = slugify(text)

      // Ensure unique IDs
      if (usedIds.has(id)) {
        let counter = 1
        while (usedIds.has(`${id}-${counter}`)) counter++
        id = `${id}-${counter}`
      }
      usedIds.add(id)

      const level = parseInt(tag.charAt(1))
      toc.push({ id, text, level })

      // If there's already an id attribute, replace it; otherwise add one
      if (/id\s*=\s*["']/.test(attrs)) {
        attrs = attrs.replace(/id\s*=\s*["'][^"']*["']/, `id="${id}"`)
      } else {
        attrs += ` id="${id}"`
      }

      return `<${tag}${attrs}>${content}</${tag}>`
    }
  )

  return { html: processed, toc }
}

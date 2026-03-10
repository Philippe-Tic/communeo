import type { DilaMenuNode } from './comarquage-types'

type Audience = 'particuliers' | 'professionnels'

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337'
const STRAPI_TOKEN = import.meta.env.STRAPI_TOKEN || ''

export async function getComarquageCategories(audience: Audience): Promise<DilaMenuNode[]> {
  const url = `${STRAPI_URL}/api/comarquage/categories/${audience}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (STRAPI_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_TOKEN}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`Comarquage categories ${audience}: HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? []
}

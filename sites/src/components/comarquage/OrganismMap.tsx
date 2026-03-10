import { useEffect, useState, useRef } from 'preact/hooks'
import type { DilaServiceInfo, DilaContentNode } from '../../utils/comarquage-types'

declare const L: any

interface Props {
  organisms: DilaServiceInfo[]
}

interface MarkerData {
  lat: number
  lng: number
  label: string
  title: string
  type: string
}

const typeLabels: Record<string, string> = {
  'mairie': 'Mairie',
  'prefecture': 'Prefecture',
  'sous_pref': 'Sous-prefecture',
  'caf': 'CAF',
  'cpam': 'CPAM',
  'urssaf': 'URSSAF',
  'pole_emploi': 'France Travail',
  'tribunal': 'Tribunal',
}

function extractPlainText(nodes: DilaContentNode[]): string {
  let text = ''
  for (const node of nodes) {
    if (node.text) {
      text += node.text + ' '
    }
    if (node.children && node.children.length > 0) {
      text += extractPlainText(node.children) + ' '
    }
  }
  return text.trim()
}

function cleanAddressText(raw: string): string {
  let cleaned = raw
  // Remove phone numbers (French formats)
  cleaned = cleaned.replace(/(\+33|0033)[\s.\-]?\d[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}/g, '')
  cleaned = cleaned.replace(/0\d[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}/g, '')
  // Remove email addresses
  cleaned = cleaned.replace(/[\w.\-]+@[\w.\-]+\.\w+/g, '')
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '')
  // Remove schedule/hours patterns
  cleaned = cleaned.replace(/\d{1,2}\s?[hH]\s?\d{0,2}\s?(à|a|-)\s?\d{1,2}\s?[hH]\s?\d{0,2}/g, '')
  cleaned = cleaned.replace(/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)[\s\S]{0,50}?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/gi, '')
  cleaned = cleaned.replace(/(ouvert|ferme|horaires?|accueil)\s*:?[^.]*\./gi, '')
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned
}

async function geocodeAddress(text: string): Promise<{ lat: number; lng: number; label: string } | null> {
  if (!text || text.length < 5) return null
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search?q=${encodeURIComponent(text)}&limit=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.features || data.features.length === 0) return null
    const feature = data.features[0]
    if (feature.properties.score < 0.5) return null
    const [lng, lat] = feature.geometry.coordinates
    return { lat, lng, label: feature.properties.label }
  } catch {
    return null
  }
}

async function loadLeaflet(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).L) {
    return (window as any).L
  }

  // Load CSS
  if (!document.querySelector('link[href*="leaflet"]')) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }

  // Load JS
  return new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve((window as any).L)
    script.onerror = () => reject(new Error('Failed to load Leaflet'))
    document.head.appendChild(script)
  })
}

export default function OrganismMap({ organisms }: Props) {
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // IntersectionObserver for lazy loading
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observerRef.current?.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observerRef.current.observe(el)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  // Geocode organisms when visible
  useEffect(() => {
    if (!isVisible) return

    const geocodable = organisms.filter(org => org.texte && org.texte.length > 0)
    if (geocodable.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false

    Promise.allSettled(
      geocodable.map(async org => {
        const raw = extractPlainText(org.texte!)
        const cleaned = cleanAddressText(raw)
        const result = await geocodeAddress(cleaned)
        if (result) {
          return {
            lat: result.lat,
            lng: result.lng,
            label: result.label,
            title: org.title,
            type: org.type,
          } as MarkerData
        }
        return null
      })
    ).then(results => {
      if (cancelled) return
      const valid = results
        .filter((r): r is PromiseFulfilledResult<MarkerData | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((m): m is MarkerData => m !== null)
      setMarkers(valid)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [isVisible, organisms])

  // Init map when markers are ready
  useEffect(() => {
    if (loading || markers.length === 0) return

    const mapContainer = document.getElementById('organism-map')
    if (!mapContainer) return

    let map: any = null

    loadLeaflet()
      .then(leaflet => {
        if (!mapContainer.isConnected) return

        map = leaflet.map('organism-map')
        mapRef.current = map

        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)

        const leafletMarkers = markers.map(m => {
          const badge = typeLabels[m.type] || m.type
          const popup = `
            <div style="min-width: 180px">
              <strong>${m.title}</strong>
              ${badge ? `<br><span style="display:inline-block;margin-top:4px;padding:1px 8px;border-radius:9999px;font-size:11px;background:#f3f4f6;color:#4b5563">${badge}</span>` : ''}
              <br><span style="font-size:12px;color:#6b7280;margin-top:4px;display:inline-block">${m.label}</span>
            </div>
          `
          return leaflet.marker([m.lat, m.lng]).addTo(map).bindPopup(popup)
        })

        if (markers.length === 1) {
          map.setView([markers[0].lat, markers[0].lng], 15)
        } else {
          const group = leaflet.featureGroup(leafletMarkers)
          map.fitBounds(group.getBounds(), { padding: [40, 40] })
        }
      })
      .catch(() => {
        // Leaflet failed to load — silently degrade
      })

    return () => {
      if (map) {
        map.remove()
        mapRef.current = null
      }
    }
  }, [loading, markers])

  // Don't render anything if no markers after geocoding
  if (!loading && markers.length === 0) return null

  return (
    <div ref={containerRef} class="mt-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Localisation
      </h3>

      {loading ? (
        <div class="h-80 rounded-xl border border-gray-200 overflow-hidden bg-gray-100 animate-pulse flex items-center justify-center">
          <div class="text-gray-400 text-sm">Chargement de la carte...</div>
        </div>
      ) : (
        <div
          id="organism-map"
          class="h-80 rounded-xl border border-gray-200 overflow-hidden"
        />
      )}
    </div>
  )
}

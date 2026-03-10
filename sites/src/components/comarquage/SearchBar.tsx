import { useEffect, useState, useRef, useCallback } from 'preact/hooks'
import type { DilaMenuNode } from '../../utils/comarquage-types'
import SearchResults from './SearchResults'

const STRAPI_URL = (import.meta as any).env.STRAPI_PUBLIC_URL as string

interface Props {
  defaultAudience: string
}

export default function SearchBar({ defaultAudience }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DilaMenuNode[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [audience, setAudience] = useState(defaultAudience)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Listen to audience-change custom event
  useEffect(() => {
    // Init from DOM if a tab is already active
    const activeTab = document.querySelector<HTMLElement>('[data-audience-tab][aria-selected="true"]')
    if (activeTab?.dataset.audienceTab) {
      setAudience(activeTab.dataset.audienceTab)
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.audience) {
        setAudience(detail.audience)
      }
    }

    document.addEventListener('audience-change', handler)
    return () => document.removeEventListener('audience-change', handler)
  }, [])

  // Toggle audience content panels visibility
  const setPanelsVisible = useCallback((visible: boolean) => {
    const panels = document.querySelectorAll<HTMLElement>('[data-audience-content]')
    panels.forEach((panel) => {
      if (visible) {
        // Restore: show the panel matching the current audience, hide others
        const activeTab = document.querySelector<HTMLElement>('[data-audience-tab][aria-selected="true"]')
        const currentAudience = activeTab?.dataset.audienceTab || defaultAudience
        panel.classList.toggle('hidden', panel.dataset.audienceContent !== currentAudience)
      } else {
        panel.classList.add('hidden')
      }
    })
  }, [defaultAudience])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (query.trim().length < 2) {
      setResults(null)
      setLoading(false)
      setPanelsVisible(true)
      return
    }

    setLoading(true)

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller

      fetch(`${STRAPI_URL}/api/comarquage/search/${audience}?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Erreur de recherche')
          return res.json()
        })
        .then((data) => {
          setResults(data.data || [])
          setLoading(false)
          setPanelsVisible(false)
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setResults([])
            setLoading(false)
            setPanelsVisible(false)
          }
        })
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [query, audience, setPanelsVisible])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults(null)
    setLoading(false)
    setPanelsVisible(true)
  }, [setPanelsVisible])

  return (
    <div class="mt-4">
      <div class="relative">
        {/* Search icon */}
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>

        <input
          type="search"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Rechercher une démarche..."
          class="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          aria-label="Rechercher une démarche"
        />

        {/* Loading spinner or clear button */}
        {loading ? (
          <div class="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              class="w-5 h-5 text-gray-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Effacer la recherche"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {results !== null && (
        <SearchResults results={results} audience={audience} query={query} />
      )}
    </div>
  )
}

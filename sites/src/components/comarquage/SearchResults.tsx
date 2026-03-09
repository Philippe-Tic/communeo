import type { DilaMenuNode } from '../../utils/comarquage-types'

interface Props {
  results: DilaMenuNode[]
  audience: string
  query: string
}

const typeLabels: Record<string, string> = {
  theme: 'Thème',
  sousTheme: 'Sous-thème',
  dossier: 'Dossier',
}

const badgeColors: Record<string, string> = {
  theme: 'bg-blue-100 text-blue-700',
  sousTheme: 'bg-purple-100 text-purple-700',
  dossier: 'bg-amber-100 text-amber-700',
}

export default function SearchResults({ results, audience, query }: Props) {
  if (results.length === 0) {
    return (
      <div class="mt-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <svg
          class="w-12 h-12 text-gray-300 mx-auto mb-4"
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
        <p class="text-gray-900 font-semibold mb-1">Aucun résultat</p>
        <p class="text-sm text-gray-500">
          Essayez avec d'autres mots-clés ou vérifiez l'orthographe de votre recherche.
        </p>
      </div>
    )
  }

  return (
    <div class="mt-6">
      <p class="text-sm text-gray-600 mb-4">
        {results.length} résultat{results.length > 1 ? 's' : ''} pour «&nbsp;{query}&nbsp;»
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((node) => (
          <a
            key={node.id}
            href={`/demarches/fiche?id=${node.id}&audience=${audience}`}
            class="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all"
          >
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-sm font-semibold text-gray-900 group-hover:text-primary-text transition-colors leading-snug">
                {node.title}
              </h3>
              <span
                class={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColors[node.type] || 'bg-gray-100 text-gray-600'}`}
              >
                {typeLabels[node.type] || node.type}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

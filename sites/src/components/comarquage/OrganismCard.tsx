import type { DilaServiceInfo } from '../../utils/comarquage-types'
import ContentNode from './ContentNode'

interface Props {
  organism: DilaServiceInfo
  audience: string
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

export default function OrganismCard({ organism, audience }: Props) {
  return (
    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h4 class="font-semibold text-gray-900">{organism.title}</h4>
        {organism.type && (
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0">
            {typeLabels[organism.type] || organism.type}
          </span>
        )}
      </div>
      {organism.url && (
        <a
          href={organism.url}
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-[rgb(var(--color-primary-text))] underline hover:no-underline break-all"
        >
          {organism.url}
        </a>
      )}
      {organism.texte && organism.texte.length > 0 && (
        <div class="mt-3 text-sm text-gray-600">
          {organism.texte.map((node, i) => (
            <ContentNode key={i} node={node} audience={audience} />
          ))}
        </div>
      )}
    </div>
  )
}

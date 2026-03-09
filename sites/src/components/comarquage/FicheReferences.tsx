import type { DilaReferenceSection } from '../../utils/comarquage-types'
import ContentNode from './ContentNode'
import OrganismCard from './OrganismCard'
import OrganismMap from './OrganismMap'

interface Props {
  references: DilaReferenceSection
  audience: string
}

const serviceTypeLabels: Record<string, string> = {
  'teleservice': 'Teleservice',
  'formulaire': 'Formulaire',
  'simulateur': 'Simulateur',
}

export default function FicheReferences({ references, audience }: Props) {
  const {
    servicesEnLigne,
    ouSAdresser,
    references: textes,
    voirAussi,
    questionsReponses,
    pourEnSavoirPlus,
    definitions,
  } = references

  const hasContent =
    servicesEnLigne.length > 0 ||
    ouSAdresser.length > 0 ||
    textes.length > 0 ||
    voirAussi.length > 0 ||
    questionsReponses.length > 0 ||
    pourEnSavoirPlus.length > 0 ||
    definitions.length > 0

  if (!hasContent) return null

  return (
    <aside class="mt-12 pt-8 border-t border-gray-200 space-y-8">
      {/* Services en ligne */}
      {servicesEnLigne.length > 0 && (
        <section>
          <h2 class="text-xl font-bold text-gray-900 mb-4">Services en ligne</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {servicesEnLigne.map(service => (
              <a
                key={service.id}
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-[rgb(var(--color-primary))]/30 transition-all group"
              >
                <div class="flex items-start justify-between gap-2 mb-1">
                  <h3 class="font-semibold text-gray-900 group-hover:text-[rgb(var(--color-primary-text))] transition-colors">
                    {service.title}
                  </h3>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex-shrink-0">
                    {serviceTypeLabels[service.type] || service.type}
                  </span>
                </div>
                {service.numeroCerfa && (
                  <p class="text-xs text-gray-500">CERFA n° {service.numeroCerfa}</p>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Organismes */}
      {ouSAdresser.length > 0 && (
        <section>
          <h2 class="text-xl font-bold text-gray-900 mb-4">Ou s'adresser ?</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ouSAdresser.map(org => (
              <OrganismCard key={org.id} organism={org} audience={audience} />
            ))}
          </div>
          <OrganismMap organisms={ouSAdresser} />
        </section>
      )}

      {/* Textes de reference */}
      {textes.length > 0 && (
        <section>
          <h2 class="text-xl font-bold text-gray-900 mb-4">Textes de reference</h2>
          <ul class="space-y-2">
            {textes.map(ref => (
              <li key={ref.id}>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-[rgb(var(--color-primary-text))] underline hover:no-underline"
                >
                  {ref.title}
                </a>
                {ref.source && <span class="text-xs text-gray-500 ml-2">({ref.source})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Voir aussi */}
      {voirAussi.length > 0 && (
        <section>
          <h2 class="text-xl font-bold text-gray-900 mb-4">Voir aussi</h2>
          <ul class="space-y-2">
            {voirAussi.map(ref => (
              <li key={ref.id}>
                <a
                  href={`/demarches/fiche?id=${ref.id}&audience=${audience}`}
                  class="text-sm text-[rgb(var(--color-primary-text))] underline hover:no-underline"
                >
                  {ref.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Questions-reponses */}
      {questionsReponses.length > 0 && (
        <section>
          <h2 class="text-xl font-bold text-gray-900 mb-4">Questions ? Reponses !</h2>
          <ul class="space-y-2">
            {questionsReponses.map(ref => (
              <li key={ref.id}>
                <a
                  href={`/demarches/fiche?id=${ref.id}&audience=${audience}`}
                  class="text-sm text-[rgb(var(--color-primary-text))] underline hover:no-underline"
                >
                  {ref.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pour en savoir plus */}
      {pourEnSavoirPlus.length > 0 && (
        <section>
          <h2 class="text-xl font-bold text-gray-900 mb-4">Pour en savoir plus</h2>
          <ul class="space-y-2">
            {pourEnSavoirPlus.map(ref => (
              <li key={ref.id}>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-[rgb(var(--color-primary-text))] underline hover:no-underline"
                >
                  {ref.title}
                </a>
                {ref.source && <span class="text-xs text-gray-500 ml-2">({ref.source})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Definitions */}
      {definitions.length > 0 && (
        <section>
          <h2 class="text-xl font-bold text-gray-900 mb-4">Definitions</h2>
          <div class="space-y-2">
            {definitions.map(def => (
              <details key={def.id} class="group rounded-lg border border-gray-200 bg-white">
                <summary class="px-4 py-3 cursor-pointer font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                  {def.term}
                </summary>
                <div class="px-4 pb-4 text-sm text-gray-700">
                  {def.texte.map((node, i) => (
                    <ContentNode key={i} node={node} audience={audience} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}

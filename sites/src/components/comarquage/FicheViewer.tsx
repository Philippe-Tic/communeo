import { useEffect, useState } from 'preact/hooks'
import type { DilaFiche } from '../../utils/comarquage-types'
import FicheLoading from './FicheLoading'
import FicheError from './FicheError'
import ContentNode from './ContentNode'
import FicheReferences from './FicheReferences'

const STRAPI_URL = (import.meta as any).env.STRAPI_URL as string

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function FicheViewer() {
  const [fiche, setFiche] = useState<DilaFiche | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    const audience = params.get('audience')

    if (!id || !audience) {
      setError('Parametres manquants. Veuillez specifier un identifiant de fiche et une audience.')
      setLoading(false)
      return
    }

    if (!/^[A-Z]\d+$/.test(id)) {
      setError(`Identifiant de fiche invalide : "${id}".`)
      setLoading(false)
      return
    }

    if (audience !== 'particuliers' && audience !== 'professionnels') {
      setError(`Audience invalide : "${audience}". Valeurs acceptees : particuliers, professionnels.`)
      setLoading(false)
      return
    }

    const controller = new AbortController()

    fetch(`${STRAPI_URL}/api/comarquage/fiche/${audience}/${id}`, {
      signal: controller.signal,
    })
      .then(res => {
        if (res.status === 404) throw new Error('Fiche introuvable.')
        if (!res.ok) throw new Error('Erreur lors du chargement de la fiche.')
        return res.json()
      })
      .then(data => {
        const ficheData = data.data || data
        setFiche(ficheData)
        document.title = `${ficheData.title} - Fiche pratique`
        setLoading(false)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  if (loading) return <FicheLoading />
  if (error || !fiche) return <FicheError message={error || undefined} />

  return (
    <article>
      {/* Fil d'Ariane */}
      <nav aria-label="Fil d'Ariane" class="text-sm text-gray-500 mb-6">
        <ol class="flex flex-wrap items-center gap-1">
          <li>
            <a href="/" class="hover:text-[rgb(var(--color-primary-text))] transition-colors">Accueil</a>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li>
            <a href="/demarches" class="hover:text-[rgb(var(--color-primary-text))] transition-colors">Demarches</a>
          </li>
          {fiche.theme && (
            <>
              <li aria-hidden="true" class="text-gray-400">/</li>
              <li class="text-gray-600">{fiche.theme.title}</li>
            </>
          )}
          {fiche.sousTheme && (
            <>
              <li aria-hidden="true" class="text-gray-400">/</li>
              <li class="text-gray-600">{fiche.sousTheme.title}</li>
            </>
          )}
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium truncate max-w-xs">{fiche.title}</li>
        </ol>
      </nav>

      {/* Header */}
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-3">{fiche.title}</h1>
        {fiche.description && (
          <p class="text-lg text-gray-600 mb-3">{fiche.description}</p>
        )}
        <time class="text-sm text-gray-500" dateTime={fiche.dateModification}>
          Mis a jour le {formatDate(fiche.dateModification)}
        </time>
      </header>

      {/* Dossier pere */}
      {fiche.dossierPere && (
        <aside class="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h2 class="font-semibold text-gray-900 mb-3">{fiche.dossierPere.title}</h2>
          <div class="space-y-3">
            {fiche.dossierPere.sousDossiers.map(sd => (
              <div key={sd.id}>
                <p class="text-sm font-medium text-gray-700 mb-1">{sd.title}</p>
                <ul class="space-y-1 pl-4">
                  {sd.fiches.map(f => (
                    <li key={f.id}>
                      {f.id === fiche.id ? (
                        <span class="text-sm font-semibold text-gray-900">{f.title}</span>
                      ) : (
                        <a
                          href={`/demarches/fiche?id=${f.id}&audience=${fiche.audience}`}
                          class="text-sm text-[rgb(var(--color-primary-text))] underline hover:no-underline"
                        >
                          {f.title}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Avertissement */}
      {fiche.avertissement && (
        <div class="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
          <ContentNode node={fiche.avertissement} audience={fiche.audience} />
        </div>
      )}

      {/* Introduction */}
      {fiche.introduction.map((node, i) => (
        <ContentNode key={`intro-${i}`} node={node} audience={fiche.audience} />
      ))}

      {/* Contenu principal */}
      {fiche.content.length > 0 ? (
        fiche.content.map((node, i) => (
          <ContentNode key={`content-${i}`} node={node} audience={fiche.audience} />
        ))
      ) : fiche.introduction.length === 0 && !fiche.dossierPere ? (
        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r text-gray-700">
          <p class="font-medium mb-2">Ce dossier regroupe plusieurs fiches pratiques.</p>
          <p class="text-sm text-gray-600">
            Consultez les rubriques associees ci-dessous pour trouver l'information recherchee.
          </p>
        </div>
      ) : null}

      {/* References */}
      <FicheReferences references={fiche.references} audience={fiche.audience} />
    </article>
  )
}

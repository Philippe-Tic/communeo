import type { DilaContentNode } from '../../utils/comarquage-types'
import TabGroup from './TabGroup'

interface Props {
  node: DilaContentNode
  audience: string
  depth?: number
}

function Heading({ depth, children }: { depth: number; children: preact.ComponentChildren }) {
  const level = Math.min(depth + 2, 4)
  const className = level === 2
    ? 'text-2xl font-bold text-gray-900 mt-8 mb-4'
    : level === 3
      ? 'text-xl font-semibold text-gray-900 mt-6 mb-3'
      : 'text-lg font-semibold text-gray-900 mt-4 mb-2'

  if (level === 2) return <h2 class={className}>{children}</h2>
  if (level === 3) return <h3 class={className}>{children}</h3>
  return <h4 class={className}>{children}</h4>
}

function renderChildren(children: DilaContentNode[] | undefined, audience: string, depth: number) {
  if (!children || children.length === 0) return null
  return children.map((child, i) => (
    <ContentNode key={i} node={child} audience={audience} depth={depth} />
  ))
}

function extractFicheId(href: string): string | null {
  const match = href.match(/([A-Z]\d+)/)
  return match ? match[1] : null
}

export default function ContentNode({ node, audience, depth = 0 }: Props) {
  const { type, title, text, href, children, attributes } = node

  switch (type) {
    case 'chapitre':
      return (
        <section class="mb-6">
          {title && <Heading depth={depth}>{title}</Heading>}
          {renderChildren(children, audience, depth + 1)}
        </section>
      )

    case 'paragraphe':
      if (attributes?.src) {
        return <img src={attributes.src} alt={text || ''} class="my-4 max-w-full rounded" />
      }
      if (attributes?.videoUrl) {
        return (
          <iframe
            src={attributes.videoUrl}
            title={title || 'Video'}
            class="w-full aspect-video my-4 rounded"
            allowFullScreen
          />
        )
      }
      if (children && children.length > 0) {
        const hasBlockChildren = children.some(c =>
          ['chapitre', 'liste', 'tableau', 'blocCas', 'listeSituations', 'paragraphe'].includes(c.type)
        )
        if (hasBlockChildren) {
          return <div class="my-2">{renderChildren(children, audience, depth)}</div>
        }
        return <p class="my-2 text-gray-700 leading-relaxed">{renderChildren(children, audience, depth)}</p>
      }
      if (text) {
        return <p class="my-2 text-gray-700 leading-relaxed">{text}</p>
      }
      return null

    case 'liste': {
      const isOrdered = attributes?.listeType === 'numero'
      const items = children?.filter(c => c.type === 'element') || []
      const Tag = isOrdered ? 'ol' : 'ul'
      return (
        <Tag class={`my-3 pl-6 space-y-1 ${isOrdered ? 'list-decimal' : 'list-disc'} text-gray-700`}>
          {items.map((item, i) => (
            <li key={i}>{renderChildren(item.children, audience, depth)}</li>
          ))}
        </Tag>
      )
    }

    case 'element':
      return <>{renderChildren(children, audience, depth)}</>

    case 'tableau': {
      const rangees = children?.filter(c => c.type === 'rangee') || []
      const header = rangees[0]
      const body = rangees.slice(1)
      return (
        <div class="my-4 overflow-x-auto">
          <table class="w-full border-collapse border border-gray-200 text-sm">
            {header && (
              <thead class="bg-gray-50">
                <tr>
                  {header.children?.map((cell, i) => (
                    <th key={i} class="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-900">
                      {renderChildren(cell.children, audience, depth)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, i) => (
                <tr key={i} class={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.children?.map((cell, j) => (
                    <td key={j} class="border border-gray-200 px-3 py-2 text-gray-700">
                      {renderChildren(cell.children, audience, depth)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'blocCas':
    case 'listeSituations': {
      const situations = children?.filter(c => c.type === 'situation') || []
      const isTabbed = attributes?.affichage === 'onglet' || type === 'listeSituations'
      if (isTabbed && situations.length > 0) {
        const tabs = situations.map(s => ({
          title: s.title || 'Cas',
          children: s.children || [],
        }))
        return <TabGroup tabs={tabs} audience={audience} depth={depth} />
      }
      return (
        <div class="my-4 space-y-4">
          {situations.map((s, i) => (
            <div key={i} class="border-l-4 border-gray-300 pl-4">
              {s.title && <p class="font-semibold text-gray-900 mb-2">{s.title}</p>}
              {renderChildren(s.children, audience, depth)}
            </div>
          ))}
        </div>
      )
    }

    case 'situation':
      return (
        <div>
          {title && <p class="font-semibold text-gray-900 mb-2">{title}</p>}
          {renderChildren(children, audience, depth)}
        </div>
      )

    case 'aNoter':
    case 'aSavoir':
      return (
        <div class="my-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
          {title && <p class="font-semibold text-blue-900 mb-1">{title}</p>}
          <div class="text-blue-800 text-sm">{renderChildren(children, audience, depth)}</div>
        </div>
      )

    case 'attention':
      return (
        <div class="my-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
          {title && <p class="font-semibold text-amber-900 mb-1">{title}</p>}
          <div class="text-amber-800 text-sm">{renderChildren(children, audience, depth)}</div>
        </div>
      )

    case 'exemple':
      return (
        <div class="my-4 bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r">
          {title && <p class="font-semibold text-gray-900 mb-1">{title}</p>}
          <div class="text-gray-700 text-sm">{renderChildren(children, audience, depth)}</div>
        </div>
      )

    case 'rappel':
      return (
        <div class="my-4 bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r">
          {title && <p class="font-semibold text-purple-900 mb-1">{title}</p>}
          <div class="text-purple-800 text-sm">{renderChildren(children, audience, depth)}</div>
        </div>
      )

    case 'fragmentConditionne':
      return <>{renderChildren(children, audience, depth)}</>

    case 'miseEnEvidence':
      return <strong>{text || renderChildren(children, audience, depth)}</strong>

    case 'expression':
      return <em>{text || renderChildren(children, audience, depth)}</em>

    case 'lienExterne':
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          class="text-[rgb(var(--color-primary-text))] underline hover:no-underline"
        >
          {text || renderChildren(children, audience, depth)}
        </a>
      )

    case 'lienInterne':
    case 'lienIntra': {
      const ficheId = href ? extractFicheId(href) : null
      if (ficheId) {
        return (
          <a
            href={`/demarches/fiche?id=${ficheId}&audience=${audience}`}
            class="text-[rgb(var(--color-primary-text))] underline hover:no-underline"
          >
            {text || renderChildren(children, audience, depth)}
          </a>
        )
      }
      return <span>{text || renderChildren(children, audience, depth)}</span>
    }

    case 'valeur':
      return <span class="font-semibold">{text || renderChildren(children, audience, depth)}</span>

    case 'exposant':
      return <sup>{text || renderChildren(children, audience, depth)}</sup>

    case 'texte':
      if (text) return <>{text}</>
      return <>{renderChildren(children, audience, depth)}</>

    case 'rangee':
    case 'cellule':
      return <>{renderChildren(children, audience, depth)}</>

    default:
      if (text) return <span>{text}</span>
      if (children && children.length > 0) return <>{renderChildren(children, audience, depth)}</>
      return null
  }
}

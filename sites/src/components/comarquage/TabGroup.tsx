import { useState } from 'preact/hooks'
import type { DilaContentNode } from '../../utils/comarquage-types'
import ContentNode from './ContentNode'

interface Tab {
  title: string
  children: DilaContentNode[]
}

interface Props {
  tabs: Tab[]
  audience: string
  depth?: number
}

export default function TabGroup({ tabs, audience, depth = 0 }: Props) {
  const [activeTab, setActiveTab] = useState(0)

  if (tabs.length === 0) return null

  return (
    <div class="my-4">
      <div role="tablist" class="flex flex-wrap gap-1 border-b border-gray-200 mb-4">
        {tabs.map((tab, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === activeTab}
            aria-controls={`tabpanel-${i}`}
            id={`tab-${i}`}
            class={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              i === activeTab
                ? 'bg-[rgb(var(--color-primary))] text-[rgb(var(--color-on-primary))]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab(i)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={i}
          role="tabpanel"
          id={`tabpanel-${i}`}
          aria-labelledby={`tab-${i}`}
          hidden={i !== activeTab}
        >
          {i === activeTab &&
            tab.children.map((child, j) => (
              <ContentNode key={j} node={child} audience={audience} depth={depth} />
            ))
          }
        </div>
      ))}
    </div>
  )
}

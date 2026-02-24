import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'

const CALLOUT_TYPES = {
  info: { icon: Info, label: 'Info', color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' },
  warning: { icon: AlertTriangle, label: 'Attention', color: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' },
  success: { icon: CheckCircle, label: 'Succès', color: 'border-green-400 bg-green-50 dark:bg-green-950/30' },
  danger: { icon: AlertCircle, label: 'Danger', color: 'border-red-400 bg-red-50 dark:bg-red-950/30' },
} as const

type CalloutType = keyof typeof CALLOUT_TYPES

function CalloutView({ node, updateAttributes }: any) {
  const type: CalloutType = node.attrs.calloutType || 'info'
  const config = CALLOUT_TYPES[type]
  const Icon = config.icon

  return (
    <NodeViewWrapper>
      <div className={cn('callout my-4 flex gap-3 rounded-lg border-l-4 p-4', config.color)}>
        <div className="flex shrink-0 items-start pt-0.5">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {/* Type selector */}
          <div className="mb-2">
            <select
              value={type}
              onChange={(e) => updateAttributes({ calloutType: e.target.value })}
              className="rounded border bg-background/50 px-2 py-0.5 text-xs"
              contentEditable={false}
            >
              {Object.entries(CALLOUT_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <NodeViewContent className="callout-content" />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const Callout = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  addAttributes() {
    return {
      calloutType: {
        default: 'info',
        parseHTML: (el) => el.getAttribute('data-callout-type') || 'info',
        renderHTML: (attrs) => ({ 'data-callout-type': attrs.calloutType }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div.callout' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ class: 'callout' }, HTMLAttributes),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView)
  },

  addCommands() {
    return {
      setCallout:
        (attrs?: { calloutType?: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { calloutType: attrs?.calloutType || 'info' },
            content: [{ type: 'paragraph' }],
          })
        },
    } as any
  },
})

import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance } from 'tippy.js'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import {
  Heading2,
  Heading3,
  Heading4,
  Image,
  Video,
  Table,
  Quote,
  Minus,
  MousePointerClick,
  CheckSquare,
  Info,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
  title: string
  description: string
  icon: LucideIcon
  command: (props: { editor: any; range: any }) => void
}

const COMMANDS: CommandItem[] = [
  {
    title: 'Titre 2',
    description: 'Titre de section',
    icon: Heading2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    },
  },
  {
    title: 'Titre 3',
    description: 'Sous-titre',
    icon: Heading3,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
    },
  },
  {
    title: 'Titre 4',
    description: 'Petit titre',
    icon: Heading4,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run()
    },
  },
  {
    title: 'Image',
    description: 'Insérer une image',
    icon: Image,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      // Trigger image picker via custom event
      editor.storage.slashCommands?.onImageRequest?.()
    },
  },
  {
    title: 'Vidéo',
    description: 'Intégrer une vidéo',
    icon: Video,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      editor.storage.slashCommands?.onVideoRequest?.()
    },
  },
  {
    title: 'Tableau',
    description: 'Insérer un tableau',
    icon: Table,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
  },
  {
    title: 'Citation',
    description: 'Bloc de citation',
    icon: Quote,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
  {
    title: 'Séparateur',
    description: 'Ligne horizontale',
    icon: Minus,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
  {
    title: 'Liste de tâches',
    description: 'Checklist avec cases à cocher',
    icon: CheckSquare,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
  },
  {
    title: 'Encart info',
    description: 'Bloc d\'information coloré',
    icon: Info,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      ;(editor.commands as any).setCallout({ calloutType: 'info' })
    },
  },
  {
    title: 'Bouton CTA',
    description: 'Bouton d\'appel à l\'action',
    icon: MousePointerClick,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      editor.storage.slashCommands?.onCtaRequest?.()
    },
  },
]

// --- Command List Component ---

interface CommandListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
}

const CommandList = forwardRef<any, CommandListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        if (items[selectedIndex]) {
          command(items[selectedIndex])
        }
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="rounded-md border bg-popover p-2 shadow-md">
        <p className="text-sm text-muted-foreground">Aucune commande trouvée</p>
      </div>
    )
  }

  return (
    <div className="max-h-[300px] w-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={item.title}
            type="button"
            className={cn(
              'flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
              index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
})

CommandList.displayName = 'CommandList'

// --- Suggestion Config ---

const suggestionConfig: Omit<SuggestionOptions, 'editor'> = {
  items: ({ query }) => {
    return COMMANDS.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    )
  },

  command: ({ editor, range, props }: { editor: any; range: any; props: CommandItem }) => {
    props.command({ editor, range })
  },

  render: () => {
    let component: ReactRenderer<any> | null = null
    let popup: Instance[] | null = null

    return {
      onStart: (props) => {
        component = new ReactRenderer(CommandList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) return

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as any,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props) {
        component?.updateProps(props)

        if (!props.clientRect) return

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect as any,
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide()
          return true
        }
        return component?.ref?.onKeyDown(props) ?? false
      },

      onExit() {
        popup?.[0]?.destroy()
        component?.destroy()
      },
    }
  },

  char: '/',
  allowSpaces: false,
  startOfLine: true,
}

// --- Extension ---

export interface SlashCommandsStorage {
  onImageRequest?: () => void
  onVideoRequest?: () => void
  onCtaRequest?: () => void
}

export const SlashCommands = Extension.create<Record<string, never>, SlashCommandsStorage>({
  name: 'slashCommands',

  addStorage() {
    return {
      onImageRequest: undefined,
      onVideoRequest: undefined,
      onCtaRequest: undefined,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...suggestionConfig,
      }),
    ]
  },
})

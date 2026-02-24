import { Heading2, Heading3, Heading4 } from 'lucide-react'
import { ToolbarButton } from './ToolbarButton'
import type { Editor } from '../types'

interface HeadingDropdownProps {
  editor: Editor
}

export function HeadingDropdown({ editor }: HeadingDropdownProps) {
  return (
    <>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        active={editor.isActive('heading', { level: 2 })}
        title="Titre 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        active={editor.isActive('heading', { level: 3 })}
        title="Titre 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 4 }).run()
        }
        active={editor.isActive('heading', { level: 4 })}
        title="Titre 4"
      >
        <Heading4 className="h-4 w-4" />
      </ToolbarButton>
    </>
  )
}

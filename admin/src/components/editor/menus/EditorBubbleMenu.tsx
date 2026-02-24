import { BubbleMenu } from '@tiptap/react/menus'
import { Bold, Italic, Link as LinkIcon, Underline as UnderlineIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Editor } from '../types'

interface EditorBubbleMenuProps {
  editor: Editor
  onOpenLinkDialog: () => void
}

function BubbleButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'rounded p-1.5 text-popover-foreground hover:bg-muted/80',
        active && 'bg-muted text-foreground'
      )}
    >
      {children}
    </button>
  )
}

export function EditorBubbleMenu({ editor, onOpenLinkDialog }: EditorBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
    >
      <BubbleButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Gras"
      >
        <Bold className="h-4 w-4" />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italique"
      >
        <Italic className="h-4 w-4" />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Souligné"
      >
        <UnderlineIcon className="h-4 w-4" />
      </BubbleButton>
      <div className="mx-0.5 w-px self-stretch bg-border" />
      <BubbleButton
        onClick={onOpenLinkDialog}
        active={editor.isActive('link')}
        title="Lien"
      >
        <LinkIcon className="h-4 w-4" />
      </BubbleButton>
    </BubbleMenu>
  )
}

import type { Editor } from '../types'

interface EditorFooterProps {
  editor: Editor
}

export function EditorFooter({ editor }: EditorFooterProps) {
  const characters = editor.storage.characterCount?.characters() ?? 0
  const words = editor.storage.characterCount?.words() ?? 0

  return (
    <div className="flex items-center justify-end gap-3 border-t border-input px-3 py-1.5 text-xs text-muted-foreground">
      <span>{words} {words <= 1 ? 'mot' : 'mots'}</span>
      <span className="text-border">·</span>
      <span>{characters} {characters <= 1 ? 'caractère' : 'caractères'}</span>
    </div>
  )
}

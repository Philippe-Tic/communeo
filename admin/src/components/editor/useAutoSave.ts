import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from './types'

const AUTOSAVE_DELAY = 30_000 // 30 seconds

function getStorageKey(formId: string): string {
  return `editor_autosave_${formId}`
}

interface UseAutoSaveOptions {
  editor: Editor | null
  formId: string | undefined
  enabled: boolean
}

interface UseAutoSaveReturn {
  hasDraft: boolean
  restoreDraft: () => void
  dismissDraft: () => void
}

export function useAutoSave({ editor, formId, enabled }: UseAutoSaveOptions): UseAutoSaveReturn {
  const [hasDraft, setHasDraft] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)

  const storageKey = formId ? getStorageKey(formId) : null

  // Check for existing draft on mount
  useEffect(() => {
    if (!storageKey || !enabled || !editor) return

    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const { content, timestamp } = JSON.parse(saved)
        // Only show restoration if draft is less than 7 days old
        const age = Date.now() - timestamp
        if (age < 7 * 24 * 60 * 60 * 1000 && content && content !== editor.getHTML()) {
          setHasDraft(true)
        } else {
          localStorage.removeItem(storageKey)
        }
      } catch {
        localStorage.removeItem(storageKey)
      }
    }
  }, [storageKey, enabled, editor])

  // Auto-save on content change (debounced)
  const scheduleSave = useCallback(() => {
    if (!storageKey || !enabled || !editor) return

    if (timerRef.current) clearTimeout(timerRef.current)

    isDirtyRef.current = true

    timerRef.current = setTimeout(() => {
      const html = editor.getHTML()
      if (html && html !== '<p></p>') {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ content: html, timestamp: Date.now() })
        )
      }
      isDirtyRef.current = false
    }, AUTOSAVE_DELAY)
  }, [storageKey, enabled, editor])

  // Listen to editor updates
  useEffect(() => {
    if (!editor || !enabled) return
    editor.on('update', scheduleSave)
    return () => {
      editor.off('update', scheduleSave)
    }
  }, [editor, enabled, scheduleSave])

  // Beforeunload warning
  useEffect(() => {
    if (!enabled) return

    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [enabled])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const restoreDraft = useCallback(() => {
    if (!storageKey || !editor) return

    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const { content } = JSON.parse(saved)
        editor.commands.setContent(content)
      } catch {
        // ignore
      }
    }
    setHasDraft(false)
    localStorage.removeItem(storageKey)
  }, [storageKey, editor])

  const dismissDraft = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey)
    }
    setHasDraft(false)
  }, [storageKey])

  return { hasDraft, restoreDraft, dismissDraft }
}

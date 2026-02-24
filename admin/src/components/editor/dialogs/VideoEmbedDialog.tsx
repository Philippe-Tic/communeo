import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Editor } from '../types'

interface VideoEmbedDialogProps {
  editor: Editor
  open: boolean
  onOpenChange: (open: boolean) => void
}

function extractVideoUrl(input: string): string | null {
  // YouTube
  const ytMatch = input.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  )
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  // Dailymotion
  const dmMatch = input.match(
    /(?:dailymotion\.com\/video\/|dai\.ly\/)([\w]+)/
  )
  if (dmMatch) return `https://www.dailymotion.com/embed/video/${dmMatch[1]}`

  return null
}

export function VideoEmbedDialog({ editor, open, onOpenChange }: VideoEmbedDialogProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setUrl('')
      setError('')
    }
    onOpenChange(isOpen)
  }

  const confirmVideo = () => {
    const embedUrl = extractVideoUrl(url)
    if (!embedUrl) {
      setError('URL non reconnue. Collez un lien YouTube ou Dailymotion.')
      return
    }

    editor
      .chain()
      .focus()
      .insertContent(
        `<div class="video-embed"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`
      )
      .run()

    onOpenChange(false)
    setUrl('')
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Intégrer une vidéo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div>
            <Label className="mb-2">URL de la vidéo</Label>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && confirmVideo()}
            />
            {error && (
              <p className="mt-1.5 text-sm text-destructive">{error}</p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Supporte YouTube et Dailymotion
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={confirmVideo} disabled={!url}>
            Intégrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

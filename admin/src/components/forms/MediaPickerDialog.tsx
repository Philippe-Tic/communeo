import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  useMediaItems,
  useUploadMedia,
  type MediaItem,
} from '@/hooks/api/useMediaLibrary'
import { toaster } from '@/lib/toaster'
import { FileText, Film, Image, Loader2, Search, Upload } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

function getMediaUrl(url: string) {
  return url.startsWith('http') ? url : `${API_URL}${url}`
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return Image
  if (mime.startsWith('video/')) return Film
  return FileText
}

interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (media: {
    url: string
    alt: string
    name: string
    fileId?: number
    documentId?: string
    mime?: string
    size?: number
    ext?: string
  }) => void
  accept?: 'image' | 'video' | 'file' | 'all'
  /** Show external URL tab */
  showUrlTab?: boolean
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  accept = 'all',
  showUrlTab = false,
}: MediaPickerDialogProps) {
  const [tab, setTab] = useState<'library' | 'url'>('library')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [externalAlt, setExternalAlt] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fileType = accept === 'all' ? undefined : accept
  const { data: mediaData, isLoading } = useMediaItems({
    pageSize: 30,
    search: search || undefined,
    fileType,
  })

  const uploadMutation = useUploadMedia()

  const handleUpload = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        const uploaded = await uploadMutation.mutateAsync({
          file,
          name: file.name.replace(/\.[^/.]+$/, ''),
        })
        setSelected(uploaded)
        toaster.create({
          title: 'Média uploadé',
          type: 'success',
          duration: 2000,
        })
      } catch {
        toaster.create({
          title: 'Erreur d\'upload',
          type: 'error',
          duration: 5000,
        })
      }
    }
  }, [uploadMutation])

  const handleConfirmLibrary = () => {
    if (!selected) return
    onSelect({
      url: getMediaUrl(selected.file.url),
      alt: selected.alt_text || selected.name,
      name: selected.name,
      fileId: selected.file.id,
      documentId: selected.file.documentId,
      mime: selected.file.mime,
      size: selected.file.size,
      ext: selected.file.ext,
    })
    resetAndClose()
  }

  const handleConfirmUrl = () => {
    if (!externalUrl) return
    onSelect({
      url: externalUrl,
      alt: externalAlt,
      name: externalAlt || 'Image externe',
    })
    resetAndClose()
  }

  const resetAndClose = () => {
    setSelected(null)
    setSearch('')
    setExternalUrl('')
    setExternalAlt('')
    setTab('library')
    onOpenChange(false)
  }

  const items = mediaData?.data || []

  const acceptAttr = accept === 'image' ? 'image/*' : accept === 'video' ? 'video/*' : undefined

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v) }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choisir un média</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        {showUrlTab && (
          <div className="flex border-b">
            <button
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                tab === 'library'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setTab('library')}
            >
              Bibliothèque
            </button>
            <button
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                tab === 'url'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setTab('url')}
            >
              URL externe
            </button>
          </div>
        )}

        {tab === 'library' ? (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Search + upload bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                Uploader
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttr}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleUpload(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto min-h-[200px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                  <Image className="h-8 w-8" />
                  <p className="text-sm">Aucun média trouvé</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {items.map((item) => {
                    const isImage = item.file.mime.startsWith('image/')
                    const Icon = getFileIcon(item.file.mime)
                    const isSelected = selected?.documentId === item.documentId

                    return (
                      <button
                        key={item.documentId}
                        onClick={() => setSelected(isSelected ? null : item)}
                        className={cn(
                          'group relative flex flex-col overflow-hidden rounded-md border bg-card transition-all hover:shadow',
                          isSelected && 'ring-2 ring-primary'
                        )}
                      >
                        <div className="aspect-square w-full overflow-hidden bg-muted">
                          {isImage ? (
                            <img
                              src={getMediaUrl(item.file.url)}
                              alt={item.alt_text || item.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Icon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="truncate px-1.5 py-1 text-[10px]">{item.name}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">URL de l'image</label>
              <Input
                placeholder="https://..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Texte alternatif</label>
              <Input
                placeholder="Description de l'image"
                value={externalAlt}
                onChange={(e) => setExternalAlt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && externalUrl && handleConfirmUrl()}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Annuler
          </Button>
          {tab === 'library' ? (
            <Button onClick={handleConfirmLibrary} disabled={!selected}>
              Sélectionner
            </Button>
          ) : (
            <Button onClick={handleConfirmUrl} disabled={!externalUrl}>
              Insérer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { uploadFile, type StrapiMedia } from '@/hooks/api/useOfficialDocuments'
import { MediaPickerDialog } from './MediaPickerDialog'
import { FolderOpen, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

interface ImagePickerProps {
  value?: StrapiMedia | null
  onChange: (media: StrapiMedia | null) => void
  error?: boolean
  className?: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

export function ImagePicker({ value, onChange, error, className }: ImagePickerProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const imageUrl = value?.url
    ? value.url.startsWith('http')
      ? value.url
      : `${API_URL}${value.url}`
    : null

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const media = await uploadFile(file)
      onChange(media)
    } catch (err) {
      console.error('Erreur upload:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handlePickerSelect = (media: { url: string; alt: string; name: string }) => {
    onChange({
      id: 0,
      documentId: '',
      name: media.name,
      url: media.url,
      mime: 'image/jpeg',
      size: 0,
      ext: '',
    })
  }

  if (imageUrl && !uploading) {
    return (
      <>
        <div className={cn('relative group', className)}>
          <img
            src={imageUrl}
            alt={value?.name || ''}
            className={cn(
              'h-48 w-full rounded-lg border object-cover',
              error && 'border-destructive'
            )}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              Remplacer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setPickerOpen(true)}
            >
              <FolderOpen className="mr-1 h-3.5 w-3.5" />
              Bibliothèque
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onChange(null)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
        <MediaPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={handlePickerSelect}
          accept="image"
        />
      </>
    )
  }

  return (
    <>
      <div
        className={cn(
          'flex h-48 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-input hover:border-primary/50',
          error && 'border-destructive',
          className
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Envoi en cours...</p>
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Glissez une image ici
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                Choisir un fichier
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                <FolderOpen className="mr-1 h-3.5 w-3.5" />
                Bibliothèque
              </Button>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
        accept="image"
      />
    </>
  )
}

import { useState, useRef, useCallback } from 'react'
import { ConfirmDialog } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  useMediaItems,
  useUploadMedia,
  useUpdateMediaItem,
  useDeleteMediaItem,
  type MediaItem,
} from '../hooks/api'
import { toaster } from '../lib/toaster'
import { cn } from '../lib/utils'
import {
  Copy,
  FileText,
  Film,
  FolderOpen,
  Grid3X3,
  Image,
  List,
  Loader2,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Vidéos' },
  { value: 'file', label: 'Documents' },
]

const FOLDER_OPTIONS = [
  { value: '', label: 'Tous les dossiers' },
  { value: 'general', label: 'Général' },
  { value: 'articles', label: 'Articles' },
  { value: 'pages', label: 'Pages' },
  { value: 'events', label: 'Événements' },
]

function getMediaUrl(url: string) {
  return url.startsWith('http') ? url : `${API_URL}${url}`
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return Image
  if (mime.startsWith('video/')) return Film
  return FileText
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export const MediaLibrary = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [folder, setFolder] = useState('')
  const [fileType, setFileType] = useState<'' | 'image' | 'video' | 'file'>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: mediaData, isLoading } = useMediaItems({
    page: currentPage,
    pageSize: 24,
    search: search || undefined,
    folder: folder || undefined,
    fileType: (fileType || undefined) as 'image' | 'video' | 'file' | undefined,
  })

  const uploadMutation = useUploadMedia()
  const updateMutation = useUpdateMediaItem()
  const deleteMutation = useDeleteMediaItem()

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      try {
        await uploadMutation.mutateAsync({
          file,
          name: file.name.replace(/\.[^/.]+$/, ''),
          folder: folder || 'general',
        })
        toaster.create({
          title: 'Média uploadé',
          description: `"${file.name}" a été ajouté à la bibliothèque.`,
          type: 'success',
          duration: 3000,
        })
      } catch {
        toaster.create({
          title: 'Erreur d\'upload',
          description: `Impossible d'uploader "${file.name}".`,
          type: 'error',
          duration: 5000,
        })
      }
    }
  }, [uploadMutation, folder])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }, [handleUpload])

  const handleDelete = async () => {
    if (!itemToDelete) return
    try {
      await deleteMutation.mutateAsync(itemToDelete.documentId)
      if (selectedItem?.documentId === itemToDelete.documentId) {
        setSelectedItem(null)
      }
      toaster.create({
        title: 'Média supprimé',
        description: `"${itemToDelete.name}" a été supprimé.`,
        type: 'success',
        duration: 3000,
      })
      setItemToDelete(null)
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de supprimer ce média.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleSaveField = async (field: string) => {
    if (!selectedItem || !editValues[field]) return
    try {
      const updated = await updateMutation.mutateAsync({
        id: selectedItem.documentId,
        [field]: editValues[field],
      })
      setSelectedItem({ ...selectedItem, ...updated })
      setEditingField(null)
      toaster.create({
        title: 'Média mis à jour',
        type: 'success',
        duration: 2000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de mettre à jour ce média.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const copyUrl = (item: MediaItem) => {
    const url = getMediaUrl(item.file.url)
    navigator.clipboard.writeText(url)
    toaster.create({
      title: 'URL copiée',
      type: 'success',
      duration: 2000,
    })
  }

  const startEditing = (field: string, value: string) => {
    setEditingField(field)
    setEditValues({ [field]: value })
  }

  const items = mediaData?.data || []
  const pagination = mediaData?.meta?.pagination

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Médiathèque"
        subtitle="Gérez les images et fichiers de votre site"
        actions={[
          {
            label: 'Uploader',
            onClick: () => fileInputRef.current?.click(),
            loading: uploadMutation.isPending,
          },
        ]}
      />

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un média..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
            className="pl-9"
          />
        </div>

        <Select value={folder} onValueChange={(v) => { setFolder(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <FolderOpen className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Dossier" />
          </SelectTrigger>
          <SelectContent>
            {FOLDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value || '_all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fileType} onValueChange={(v) => { setFileType(v as any); setCurrentPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {FILE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value || '_all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-md border">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'rounded-l-md p-2 transition-colors',
              viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'rounded-r-md p-2 transition-colors',
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Upload drop zone + grid */}
      <div className="flex gap-6">
        <div
          className={cn(
            'flex-1 min-w-0 rounded-lg border-2 border-dashed transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-transparent'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Aucun média</p>
                <p className="text-sm text-muted-foreground">
                  Glissez des fichiers ici ou cliquez sur "Uploader"
                </p>
              </div>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Choisir des fichiers
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => {
                const isImage = item.file.mime.startsWith('image/')
                const Icon = getFileIcon(item.file.mime)
                const isSelected = selectedItem?.documentId === item.documentId

                return (
                  <button
                    key={item.documentId}
                    onClick={() => setSelectedItem(isSelected ? null : item)}
                    className={cn(
                      'group relative flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-all hover:shadow-md',
                      isSelected && 'ring-2 ring-primary'
                    )}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      {isImage ? (
                        <img
                          src={getMediaUrl(item.file.url)}
                          alt={item.alt_text || item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Icon className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(item.file.size)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {items.map((item) => {
                const isImage = item.file.mime.startsWith('image/')
                const Icon = getFileIcon(item.file.mime)
                const isSelected = selectedItem?.documentId === item.documentId

                return (
                  <button
                    key={item.documentId}
                    onClick={() => setSelectedItem(isSelected ? null : item)}
                    className={cn(
                      'flex w-full items-center gap-4 p-3 text-left transition-colors hover:bg-accent',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                      {isImage ? (
                        <img
                          src={getMediaUrl(item.file.url)}
                          alt={item.alt_text || item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.file.ext} - {formatFileSize(item.file.size)}
                        {item.folder !== 'general' && ` - ${item.folder}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); copyUrl(item) }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setItemToDelete(item) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} / {pagination.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pagination.pageCount}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <div className="hidden w-80 shrink-0 rounded-lg border bg-card p-4 lg:block">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Détails</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview */}
            <div className="mb-4 overflow-hidden rounded-lg border bg-muted">
              {selectedItem.file.mime.startsWith('image/') ? (
                <img
                  src={getMediaUrl(selectedItem.file.url)}
                  alt={selectedItem.alt_text || selectedItem.name}
                  className="w-full object-contain"
                  style={{ maxHeight: '200px' }}
                />
              ) : (
                <div className="flex h-32 items-center justify-center">
                  {(() => { const Icon = getFileIcon(selectedItem.file.mime); return <Icon className="h-12 w-12 text-muted-foreground" /> })()}
                </div>
              )}
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              {/* Name */}
              <div>
                <Label className="text-xs text-muted-foreground">Nom</Label>
                {editingField === 'name' ? (
                  <div className="flex gap-1">
                    <Input
                      value={editValues.name || ''}
                      onChange={(e) => setEditValues({ name: e.target.value })}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveField('name')}
                    />
                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleSaveField('name')}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p
                    className="cursor-pointer rounded px-1 py-0.5 text-sm hover:bg-accent"
                    onClick={() => startEditing('name', selectedItem.name)}
                  >
                    {selectedItem.name}
                  </p>
                )}
              </div>

              {/* Alt text */}
              <div>
                <Label className="text-xs text-muted-foreground">Texte alternatif</Label>
                {editingField === 'alt_text' ? (
                  <div className="flex gap-1">
                    <Input
                      value={editValues.alt_text || ''}
                      onChange={(e) => setEditValues({ alt_text: e.target.value })}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveField('alt_text')}
                    />
                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleSaveField('alt_text')}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p
                    className="cursor-pointer rounded px-1 py-0.5 text-sm italic text-muted-foreground hover:bg-accent"
                    onClick={() => startEditing('alt_text', selectedItem.alt_text || '')}
                  >
                    {selectedItem.alt_text || 'Cliquer pour ajouter'}
                  </p>
                )}
              </div>

              {/* Caption */}
              <div>
                <Label className="text-xs text-muted-foreground">Légende</Label>
                {editingField === 'caption' ? (
                  <div className="flex gap-1">
                    <Input
                      value={editValues.caption || ''}
                      onChange={(e) => setEditValues({ caption: e.target.value })}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveField('caption')}
                    />
                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleSaveField('caption')}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p
                    className="cursor-pointer rounded px-1 py-0.5 text-sm italic text-muted-foreground hover:bg-accent"
                    onClick={() => startEditing('caption', selectedItem.caption || '')}
                  >
                    {selectedItem.caption || 'Cliquer pour ajouter'}
                  </p>
                )}
              </div>

              {/* File info (read-only) */}
              <div className="space-y-1 border-t pt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Type</span>
                  <span>{selectedItem.file.mime}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taille</span>
                  <span>{formatFileSize(selectedItem.file.size)}</span>
                </div>
                {selectedItem.file.width && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span>{selectedItem.file.width} x {selectedItem.file.height}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Dossier</span>
                  <span>{selectedItem.folder}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyUrl(selectedItem)}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copier l'URL
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setItemToDelete(selectedItem)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleUpload(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer le média"
        message={`Êtes-vous sûr de vouloir supprimer "${itemToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={deleteMutation.isPending}
        type="danger"
      />
    </div>
  )
}

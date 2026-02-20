import { Badge } from '@/components/ui/badge'
import { Download, FileText } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingSpinner, StatusBadge } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  useDeleteOfficialDocument,
  useOfficialDocument,
  usePublishOfficialDocument,
  useArchiveOfficialDocument,
} from '../hooks/api/useOfficialDocuments'
import { DOCUMENT_TYPE_COLORS, DOCUMENT_TYPE_LABELS } from '../lib/official-document-types'
import { toaster } from '../lib/toaster'

export function OfficialDocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: doc, isLoading, error } = useOfficialDocument(id || '')
  const deleteMutation = useDeleteOfficialDocument()
  const publishMutation = usePublishOfficialDocument()
  const archiveMutation = useArchiveOfficialDocument()

  const handleDelete = async () => {
    if (!doc) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le document "${doc.title}" ?`)) {
      try {
        await deleteMutation.mutateAsync(doc.documentId)
        toaster.create({
          title: 'Document supprimé',
          description: `Le document "${doc.title}" a été supprimé avec succès.`,
          type: 'success',
          duration: 3000,
        })
        navigate('/documents')
      } catch {
        toaster.create({
          title: 'Erreur',
          description: 'Une erreur est survenue lors de la suppression.',
          type: 'error',
          duration: 5000,
        })
      }
    }
  }

  const handlePublish = async () => {
    if (!doc) return

    try {
      await publishMutation.mutateAsync(doc.documentId)
      toaster.create({
        title: 'Document publié',
        description: `Le document "${doc.title}" a été publié avec succès.`,
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la publication.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleArchive = async () => {
    if (!doc) return

    try {
      await archiveMutation.mutateAsync(doc.documentId)
      toaster.create({
        title: 'Document archivé',
        description: `Le document "${doc.title}" a été archivé avec succès.`,
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: "Une erreur est survenue lors de l'archivage.",
        type: 'error',
        duration: 5000,
      })
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Chargement du document..." />
  }

  if (error || !doc) {
    return (
      <ErrorState
        title="Document non trouvé"
        message="Le document que vous recherchez n'existe pas ou n'a pas pu être chargé."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR')

  const fileUrl = doc.file?.url?.startsWith('http')
    ? doc.file.url
    : `${import.meta.env.VITE_API_URL}${doc.file?.url}`

  const headerActions = [
    {
      label: 'Retour',
      onClick: () => navigate('/documents'),
      variant: 'outline' as const,
      colorScheme: 'gray',
    },
    ...(doc.status !== 'published'
      ? [{
          label: 'Publier',
          onClick: handlePublish,
          variant: 'outline' as const,
          colorScheme: 'green',
          loading: publishMutation.isPending,
        }]
      : []),
    ...(doc.status !== 'archived'
      ? [{
          label: 'Archiver',
          onClick: handleArchive,
          variant: 'outline' as const,
          colorScheme: 'orange',
          loading: archiveMutation.isPending,
        }]
      : []),
    {
      label: 'Modifier',
      onClick: () => navigate(`/documents/${doc.documentId}/edit`),
      colorScheme: 'blue',
    },
    {
      label: 'Supprimer',
      onClick: handleDelete,
      variant: 'outline' as const,
      colorScheme: 'red',
      loading: deleteMutation.isPending,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={doc.title}
          subtitle={`/${doc.slug}`}
          actions={headerActions}
          breadcrumbs={[
            { label: 'Documents', href: '/documents' },
            { label: doc.title },
          ]}
        />

        <div className="rounded-md border bg-card p-6">
          <div className="flex flex-col gap-6">
            {/* Status and badges */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={doc.status} />
              <Badge className={DOCUMENT_TYPE_COLORS[doc.document_type] || ''}>
                {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
              </Badge>
            </div>

            {/* Document info */}
            <div>
              <p className="mb-2 font-medium text-muted-foreground">Informations</p>
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">
                  Date du document : {formatDate(doc.document_date)}
                </p>
                {doc.session_date && (
                  <p className="text-sm text-muted-foreground">
                    Date de session : {formatDate(doc.session_date)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Année : {doc.year}
                </p>
                {doc.reference_number && (
                  <p className="text-sm text-muted-foreground">
                    Numéro de référence : {doc.reference_number}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            {doc.description && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">Description</p>
                <p className="text-sm">{doc.description}</p>
              </div>
            )}

            {/* Main file */}
            {doc.file && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">Document principal</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-3 text-sm transition-colors hover:bg-muted"
                >
                  <FileText className="h-5 w-5 text-red-500" />
                  <span className="font-medium">{doc.file.name}</span>
                  <Download className="ml-2 h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            )}

            {/* Additional files */}
            {doc.additional_files && doc.additional_files.length > 0 && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">
                  Annexes ({doc.additional_files.length})
                </p>
                <div className="flex flex-col gap-2">
                  {doc.additional_files.map((file) => {
                    const url = file.url?.startsWith('http')
                      ? file.url
                      : `${import.meta.env.VITE_API_URL}${file.url}`
                    return (
                      <a
                        key={file.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{file.name}</span>
                        <Download className="ml-auto h-4 w-4 text-muted-foreground" />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <p className="mb-2 font-medium text-muted-foreground">Métadonnées</p>
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">
                  Créé le : {formatDate(doc.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Modifié le : {formatDate(doc.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

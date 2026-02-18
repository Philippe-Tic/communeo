import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Clock, Mail, Phone, Tag, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  useContactSubmission,
  useDeleteContactSubmission,
  useUpdateContactSubmission,
} from '../hooks/api/useContactSubmissions'
import { toaster } from '../lib/toaster'

const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  received: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Reçu' },
  in_progress: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'En cours' },
  resolved: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Résolu' },
  closed: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Fermé' },
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Général',
  urbanisme: 'Urbanisme',
  'etat-civil': 'État civil',
  voirie: 'Voirie',
  associations: 'Associations',
  rgpd: 'RGPD',
  autre: 'Autre',
}

export function ContactSubmissionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: submission, isLoading, error } = useContactSubmission(id || '')
  const updateMutation = useUpdateContactSubmission()
  const deleteMutation = useDeleteContactSubmission()

  const [responseText, setResponseText] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  const handleStatusChange = async (newStatus: string) => {
    if (!submission) return

    try {
      await updateMutation.mutateAsync({
        id: submission.documentId,
        status: newStatus as any,
      })
      toaster.create({
        title: 'Statut mis à jour',
        description: `Le statut a été changé en "${STATUS_CONFIG[newStatus]?.label || newStatus}".`,
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleSendResponse = async () => {
    if (!submission || !responseText.trim()) return

    try {
      await updateMutation.mutateAsync({
        id: submission.documentId,
        response: responseText.trim(),
        responded_at: new Date().toISOString(),
        status: 'resolved',
      })
      toaster.create({
        title: 'Réponse enregistrée',
        description: 'La réponse a été enregistrée et le statut mis à jour.',
        type: 'success',
        duration: 3000,
      })
      setResponseText('')
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la réponse.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleDelete = async () => {
    if (!submission) return

    if (window.confirm(`Supprimer le message "${submission.reference_number}" ?`)) {
      try {
        await deleteMutation.mutateAsync(submission.documentId)
        toaster.create({
          title: 'Message supprimé',
          type: 'success',
          duration: 3000,
        })
        navigate('/messages')
      } catch {
        toaster.create({
          title: 'Erreur',
          description: 'Impossible de supprimer le message.',
          type: 'error',
          duration: 5000,
        })
      }
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Chargement du message..." />
  }

  if (error || !submission) {
    return (
      <ErrorState
        title="Message non trouvé"
        message="Le message que vous recherchez n'existe pas ou n'a pas pu être chargé."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG.received

  const headerActions = [
    {
      label: 'Retour',
      onClick: () => navigate('/messages'),
      variant: 'outline' as const,
      colorScheme: 'gray',
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
          title={submission.reference_number}
          subtitle={submission.subject}
          actions={headerActions}
        />

        {/* Info cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Sender info */}
          <div className="rounded-md border bg-card p-5">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Expéditeur</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{submission.first_name} {submission.last_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${submission.email}`} className="text-primary hover:underline">
                  {submission.email}
                </a>
              </div>
              {submission.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{submission.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-md border bg-card p-5">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Informations</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span>{CATEGORY_LABELS[submission.category] || submission.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Reçu le {new Date(submission.createdAt).toLocaleString('fr-FR')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Status change */}
        <div className="rounded-md border bg-card p-5">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Changer le statut</h3>
          <div className="flex items-center gap-3">
            <select
              value={selectedStatus || submission.status}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="received">Reçu</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolu</option>
              <option value="closed">Fermé</option>
            </select>
            <Button
              size="sm"
              disabled={(!selectedStatus || selectedStatus === submission.status) || updateMutation.isPending}
              onClick={() => selectedStatus && handleStatusChange(selectedStatus)}
            >
              {updateMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>
        </div>

        {/* Message content */}
        <div className="rounded-md border bg-card p-5">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Message</h3>
          <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-sm">
            {submission.message}
          </div>
        </div>

        {/* Existing response */}
        {submission.response && (
          <div className="rounded-md border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950">
            <h3 className="mb-3 text-sm font-medium text-green-800 dark:text-green-200">
              Réponse envoyée
              {submission.responded_at && (
                <span className="ml-2 font-normal text-green-600 dark:text-green-400">
                  le {new Date(submission.responded_at).toLocaleString('fr-FR')}
                </span>
              )}
            </h3>
            <div
              className="prose prose-sm max-w-none text-green-800 dark:text-green-200"
              dangerouslySetInnerHTML={{ __html: submission.response }}
            />
          </div>
        )}

        {/* Response form */}
        {submission.status !== 'closed' && (
          <div className="rounded-md border bg-card p-5">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              {submission.response ? 'Nouvelle réponse' : 'Répondre'}
            </h3>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={5}
              placeholder="Saisissez votre réponse..."
              className="mb-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
            <Button
              onClick={handleSendResponse}
              disabled={!responseText.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Envoi...' : 'Enregistrer la réponse'}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              La réponse sera enregistrée et le statut passera automatiquement à "Résolu".
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

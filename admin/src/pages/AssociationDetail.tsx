import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, Mail, MapPin, Phone, UserCircle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  useAssociation,
  useDeleteAssociation,
  useUpdateAssociation,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  STATUS_CONFIG,
} from '../hooks/api/useAssociations'
import { formatDate } from '@/lib/format'
import { toaster } from '../lib/toaster'

export function AssociationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: association, isLoading, error } = useAssociation(id || '')
  const deleteMutation = useDeleteAssociation()
  const updateMutation = useUpdateAssociation()

  const handleDelete = async () => {
    if (!association) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${association.name}" ?`)) {
      try {
        await deleteMutation.mutateAsync(association.documentId)
        toaster.create({
          title: 'Association supprimée',
          description: `${association.name} a été supprimée avec succès.`,
          type: 'success',
          duration: 3000,
        })
        navigate('/associations')
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

  const handleApprove = async () => {
    if (!association) return

    try {
      await updateMutation.mutateAsync({
        id: association.documentId,
        status: 'published',
        reviewed_at: new Date().toISOString(),
      })
      toaster.create({
        title: 'Association approuvée',
        description: `${association.name} a été publiée avec succès.`,
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible d\'approuver l\'association.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleReject = async () => {
    if (!association) return

    try {
      await updateMutation.mutateAsync({
        id: association.documentId,
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      toaster.create({
        title: 'Association rejetée',
        description: `${association.name} a été rejetée.`,
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Impossible de rejeter l\'association.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Chargement de l'association..." />
  }

  if (error || !association) {
    return (
      <ErrorState
        title="Association non trouvée"
        message="L'association que vous recherchez n'existe pas ou n'a pas pu être chargée."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const statusConfig = STATUS_CONFIG[association.status]

  const headerActions = [
    {
      label: 'Retour',
      onClick: () => navigate('/associations'),
      variant: 'outline' as const,
      colorScheme: 'gray',
    },
    {
      label: 'Modifier',
      onClick: () => navigate(`/associations/${association.documentId}/edit`),
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
          title={association.name}
          subtitle={CATEGORY_LABELS[association.category]}
          actions={headerActions}
          breadcrumbs={[
            { label: 'Associations', href: '/associations' },
            { label: association.name },
          ]}
        />

        {/* Badges */}
        <div className="rounded-md border bg-card p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge className={CATEGORY_COLORS[association.category] || ''}>
                {CATEGORY_LABELS[association.category] || association.category}
              </Badge>
              <Badge className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
              {association.submission_source === 'public_form' && (
                <Badge variant="outline">Soumission publique</Badge>
              )}
            </div>

            {/* Logo */}
            {association.logo && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">Logo</p>
                <img
                  src={association.logo.url}
                  alt={association.name}
                  className="max-h-[200px] rounded-md object-contain"
                />
              </div>
            )}

            {/* Description */}
            {association.description && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">Description</p>
                <p className="whitespace-pre-line">{association.description}</p>
              </div>
            )}

            {/* Contact info */}
            {(association.contact_name || association.contact_email || association.contact_phone || association.website || association.address) && (
              <div>
                <p className="mb-3 font-medium text-muted-foreground">Coordonnées</p>
                <div className="flex flex-col gap-2">
                  {association.contact_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{association.contact_name}</span>
                    </div>
                  )}
                  {association.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${association.contact_email}`} className="text-primary hover:underline">
                        {association.contact_email}
                      </a>
                    </div>
                  )}
                  {association.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{association.contact_phone}</span>
                    </div>
                  )}
                  {association.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={association.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {association.website}
                      </a>
                    </div>
                  )}
                  {association.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="whitespace-pre-line">{association.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info */}
            <div>
              <p className="mb-2 font-medium text-muted-foreground">Informations</p>
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">
                  Créé le : {formatDate(association.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Modifié le : {formatDate(association.updatedAt)}
                </p>
                {association.reviewed_at && (
                  <p className="text-sm text-muted-foreground">
                    Examiné le : {formatDate(association.reviewed_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submission info */}
        {association.submission_source === 'public_form' && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950">
            <h3 className="mb-3 text-sm font-medium text-blue-800 dark:text-blue-200">
              Soumission publique
            </h3>
            <div className="flex flex-col gap-2">
              {association.submitted_by_name && (
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <UserCircle className="h-4 w-4" />
                  <span>{association.submitted_by_name}</span>
                </div>
              )}
              {association.submitted_by_email && (
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${association.submitted_by_email}`} className="hover:underline">
                    {association.submitted_by_email}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approve / Reject buttons */}
        {association.status === 'pending' && (
          <div className="rounded-md border bg-card p-5">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Actions de modération</h3>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleApprove}
                disabled={updateMutation.isPending}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {updateMutation.isPending ? 'Mise à jour...' : 'Approuver'}
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={updateMutation.isPending}
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
              >
                {updateMutation.isPending ? 'Mise à jour...' : 'Rejeter'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

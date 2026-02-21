import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingSpinner, StatusBadge } from '../components/common'
import { PageHeader } from '../components/layout'
import { useDeletePage, usePage } from '../hooks/api/usePages'
import { toaster } from '../lib/toaster'

export function PageDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: page, isLoading, error } = usePage(id || '')
  const deletePageMutation = useDeletePage()

  const handleDelete = async () => {
    if (!page) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la page "${page.title}" ?`)) {
      try {
        await deletePageMutation.mutateAsync(page.documentId)
        toaster.create({
          title: 'Page supprimée',
          description: `La page "${page.title}" a été supprimée avec succès.`,
          type: 'success',
          duration: 3000,
        })
        navigate('/pages')
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
        toaster.create({
          title: 'Erreur',
          description: 'Une erreur est survenue lors de la suppression.',
          type: 'error',
          duration: 5000,
        })
      }
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Chargement de la page..." />
  }

  if (error || !page) {
    return (
      <ErrorState
        title="Page non trouvée"
        message="La page que vous recherchez n'existe pas ou n'a pas pu être chargée."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const headerActions = [
    {
      label: 'Retour',
      onClick: () => navigate('/pages'),
      variant: 'outline' as const,
      colorScheme: 'gray'
    },
    {
      label: 'Modifier',
      onClick: () => navigate(`/pages/${page.documentId}/edit`),
      colorScheme: 'blue'
    },
    {
      label: 'Supprimer',
      onClick: handleDelete,
      variant: 'outline' as const,
      colorScheme: 'red',
      loading: deletePageMutation.isPending
    }
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={page.title}
          subtitle={`/${page.slug}`}
          actions={headerActions}
          breadcrumbs={[
            { label: 'Pages', href: '/pages' },
            { label: page.title },
          ]}
        />

        <div className="rounded-md border bg-card p-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 font-medium text-muted-foreground">
                Statut
              </p>
              <StatusBadge status={page.status} />
            </div>

            {page.meta_description && (
              <div>
                <p className="mb-2 font-medium text-muted-foreground">
                  Description
                </p>
                <p>{page.meta_description}</p>
              </div>
            )}

            <div>
              <p className="mb-2 font-medium text-muted-foreground">
                Contenu
              </p>
              <div
                className="rounded-md border bg-muted/50 p-4"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            </div>

            <div>
              <p className="mb-2 font-medium text-muted-foreground">
                Informations
              </p>
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">
                  Créé le: {new Date(page.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Modifié le: {new Date(page.updatedAt).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Ordre du menu: {page.menu_order}
                </p>
                <p className="text-sm text-muted-foreground">
                  Template: {page.template}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '../common/ConfirmDialog'
import type { DomainStatus } from '../../services/domain'

interface DomainActiveStateProps {
  domainStatus: DomainStatus
  onRemove: () => void
  isRemoving: boolean
}

export function DomainActiveState({ domainStatus, onRemove, isRemoving }: DomainActiveStateProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="space-y-4">
      <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200 [&>svg]:text-green-600">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Domaine actif</AlertTitle>
        <AlertDescription>
          Votre site est accessible sur{' '}
          <a
            href={domainStatus.liveUrl || `https://${domainStatus.customDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium underline"
          >
            {domainStatus.customDomain}
            <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>

      <div className="space-y-1 text-sm text-muted-foreground">
        <p>Domaine : <span className="font-medium text-foreground">{domainStatus.customDomain}</span></p>
        <p>SSL : <span className="font-medium text-foreground">{domainStatus.sslEnabled ? 'Activé' : 'En cours d\'activation'}</span></p>
        {domainStatus.domainConfiguredAt && (
          <p>Configuré le : <span className="font-medium text-foreground">{new Date(domainStatus.domainConfiguredAt).toLocaleDateString('fr-FR')}</span></p>
        )}
      </div>

      <Button
        variant="outline"
        onClick={() => setShowConfirm(true)}
        disabled={isRemoving}
        className="border-destructive text-destructive hover:bg-destructive/10"
      >
        {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
        Supprimer le domaine
      </Button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { setShowConfirm(false); onRemove() }}
        title="Supprimer le domaine personnalisé"
        message={`Êtes-vous sûr de vouloir supprimer le domaine ${domainStatus.customDomain} ? Votre site reviendra à son URL Netlify par défaut.`}
        confirmText="Supprimer"
        isLoading={isRemoving}
        type="danger"
      />
    </div>
  )
}

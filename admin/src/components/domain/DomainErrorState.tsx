import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react'

interface DomainErrorStateProps {
  domain: string
  onRetry: () => void
  onRemove: () => void
  isVerifying: boolean
  isRemoving: boolean
}

export function DomainErrorState({ domain, onRetry, onRemove, isVerifying, isRemoving }: DomainErrorStateProps) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur de configuration</AlertTitle>
        <AlertDescription>
          La vérification du domaine <strong>{domain}</strong> a échoué.
          Vérifiez que vos enregistrements DNS sont correctement configurés, puis réessayez.
          La propagation DNS peut prendre jusqu'à 48 heures.
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <Button onClick={onRetry} disabled={isVerifying}>
          {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Réessayer la vérification
        </Button>
        <Button
          variant="outline"
          onClick={onRemove}
          disabled={isRemoving}
          className="border-destructive text-destructive hover:bg-destructive/10"
        >
          {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Supprimer et recommencer
        </Button>
      </div>
    </div>
  )
}

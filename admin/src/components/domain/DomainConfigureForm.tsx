import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toaster } from '../../lib/toaster'

interface DomainConfigureFormProps {
  onConfigure: (domain: string) => void
  isConfiguring: boolean
  isLoading: boolean
}

/**
 * Nettoie l'input utilisateur : retire https://, chemins, ports
 */
function cleanDomainInput(raw: string): string {
  let cleaned = raw.trim().toLowerCase()
  // Retirer le protocole
  cleaned = cleaned.replace(/^https?:\/\//, '')
  // Retirer le chemin
  cleaned = cleaned.split('/')[0]
  // Retirer le port
  cleaned = cleaned.split(':')[0]
  // Retirer le www. initial (on le gère automatiquement)
  cleaned = cleaned.replace(/^www\./, '')
  return cleaned
}

export function DomainConfigureForm({ onConfigure, isConfiguring, isLoading }: DomainConfigureFormProps) {
  const [domainInput, setDomainInput] = useState('')

  const handleSubmit = () => {
    const cleaned = cleanDomainInput(domainInput)
    if (!cleaned) {
      toaster.create({ title: 'Erreur', description: 'Veuillez saisir un nom de domaine', type: 'error', duration: 5000 })
      return
    }
    onConfigure(cleaned)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom de domaine</Label>
        <Input
          placeholder="mairie-lyon.fr"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
        />
        <p className="text-sm text-muted-foreground">
          Saisissez votre nom de domaine (ex: <code>mairie-lyon.fr</code> ou <code>mairie.lyon.fr</code>)
        </p>
      </div>

      <Button onClick={handleSubmit} disabled={!domainInput.trim() || isLoading || isConfiguring}>
        {isConfiguring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Configurer
      </Button>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Vous n'avez pas encore de nom de domaine ?</AlertTitle>
        <AlertDescription>
          Vous pouvez acheter un nom de domaine chez un fournisseur (registrar) comme OVH, Gandi, ou Ionos.
          Une fois le domaine acheté, revenez ici pour le configurer.
        </AlertDescription>
      </Alert>
    </div>
  )
}

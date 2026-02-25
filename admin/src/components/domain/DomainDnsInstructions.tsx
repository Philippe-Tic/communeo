import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Clock, Copy, HelpCircle, Loader2 } from 'lucide-react'
import type { DnsInstruction } from '../../services/domain'
import { toaster } from '../../lib/toaster'

interface DomainDnsInstructionsProps {
  domain: string
  isApex: boolean
  baseDomain?: string
  records: DnsInstruction[]
  onVerify: () => void
  onCancel: () => void
  isVerifying: boolean
  isRemoving: boolean
}

const typeBadgeClass: Record<string, string> = {
  A: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CNAME: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

export function DomainDnsInstructions({
  domain,
  isApex,
  baseDomain,
  records,
  onVerify,
  onCancel,
  isVerifying,
  isRemoving,
}: DomainDnsInstructionsProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toaster.create({ title: 'Copié', description: 'Valeur copiée dans le presse-papier', type: 'success', duration: 2000 })
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium">{domain}</span>
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">En attente</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isRemoving}
          className="border-destructive text-destructive hover:bg-destructive/10"
        >
          {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Annuler
        </Button>
      </div>

      {/* Instructions */}
      <Alert className="border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200 [&>svg]:text-orange-600">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Pointage DNS requis</AlertTitle>
        <AlertDescription>
          Connectez-vous au panneau de gestion de votre fournisseur de domaine (OVH, Gandi, Ionos...) et ajoutez les enregistrements suivants dans la zone DNS de <strong>{baseDomain || domain}</strong> pour pointer vers votre site.
        </AlertDescription>
      </Alert>

      {/* Tableau DNS */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Type</TableHead>
            <TableHead>Nom / Hôte</TableHead>
            <TableHead>Valeur</TableHead>
            <TableHead>But</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, i) => (
            <TableRow key={i}>
              <TableCell>
                <Badge className={typeBadgeClass[record.type] || ''}>{record.type}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <code className="text-sm break-all">{record.displayName}</code>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(record.displayName)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <code className="text-sm break-all">{record.value}</code>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(record.value)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{record.purpose}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Note contextuelle apex */}
      {isApex && (
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>Pourquoi un enregistrement A et un CNAME www ?</AlertTitle>
          <AlertDescription>
            <p className="mt-1">
              Les domaines racines (comme <code>{domain}</code>) ne supportent pas les CNAME selon les standards DNS.
              On utilise donc un <strong>enregistrement A</strong> pour pointer le domaine vers le serveur.
            </p>
            <p className="mt-1">
              Le <strong>CNAME www</strong> permet aux visiteurs qui tapent <code>www.{domain}</code> d'arriver aussi sur votre site.
            </p>
            <p className="mt-2 text-sm">
              Chez certains fournisseurs, pour le nom de l'enregistrement A, saisissez <code>@</code> ou laissez le champ vide.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Bouton vérification */}
      <Button
        onClick={onVerify}
        disabled={isVerifying}
        className="bg-green-600 text-white hover:bg-green-700"
      >
        {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Vérifier le pointage DNS
      </Button>

      {/* Message propagation */}
      <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 [&>svg]:text-blue-600">
        <Clock className="h-4 w-4" />
        <AlertTitle>La vérification échoue ?</AlertTitle>
        <AlertDescription>
          C'est normal si vous venez de modifier votre zone DNS. La propagation des enregistrements DNS peut prendre jusqu'à 48 heures.
          Vous pouvez revenir vérifier plus tard.
        </AlertDescription>
      </Alert>
    </div>
  )
}

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle, Info, Loader2, RefreshCw } from 'lucide-react'
import React, { useState } from 'react'
import { useDomain } from '../../hooks/useDomain'
import { toaster } from '../../lib/toaster'

interface DomainManagementProps {
  className?: string
}

export const DomainManagement: React.FC<DomainManagementProps> = ({ className }) => {
  const {
    domainStatus, hasCustomDomain, isConfigured, isPending, hasError,
    isLoading, configureDomain, verifyDomain, removeDomain, refetch,
    isConfiguring, isVerifying, isRemoving
  } = useDomain()

  const [domainInput, setDomainInput] = useState('')

  const handleConfigureDomain = async () => {
    if (!domainInput.trim()) {
      toaster.create({ title: 'Erreur', description: 'Veuillez saisir un nom de domaine', type: 'error', duration: 5000 })
      return
    }
    configureDomain(domainInput.trim())
  }

  const handleRemoveDomain = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce domaine personnalisé ?')) {
      removeDomain()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toaster.create({ title: 'Copié', description: 'Texte copié dans le presse-papier', type: 'success', duration: 3000 })
  }

  const getStatusBadge = () => {
    if (!hasCustomDomain) return null
    const configs: Record<string, { className: string; text: string }> = {
      pending: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', text: 'En attente de vérification' },
      verified: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text: 'Vérifié et actif' },
      error: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Erreur de configuration' },
    }
    const config = configs[domainStatus?.domainStatus || ''] || { className: '', text: 'Inconnu' }
    return <Badge className={config.className}>{config.text}</Badge>
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Domaine personnalisé</CardTitle>
          <CardDescription>Configurez un nom de domaine personnalisé pour votre site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current status */}
          <div>
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-medium">État actuel</p>
                {hasCustomDomain ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium">{domainStatus?.customDomain}</span>
                    {getStatusBadge()}
                    {isConfigured && domainStatus?.liveUrl && (
                      <a href={domainStatus.liveUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">↗</a>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Aucun domaine personnalisé configuré</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {hasCustomDomain && (
                  <Button variant="outline" size="sm" onClick={handleRemoveDomain} disabled={isRemoving} className="border-destructive text-destructive hover:bg-destructive/10">
                    {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Supprimer
                  </Button>
                )}
              </div>
            </div>

            {domainStatus?.liveUrl && (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">URL du site :</p>
                <a href={domainStatus.liveUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">
                  {domainStatus.liveUrl}
                </a>
              </div>
            )}
          </div>

          <Separator />

          {/* Configure domain */}
          {!hasCustomDomain && (
            <>
              <div>
                <p className="mb-4 font-medium">Configurer un domaine personnalisé</p>
                <div className="space-y-2">
                  <Label>Nom de domaine</Label>
                  <Input
                    placeholder="exemple: mairie-lyon.fr"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfigureDomain() }}
                  />
                  <p className="text-sm text-muted-foreground">Saisissez votre nom de domaine sans "www" ni "https://"</p>
                </div>
                <Button onClick={handleConfigureDomain} disabled={!domainInput.trim() || isLoading || isConfiguring} className="mt-4">
                  {isConfiguring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Configurer le domaine
                </Button>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Plan requis</AlertTitle>
                <AlertDescription>Un domaine personnalisé nécessite un plan premium. Contactez votre administrateur pour plus d'informations.</AlertDescription>
              </Alert>
            </>
          )}

          {/* DNS instructions */}
          {isPending && domainStatus && (
            <div>
              <p className="mb-4 font-medium">Configuration DNS requise</p>
              <Alert variant="destructive" className="mb-4 border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200 [&>svg]:text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action requise</AlertTitle>
                <AlertDescription>Configurez les enregistrements DNS suivants chez votre registraire de domaine.</AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">TXT</Badge></TableCell>
                    <TableCell><code className="text-sm">_netlify-cms-verification.{domainStatus.customDomain}</code></TableCell>
                    <TableCell><code className="text-sm">{domainStatus.verificationToken}</code></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(domainStatus.verificationToken || '')}>Copier</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">CNAME</Badge></TableCell>
                    <TableCell><code className="text-sm">{domainStatus.customDomain}</code></TableCell>
                    <TableCell><code className="text-sm">netlify.app</code></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard('netlify.app')}>Copier</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Button onClick={() => verifyDomain()} disabled={isVerifying} className="mt-4 bg-green-600 text-white hover:bg-green-700">
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vérifier la configuration DNS
              </Button>
            </div>
          )}

          {isConfigured && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200 [&>svg]:text-green-600">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Domaine actif</AlertTitle>
              <AlertDescription>
                Votre domaine personnalisé est configuré et actif. Le certificat SSL est {domainStatus?.sslEnabled ? 'activé' : 'en cours d\'activation'}.
              </AlertDescription>
            </Alert>
          )}

          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur de configuration</AlertTitle>
              <AlertDescription>La vérification du domaine a échoué. Vérifiez votre configuration DNS et réessayez.</AlertDescription>
            </Alert>
          )}

          {domainStatus && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Plan actuel : <Badge variant="secondary">{domainStatus.planType}</Badge></p>
              {domainStatus.domainConfiguredAt && (
                <p>Configuré le : {new Date(domainStatus.domainConfiguredAt).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DomainManagement

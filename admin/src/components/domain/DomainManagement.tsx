import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { useDomain } from '../../hooks/useDomain'
import { DomainStepIndicator } from './DomainStepIndicator'
import { DomainConfigureForm } from './DomainConfigureForm'
import { DomainDnsInstructions } from './DomainDnsInstructions'
import { DomainActiveState } from './DomainActiveState'
import { DomainErrorState } from './DomainErrorState'

interface DomainManagementProps {
  className?: string
}

export const DomainManagement: React.FC<DomainManagementProps> = ({ className }) => {
  const {
    domainStatus, hasCustomDomain, isConfigured, isPending, hasError,
    configureDomain, verifyDomain, removeDomain,
    isConfiguring, isVerifying, isRemoving, isLoading,
    domainStatusQuery
  } = useDomain()

  // Déterminer l'étape courante
  const currentStep = isConfigured ? 'active' as const
    : (isPending || hasError) ? 'dns' as const
    : 'configure' as const

  // Loading initial
  if (domainStatusQuery.isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Domaine personnalisé</CardTitle>
          <CardDescription>Configurez un nom de domaine personnalisé pour votre site</CardDescription>
          <div className="pt-2">
            <DomainStepIndicator currentStep={currentStep} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* IDLE : pas de domaine configuré */}
          {!hasCustomDomain && !isPending && !hasError && (
            <DomainConfigureForm
              onConfigure={configureDomain}
              isConfiguring={isConfiguring}
              isLoading={isLoading}
            />
          )}

          {/* PENDING : DNS à configurer */}
          {isPending && domainStatus && (
            <DomainDnsInstructions
              domain={domainStatus.customDomain!}
              isApex={domainStatus.dnsInstructions?.isApex ?? false}
              baseDomain={domainStatus.dnsInstructions?.baseDomain}
              records={domainStatus.dnsInstructions?.records ?? []}
              onVerify={() => verifyDomain()}
              onCancel={() => removeDomain()}
              isVerifying={isVerifying}
              isRemoving={isRemoving}
            />
          )}

          {/* ACTIVE : domaine vérifié */}
          {isConfigured && domainStatus && (
            <DomainActiveState
              domainStatus={domainStatus}
              onRemove={() => removeDomain()}
              isRemoving={isRemoving}
            />
          )}

          {/* ERROR : vérification échouée */}
          {hasError && domainStatus && (
            <DomainErrorState
              domain={domainStatus.customDomain!}
              onRetry={() => verifyDomain()}
              onRemove={() => removeDomain()}
              isVerifying={isVerifying}
              isRemoving={isRemoving}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DomainManagement

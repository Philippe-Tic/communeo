import React from 'react'
import { DeploymentPanel } from '../components/deployment/DeploymentPanel'
import { DomainManagement } from '../components/domain/DomainManagement'
import { PageHeader } from '../components/layout/PageHeader'

export const SiteManagement: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Gestion du site"
        subtitle="Déployez votre site et configurez votre domaine personnalisé"
      />

      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8">
          <DeploymentPanel />
          <DomainManagement />
        </div>
      </div>
    </div>
  )
}

export default SiteManagement

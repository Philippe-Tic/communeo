import React from 'react'
import { DeploymentPanel } from '../components/deployment/DeploymentPanel'
import { PageHeader } from '../components/layout/PageHeader'

export const Deployment: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Déploiement"
        subtitle="Publiez votre site et gérez ses déploiements"
      />

      <DeploymentPanel />
    </div>
  )
}

export default Deployment

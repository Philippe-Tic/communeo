import React from 'react'
import { DeploymentPanel } from '../components/deployment/DeploymentPanel'
import { PageHeader } from '../components/layout/PageHeader'

export const Deployment: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Déploiement"
        subtitle="Publiez votre site et gérez ses déploiements"
      />

      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <DeploymentPanel />
      </div>
    </div>
  )
}

export default Deployment

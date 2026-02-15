import React from 'react'
import { DomainManagement } from '../components/domain/DomainManagement'
import { PageHeader } from '../components/layout/PageHeader'

export const DomainSettings: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Domaine personnalisé"
        subtitle="Configurez un nom de domaine personnalisé pour votre site"
      />

      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <DomainManagement />
      </div>
    </div>
  )
}

export default DomainSettings

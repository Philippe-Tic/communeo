import React from 'react'
import { DomainManagement } from '../components/domain/DomainManagement'
import { PageHeader } from '../components/layout/PageHeader'

export const DomainSettings: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Domaine personnalisé"
        subtitle="Configurez un nom de domaine personnalisé pour votre site"
      />

      <DomainManagement />
    </div>
  )
}

export default DomainSettings

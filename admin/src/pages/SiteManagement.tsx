import { Box, VStack } from '@chakra-ui/react'
import React from 'react'
import { DeploymentPanel } from '../components/deployment/DeploymentPanel'
import { DomainManagement } from '../components/domain/DomainManagement'
import { PageHeader } from '../components/layout/PageHeader'

export const SiteManagement: React.FC = () => {
  return (
    <Box>
      <PageHeader
        title="Gestion du site"
        subtitle="Déployez votre site et configurez votre domaine personnalisé"
      />

      <Box maxW="6xl" mx="auto">
        <VStack gap={8} align="stretch">
          <DeploymentPanel />
          <DomainManagement />
        </VStack>
      </Box>
    </Box>
  )
}

export default SiteManagement

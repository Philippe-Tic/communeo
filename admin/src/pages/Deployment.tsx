import { Box, VStack } from '@chakra-ui/react'
import React from 'react'
import { DeploymentPanel } from '../components/deployment/DeploymentPanel'
import { PageHeader } from '../components/layout/PageHeader'

export const Deployment: React.FC = () => {
  return (
    <Box>
            <PageHeader
        title="Déploiement"
        subtitle="Publiez votre site et gérez ses déploiements"
      />

      <VStack gap={6} align="stretch" maxW="4xl" mx="auto">
        <DeploymentPanel />
      </VStack>
    </Box>
  )
}

export default Deployment

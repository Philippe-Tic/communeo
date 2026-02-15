import { Box, VStack } from '@chakra-ui/react'
import React from 'react'
import { DomainManagement } from '../components/domain/DomainManagement'
import { PageHeader } from '../components/layout/PageHeader'

export const DomainSettings: React.FC = () => {
  return (
    <Box>
      <PageHeader
        title="Domaine personnalisé"
        subtitle="Configurez un nom de domaine personnalisé pour votre site"
      />

      <VStack gap={6} align="stretch" maxW="4xl" mx="auto">
        <DomainManagement />
      </VStack>
    </Box>
  )
}

export default DomainSettings

import { Box, Button, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { toaster } from '../lib/toaster'

export function ToastTest() {
  const showSuccessToast = () => {
    toaster.create({
      title: 'Succès !',
      description: 'Cette action a été effectuée avec succès.',
      type: 'success',
      duration: 3000,
    })
  }

  const showErrorToast = () => {
    toaster.create({
      title: 'Erreur',
      description: 'Une erreur est survenue lors de l\'opération.',
      type: 'error',
      duration: 5000,
    })
  }

  const showWarningToast = () => {
    toaster.create({
      title: 'Attention',
      description: 'Veuillez vérifier vos informations.',
      type: 'warning',
      duration: 4000,
    })
  }

  const showInfoToast = () => {
    toaster.create({
      title: 'Information',
      description: 'Voici une information importante.',
      type: 'info',
      duration: 3000,
    })
  }

  const showLoadingToast = () => {
    toaster.create({
      title: 'Chargement...',
      description: 'Opération en cours.',
      type: 'loading',
      duration: 2000,
    })
  }

  return (
    <Box maxWidth="600px" mx="auto" p={6}>
      <Stack gap={6}>
        <Heading size="lg">Test du système de Toast</Heading>

        <Text>
          Cliquez sur les boutons ci-dessous pour tester les différents types de toast
          avec le nouveau système de Chakra UI v3.
        </Text>

        <HStack gap={4} flexWrap="wrap">
          <Button colorScheme="green" onClick={showSuccessToast}>
            Toast Succès
          </Button>
          <Button colorScheme="red" onClick={showErrorToast}>
            Toast Erreur
          </Button>
          <Button colorScheme="yellow" onClick={showWarningToast}>
            Toast Attention
          </Button>
          <Button colorScheme="blue" onClick={showInfoToast}>
            Toast Info
          </Button>
          <Button colorScheme="gray" onClick={showLoadingToast}>
            Toast Chargement
          </Button>
        </HStack>
      </Stack>
    </Box>
  )
}

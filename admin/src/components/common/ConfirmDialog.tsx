import {
    Box,
    Button,
    Heading,
    HStack,
    Text,
    VStack
} from '@chakra-ui/react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  type?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isLoading = false,
  type = 'danger'
}: ConfirmDialogProps) {
  const getColorScheme = () => {
    switch (type) {
      case 'danger':
        return 'red'
      case 'warning':
        return 'orange'
      case 'info':
        return 'blue'
      default:
        return 'gray'
    }
  }

  if (!isOpen) return null

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="blackAlpha.600"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
      onClick={onClose}
    >
      <Box
        bg="white"
        borderRadius="md"
        boxShadow="lg"
        maxW="md"
        w="full"
        mx={4}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <VStack gap={0} align="stretch">
          <Box p={6} borderBottom="1px solid" borderColor="gray.200">
            <Heading size="md">{title}</Heading>
          </Box>
          <Box p={6}>
            <Text>{message}</Text>
          </Box>
          <Box p={6} borderTop="1px solid" borderColor="gray.200">
            <HStack justifyContent="flex-end" gap={3}>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                {cancelText}
              </Button>
              <Button
                colorScheme={getColorScheme()}
                onClick={onConfirm}
                loading={isLoading}
              >
                {confirmText}
              </Button>
            </HStack>
          </Box>
        </VStack>
      </Box>
    </Box>
  )
}

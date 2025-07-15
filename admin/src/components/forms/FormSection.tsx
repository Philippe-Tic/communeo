import { Box, Heading, Stack } from '@chakra-ui/react'

interface FormSectionProps {
  title: string
  children: React.ReactNode
  gap?: number
}

export function FormSection({ title, children, gap = 4 }: FormSectionProps) {
  return (
    <Box>
      <Heading size="md" mb={4}>
        {title}
      </Heading>
      <Stack gap={gap}>
        {children}
      </Stack>
    </Box>
  )
}

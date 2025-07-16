import {
    Box,
    Text,
    useBreakpointValue,
    VStack,
} from '@chakra-ui/react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface NavItem {
  name: string
  path: string
}

const navItems: NavItem[] = [
  { name: 'Tableau de bord', path: '/dashboard' },
  { name: 'Articles', path: '/articles' },
  { name: 'Pages', path: '/pages' },
  { name: 'Événements', path: '/events' },
  { name: 'Site', path: '/site' },
  // { name: 'Utilisateurs', path: '/users' }, // Temporarily hidden
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  variant?: 'drawer' | 'sidebar'
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  variant = 'sidebar'
}) => {
  const location = useLocation()
  const navigate = useNavigate()

  const sidebarWidth = useBreakpointValue({ base: '280px', md: '250px' })
  const sidebarHeight = variant === 'drawer'
    ? '100vh'
    : 'calc(100vh - 88px)' // Adjust based on header height

  const sidebarTop = variant === 'drawer' ? 0 : '88px' // Header height

  const handleNavClick = (path: string) => {
    navigate(path)
    if (variant === 'drawer' && onClose) {
      onClose()
    }
  }

  const sidebarContent = (
    <Box
      w={sidebarWidth}
      bg="gray.50"
      borderRightWidth={variant === 'sidebar' ? 1 : 0}
      borderColor="gray.200"
      h={sidebarHeight}
      position="fixed"
      top={sidebarTop}
      left={variant === 'drawer' && !isOpen ? '-100%' : 0}
      overflowY="auto"
      zIndex={variant === 'drawer' ? 1100 : 1}
      transition="left 0.3s ease"
      boxShadow={variant === 'drawer' ? 'xl' : 'none'}
    >
      <VStack gap={1} p={4} align="stretch">
        <Text
          fontSize="xs"
          fontWeight="bold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
          mb={2}
        >
          Navigation
        </Text>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path

          return (
            <Box
              key={item.path}
              p={3}
              borderRadius="md"
              bg={isActive ? 'brand.500' : 'transparent'}
              color={isActive ? 'white' : 'gray.700'}
              cursor="pointer"
              _hover={{
                bg: isActive ? 'brand.600' : 'gray.100',
              }}
              fontWeight={isActive ? 'semibold' : 'normal'}
              transition="all 0.2s"
              onClick={() => handleNavClick(item.path)}
            >
              <Text fontSize="sm">{item.name}</Text>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )

  // Mobile drawer overlay
  if (variant === 'drawer') {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <Box
            position="fixed"
            top={0}
            left={0}
            w="100vw"
            h="100vh"
            bg="blackAlpha.600"
            zIndex={1050}
            onClick={onClose}
          />
        )}
        {/* Sidebar content */}
        {sidebarContent}
      </>
    )
  }

  // Desktop sidebar
  return sidebarContent
}

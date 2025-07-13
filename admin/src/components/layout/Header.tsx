import {
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    IconButton,
    Text,
    useBreakpointValue,
    VStack,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  onMenuClick?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Responsive breakpoints
  const showFullHeader = useBreakpointValue({ base: false, md: true })
  const headerPadding = useBreakpointValue({ base: 4, md: 6 })
  const titleSize = useBreakpointValue({ base: 'md', md: 'lg' }) as 'md' | 'lg'

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu)
  }

  return (
    <Box
      bg="white"
      borderBottomWidth={1}
      borderColor="gray.200"
      px={headerPadding}
      py={4}
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={1000}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="center">
        {/* Left side - Menu button (mobile) + Title */}
        <HStack gap={3}>
          {!showFullHeader && onMenuClick && (
            <IconButton
              variant="ghost"
              aria-label="Ouvrir le menu"
              onClick={onMenuClick}
              size="md"
              _hover={{ bg: 'gray.100' }}
            >
              <Box
                display="flex"
                flexDirection="column"
                gap="2px"
                w="20px"
                h="16px"
                justifyContent="center"
              >
                <Box w="100%" h="2px" bg="gray.600" borderRadius="1px" />
                <Box w="100%" h="2px" bg="gray.600" borderRadius="1px" />
                <Box w="100%" h="2px" bg="gray.600" borderRadius="1px" />
              </Box>
            </IconButton>
          )}

          <Heading size={titleSize} color="brand.600">
            Admin CMS
          </Heading>
        </HStack>

        {/* Right side - User info */}
        <HStack gap={{ base: 2, md: 4 }}>
          {user && showFullHeader && (
            <Text fontSize="sm" color="gray.600" display={{ base: 'none', lg: 'block' }}>
              {user.site?.name}
            </Text>
          )}

          {user && (
            <Box position="relative">
              <HStack
                gap={2}
                cursor="pointer"
                onClick={handleUserMenuClick}
                p={2}
                borderRadius="md"
                _hover={{ bg: 'gray.50' }}
                minW="max-content"
              >
                <Box
                  w={{ base: 6, md: 8 }}
                  h={{ base: 6, md: 8 }}
                  borderRadius="full"
                  bg="brand.500"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontSize={{ base: 'xs', md: 'sm' }}
                  fontWeight="bold"
                  flexShrink={0}
                >
                  {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                </Box>

                {showFullHeader && (
                  <Box textAlign="left" display={{ base: 'none', sm: 'block' }}>
                    <Text fontSize="sm" fontWeight="medium">
                      {user.first_name} {user.last_name}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {user.municipality_role}
                    </Text>
                  </Box>
                )}
              </HStack>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <Box
                  position="absolute"
                  top="100%"
                  right={0}
                  mt={2}
                  bg="white"
                  borderWidth={1}
                  borderColor="gray.200"
                  borderRadius="md"
                  boxShadow="lg"
                  minW={{ base: "250px", md: "300px" }}
                  zIndex={1001}
                  p={4}
                >
                  <VStack align="start" gap={3}>
                    <Box borderBottomWidth={1} borderColor="gray.100" pb={3} w="full">
                      <HStack gap={3}>
                        <Box
                          w={10}
                          h={10}
                          borderRadius="full"
                          bg="brand.500"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          color="white"
                          fontSize="md"
                          fontWeight="bold"
                        >
                          {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                        </Box>
                        <Box>
                          <Text fontWeight="bold" fontSize="md">
                            {user.first_name} {user.last_name}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {user.municipality_role}
                          </Text>
                        </Box>
                      </HStack>
                    </Box>

                    <Box w="full">
                      <Text fontSize="sm" color="gray.500">Email</Text>
                      <Text fontSize="md">{user.email}</Text>
                    </Box>

                    <Box w="full">
                      <Text fontSize="sm" color="gray.500">Site</Text>
                      <Text fontSize="md">{user.site?.name}</Text>
                    </Box>

                    <Box pt={2} borderTopWidth={1} borderColor="gray.200" w="full">
                      <Button
                        variant="ghost"
                        size="sm"
                        width="full"
                        justifyContent="flex-start"
                        onClick={handleLogout}
                        color="red.500"
                        _hover={{ bg: 'red.50' }}
                      >
                        Déconnexion
                      </Button>
                    </Box>
                  </VStack>
                </Box>
              )}
            </Box>
          )}

          {!user && (
            <Button
              bg="brand.500"
              color="white"
              size={{ base: 'sm', md: 'md' }}
              _hover={{ bg: 'brand.600' }}
            >
              Se connecter
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  )
}

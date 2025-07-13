import { Box, useBreakpointValue } from '@chakra-ui/react'
import React, { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Determine if we should show desktop or mobile layout
  const isMobile = useBreakpointValue({ base: true, md: false })

  // Simplified margin logic
  const contentMarginLeft = useBreakpointValue({
    base: 0,
    md: 250
  })

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header - always visible */}
      <Header
        onMenuClick={isMobile ? handleMobileMenuToggle : undefined}
      />

      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && (
        <Sidebar variant="sidebar" />
      )}

      {/* Mobile Drawer Sidebar */}
      {isMobile && (
        <Sidebar
          variant="drawer"
          isOpen={isMobileMenuOpen}
          onClose={handleMobileMenuClose}
        />
      )}

      {/* Main Content - Direct container without Flex wrapper */}
      <Box
        ml={contentMarginLeft}
        pt="88px" // Compensate for fixed header
        px={{ base: 4, md: 6 }}
        pb={{ base: 4, md: 6 }}
        transition="margin-left 0.3s ease"
        bg="white"
        minH="100vh"
        w="auto"
        maxW="none"
      >
        {children}
      </Box>
    </Box>
  )
}

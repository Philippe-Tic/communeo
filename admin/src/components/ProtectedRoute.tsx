import { Box, Flex, Spinner } from '@chakra-ui/react'
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <Flex
        minH="100vh"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
      >
        <Box textAlign="center">
          <Spinner
            color="brand.500"
            size="xl"
          />
        </Box>
      </Flex>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

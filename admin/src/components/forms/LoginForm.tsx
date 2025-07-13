import {
    Box,
    Button,
    Heading,
    Input,
    Link,
    Stack,
    Text,
    useBreakpointValue,
    VStack,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface LoginFormData {
  email: string
  password: string
}

interface LoginFormProps {
  onForgotPassword?: () => void
  onSignUp?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onForgotPassword,
  onSignUp,
}) => {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string>('')

  // Responsive values
  const containerWidth = useBreakpointValue({
    base: '90%',
    sm: '400px',
    md: '450px'
  })
  const containerPadding = useBreakpointValue({
    base: 6,
    md: 8
  })
  const titleSize = useBreakpointValue({
    base: 'md',
    md: 'lg'
  }) as 'md' | 'lg'
  const containerMarginTop = useBreakpointValue({
    base: 4,
    md: 8
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('')
      await login(data.email, data.password)
      // Redirect to dashboard on successful login
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion'
      )
    }
  }

  return (
    <Box
      maxWidth={containerWidth}
      width="full"
      margin="auto"
      mt={containerMarginTop}
      px={{ base: 4, sm: 0 }}
    >
      <Box
        p={containerPadding}
        borderWidth={1}
        borderRadius="lg"
        boxShadow={{ base: 'md', md: 'lg' }}
        bg="white"
      >
        <VStack gap={{ base: 5, md: 6 }} align="stretch">
          <Box textAlign="center">
            <Heading size={titleSize} mb={2}>
              Connexion
            </Heading>
            <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>
              Connectez-vous à votre espace d'administration
            </Text>
          </Box>

          {error && (
            <Box
              p={3}
              bg="red.50"
              borderColor="red.200"
              borderWidth={1}
              borderRadius="md"
            >
              <Text color="red.800" fontSize="sm">
                {error}
              </Text>
            </Box>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap={4}>
              <Box>
                <Text mb={2} fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }}>
                  Email
                </Text>
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  size={{ base: 'md', md: 'lg' }}
                  {...register('email', {
                    required: 'L\'email est requis',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Format d\'email invalide',
                    },
                  })}
                />
                {errors.email && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {errors.email.message}
                  </Text>
                )}
              </Box>

              <Box>
                <Text mb={2} fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }}>
                  Mot de passe
                </Text>
                <Input
                  type="password"
                  placeholder="Votre mot de passe"
                  size={{ base: 'md', md: 'lg' }}
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    minLength: {
                      value: 6,
                      message: 'Le mot de passe doit contenir au moins 6 caractères',
                    },
                  })}
                />
                {errors.password && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {errors.password.message}
                  </Text>
                )}
              </Box>

              <Button
                type="submit"
                bg="brand.500"
                color="white"
                size={{ base: 'md', md: 'lg' }}
                loading={isSubmitting || loading}
                width="full"
                _hover={{ bg: 'brand.600' }}
                mt={2}
              >
                Se connecter
              </Button>
            </Stack>
          </form>

          <VStack gap={2} textAlign="center">
            {onForgotPassword && (
              <Link
                onClick={onForgotPassword}
                color="brand.500"
                fontSize={{ base: 'sm', md: 'md' }}
              >
                Mot de passe oublié ?
              </Link>
            )}
            {onSignUp && (
              <Text fontSize="sm" color="gray.600">
                Pas encore de compte ?{' '}
                <Link
                  onClick={onSignUp}
                  color="brand.500"
                  fontSize={{ base: 'sm', md: 'md' }}
                >
                  Créer un compte
                </Link>
              </Text>
            )}
          </VStack>
        </VStack>
      </Box>
    </Box>
  )
}

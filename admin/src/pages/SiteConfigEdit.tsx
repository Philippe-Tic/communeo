import {
  Box,
  Button,
  HStack,
  Heading,
  Input,
  SimpleGrid,
  Text,
  Textarea,
  VStack
} from '@chakra-ui/react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useSite, useUpdateSite, type UpdateSiteData } from '../hooks/api/useSites'
import { useCanManageSite, useUserSite } from '../hooks/useUser'
import { toaster } from '../lib/toaster'

export const SiteConfigEdit = () => {
  const { site: userSite } = useUserSite()
  const { canEditConfig, hasSite } = useCanManageSite()
  const { data: site, isLoading, error } = useSite(userSite?.documentId || '')
  const { mutate: updateSite, isPending } = useUpdateSite()
  const navigate = useNavigate()

  const [formData, setFormData] = React.useState({
    name: '',
    theme: 'classique' as 'classique' | 'moderne' | 'accessible',
    contact_mail: '',
    contact_phone: '',
    address: '',
    colors: ''
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = React.useState(false)

  // Update form when site data loads
  React.useEffect(() => {
    if (site) {
      setFormData({
        name: site.name,
        theme: site.theme,
        contact_mail: site.contact_mail,
        contact_phone: site.contact_phone || '',
        address: site.address || '',
        colors: site.colors ? JSON.stringify(site.colors, null, 2) : ''
      })
    }
  }, [site])

  // Check permissions after hooks
  if (!hasSite) {
    return <ErrorState title="Site non trouvé" message="Aucun site associé à votre compte" />
  }

  if (!canEditConfig) {
    return (
      <ErrorState
        title="Accès refusé"
        message="Seuls les maires et adjoints peuvent modifier la configuration du site"
      />
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du site est requis'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Maximum 100 caractères'
    }

    if (!formData.contact_mail.trim()) {
      newErrors.contact_mail = 'L\'email de contact est requis'
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.contact_mail)) {
      newErrors.contact_mail = 'Format d\'email invalide'
    }

    if (formData.colors.trim()) {
      try {
        JSON.parse(formData.colors)
      } catch {
        newErrors.colors = 'Format JSON invalide'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!site || !validateForm()) return

    let parsedColors = null
    if (formData.colors.trim()) {
      try {
        parsedColors = JSON.parse(formData.colors)
      } catch {
        return
      }
    }

    const updateData: UpdateSiteData = {
      documentId: site.documentId,
      name: formData.name,
      theme: formData.theme,
      contact_mail: formData.contact_mail,
      contact_phone: formData.contact_phone || undefined,
      address: formData.address || undefined,
      colors: parsedColors
    }

    updateSite(updateData, {
      onSuccess: () => {
        toaster.create({
          title: 'Configuration mise à jour',
          description: 'La configuration du site a été mise à jour avec succès.',
          type: 'success',
          duration: 3000,
        })
        navigate('/site')
      },
      onError: () => {
        toaster.create({
          title: 'Erreur lors de la sauvegarde',
          description: 'Une erreur est survenue lors de la sauvegarde de la configuration.',
          type: 'error',
          duration: 5000,
        })
      }
    })
  }

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm('Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?')) {
        navigate('/site')
      }
    } else {
      navigate('/site')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorState title="Erreur de chargement" message="Impossible de charger la configuration du site" />
  if (!site) return <ErrorState title="Site non trouvé" message="Aucune configuration de site disponible" />

  return (
    <Box maxW="full" mx="auto">
      <form onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          <PageHeader
            title="Modifier la configuration"
            subtitle="Paramètres du site"
            actions={[
              {
                label: "Annuler",
                onClick: handleCancel,
                variant: "ghost"
              },
              {
                label: isPending ? "Sauvegarde..." : "Sauvegarder",
                onClick: () => {
                  const form = document.querySelector('form') as HTMLFormElement
                  if (form) form.requestSubmit()
                },
                colorScheme: "blue",
                loading: isPending
              }
            ]}
          />

          {/* Informations générales */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" borderWidth={1}>
            <VStack gap={4} align="stretch">
              <Heading size="md" color="gray.700">
                Informations générales
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                    Nom du site
                  </Text>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    borderColor={errors.name ? 'red.300' : 'gray.200'}
                  />
                  {errors.name && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.name}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                    Slug
                  </Text>
                  <Input
                    value={site.slug}
                    disabled
                    bg="gray.50"
                  />
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Le slug ne peut pas être modifié
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                    Thème
                  </Text>
                  <select
                    value={formData.theme}
                    onChange={(e) => handleInputChange('theme', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderWidth: '1px',
                      borderColor: '#E2E8F0',
                      borderRadius: '6px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="classique">Classique</option>
                    <option value="moderne">Moderne</option>
                    <option value="accessible">Accessible</option>
                  </select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                    Email de contact
                  </Text>
                  <Input
                    type="email"
                    value={formData.contact_mail}
                    onChange={(e) => handleInputChange('contact_mail', e.target.value)}
                    borderColor={errors.contact_mail ? 'red.300' : 'gray.200'}
                  />
                  {errors.contact_mail && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.contact_mail}
                    </Text>
                  )}
                </Box>
              </SimpleGrid>
            </VStack>
          </Box>

          {/* Contact et adresse */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" borderWidth={1}>
            <VStack gap={4} align="stretch">
              <Heading size="md" color="gray.700">
                Informations de contact
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                    Téléphone
                  </Text>
                  <Input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    placeholder="Ex: 01 23 45 67 89"
                  />
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                    Adresse
                  </Text>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Adresse complète de la mairie"
                    rows={3}
                  />
                </Box>
              </SimpleGrid>
            </VStack>
          </Box>

          {/* Configuration des couleurs */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" borderWidth={1}>
            <VStack gap={4} align="stretch">
              <Heading size="md" color="gray.700">
                Configuration des couleurs
              </Heading>

              <Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                  Couleurs du thème (JSON)
                </Text>
                <Textarea
                  value={formData.colors}
                  onChange={(e) => handleInputChange('colors', e.target.value)}
                  placeholder='{"primary": "#3182ce", "secondary": "#2d3748"}'
                  rows={6}
                  fontFamily="mono"
                  fontSize="sm"
                  borderColor={errors.colors ? 'red.300' : 'gray.200'}
                />
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Configuration JSON optionnelle pour personnaliser les couleurs du thème
                </Text>
                {errors.colors && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {errors.colors}
                  </Text>
                )}
              </Box>
            </VStack>
          </Box>

          {/* Actions */}
          <HStack justify="end" gap={4}>
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              loading={isPending}
            >
              {isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </HStack>
        </VStack>
      </form>
    </Box>
  )
}

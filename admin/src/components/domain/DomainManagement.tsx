import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Code,
    Field,
    HStack,
    IconButton,
    Input,
    Link,
    Separator,
    Table,
    Text,
    VStack
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { useDomain } from '../../hooks/useDomain'
import { toaster } from '../../lib/toaster'

interface DomainManagementProps {
  className?: string
}

export const DomainManagement: React.FC<DomainManagementProps> = ({ className }) => {
  const {
    domainStatus,
    hasCustomDomain,
    isConfigured,
    isPending,
    hasError,
    isLoading,
    configureDomain,
    verifyDomain,
    removeDomain,
    refetch,
    isConfiguring,
    isVerifying,
    isRemoving
  } = useDomain()

  const [domainInput, setDomainInput] = useState('')

  const handleConfigureDomain = async () => {
    if (!domainInput.trim()) {
      toaster.create({
        title: 'Erreur',
        description: 'Veuillez saisir un nom de domaine',
        type: 'error',
        duration: 5000,
      })
      return
    }

    configureDomain(domainInput.trim())
  }

  const handleVerifyDomain = () => {
    verifyDomain()
  }

  const handleRemoveDomain = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce domaine personnalisé ?')) {
      removeDomain()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toaster.create({
      title: 'Copié',
      description: 'Texte copié dans le presse-papier',
      type: 'success',
      duration: 3000,
    })
  }

  const getStatusBadge = () => {
    if (!hasCustomDomain) return null

    let colorPalette = 'gray'
    let text = 'Inconnu'

    switch (domainStatus?.domainStatus) {
      case 'pending':
        colorPalette = 'orange'
        text = 'En attente de vérification'
        break
      case 'verified':
        colorPalette = 'green'
        text = 'Vérifié et actif'
        break
      case 'error':
        colorPalette = 'red'
        text = 'Erreur de configuration'
        break
    }

    return (
      <Badge colorPalette={colorPalette}>
        {text}
      </Badge>
    )
  }

  return (
    <Box className={className}>
      <Card.Root>
        <Card.Header>
          <Card.Title>Domaine personnalisé</Card.Title>
          <Card.Description>
            Configurez un nom de domaine personnalisé pour votre site
          </Card.Description>
        </Card.Header>

        <Card.Body>
          <VStack gap={6} align="stretch">
            {/* État actuel */}
            <Box>
              <HStack justify="space-between" mb={4}>
                <VStack align="start" gap={1}>
                  <Text fontWeight="medium">État actuel</Text>
                  {hasCustomDomain ? (
                    <HStack>
                      <Text fontSize="lg" fontWeight="medium">
                        {domainStatus?.customDomain}
                      </Text>
                      {getStatusBadge()}
                      {isConfigured && domainStatus?.liveUrl && (
                        <Link href={domainStatus.liveUrl} target="_blank" color="blue.500">
                          ↗
                        </Link>
                      )}
                    </HStack>
                  ) : (
                    <Text color="gray.500">Aucun domaine personnalisé configuré</Text>
                  )}
                </VStack>

                <HStack>
                  <IconButton
                    aria-label="Actualiser"
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    ⟳
                  </IconButton>

                  {hasCustomDomain && (
                    <Button
                      colorPalette="red"
                      variant="outline"
                      onClick={handleRemoveDomain}
                      loading={isRemoving}
                      size="sm"
                    >
                      Supprimer
                    </Button>
                  )}
                </HStack>
              </HStack>

              {/* URL du site */}
              {domainStatus?.liveUrl && (
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>URL du site :</Text>
                  <Link href={domainStatus.liveUrl} target="_blank" color="blue.500" fontFamily="mono">
                    {domainStatus.liveUrl}
                  </Link>
                </Box>
              )}
            </Box>

            <Separator />

            {/* Configuration selon l'état */}
            {!hasCustomDomain && (
              <>
                <Box>
                  <Text fontWeight="medium" mb={4}>Configurer un domaine personnalisé</Text>

                  <Field.Root>
                    <Field.Label>Nom de domaine</Field.Label>
                    <Input
                      placeholder="exemple: mairie-lyon.fr"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleConfigureDomain()
                        }
                      }}
                    />
                    <Field.HelperText>
                      Saisissez votre nom de domaine sans "www" ni "https://"
                    </Field.HelperText>
                  </Field.Root>

                  <Button
                    colorPalette="blue"
                    variant="solid"
                    onClick={handleConfigureDomain}
                    loading={isConfiguring}
                    disabled={!domainInput.trim() || isLoading}
                    mt={4}
                  >
                    Configurer le domaine
                  </Button>
                </Box>

                <Alert.Root status="info">
                  <Alert.Title>ℹ️ Plan requis</Alert.Title>
                  <Alert.Description>
                    Un domaine personnalisé nécessite un plan premium.
                    Contactez votre administrateur pour plus d'informations.
                  </Alert.Description>
                </Alert.Root>
              </>
            )}

            {/* Instructions DNS pour domaine en attente */}
            {isPending && domainStatus && (
              <>
                <Box>
                  <Text fontWeight="medium" mb={4}>Configuration DNS requise</Text>

                                     <Alert.Root status="warning" mb={4}>
                     <Alert.Title>⚠️ Action requise</Alert.Title>
                    <Alert.Description>
                      Configurez les enregistrements DNS suivants chez votre registraire de domaine.
                    </Alert.Description>
                  </Alert.Root>

                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Type</Table.ColumnHeader>
                        <Table.ColumnHeader>Nom</Table.ColumnHeader>
                        <Table.ColumnHeader>Valeur</Table.ColumnHeader>
                        <Table.ColumnHeader>Action</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      <Table.Row>
                        <Table.Cell>
                          <Badge colorPalette="purple">TXT</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Code fontSize="sm">_netlify-cms-verification.{domainStatus.customDomain}</Code>
                        </Table.Cell>
                        <Table.Cell>
                          <Code fontSize="sm">{domainStatus.verificationToken}</Code>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => copyToClipboard(domainStatus.verificationToken || '')}
                          >
                            Copier
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell>
                          <Badge colorPalette="blue">CNAME</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Code fontSize="sm">{domainStatus.customDomain}</Code>
                        </Table.Cell>
                        <Table.Cell>
                          <Code fontSize="sm">netlify.app</Code>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => copyToClipboard('netlify.app')}
                          >
                            Copier
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    </Table.Body>
                  </Table.Root>

                  <Button
                    colorPalette="green"
                    variant="solid"
                    onClick={handleVerifyDomain}
                    loading={isVerifying}
                    mt={4}
                  >
                    Vérifier la configuration DNS
                  </Button>
                </Box>
              </>
            )}

            {/* Domaine configuré avec succès */}
            {isConfigured && (
                             <Alert.Root status="success">
                 <Alert.Title>✅ Domaine actif</Alert.Title>
                <Alert.Description>
                  Votre domaine personnalisé est configuré et actif.
                  Le certificat SSL est {domainStatus?.sslEnabled ? 'activé' : 'en cours d\'activation'}.
                </Alert.Description>
              </Alert.Root>
            )}

            {/* Erreur de configuration */}
            {hasError && (
                             <Alert.Root status="error">
                 <Alert.Title>❌ Erreur de configuration</Alert.Title>
                <Alert.Description>
                  La vérification du domaine a échoué. Vérifiez votre configuration DNS et réessayez.
                </Alert.Description>
              </Alert.Root>
            )}

            {/* Informations sur le plan */}
            {domainStatus && (
              <Box>
                <Text fontSize="sm" color="gray.600">
                  Plan actuel : <Badge colorPalette="gray">{domainStatus.planType}</Badge>
                </Text>
                {domainStatus.domainConfiguredAt && (
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Configuré le : {new Date(domainStatus.domainConfiguredAt).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </Box>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}

export default DomainManagement

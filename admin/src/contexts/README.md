# Contextes de l'application Admin

## UserContext

Le `UserContext` est un contexte global qui gère les données utilisateur de l'endpoint `/me` et fournit des utilitaires pour travailler avec ces données.

### Configuration

Le `UserProvider` doit être placé à l'intérieur de l'`AuthProvider` dans votre application :

```tsx
<AuthProvider>
  <UserProvider>
    <App />
  </UserProvider>
</AuthProvider>
```

### Hooks disponibles

#### `useUser()`

Hook principal pour accéder au contexte utilisateur complet :

```tsx
import { useUser } from '../hooks/useUser'

const MyComponent = () => {
  const {
    user,           // Données utilisateur complètes
    loading,        // État de chargement
    error,          // Erreur éventuelle
    refetchUser,    // Fonction pour rafraîchir les données
    updateUser,     // Mise à jour optimiste
    hasRole,        // Vérifier un rôle
    belongsToSite,  // Vérifier l'appartenance à un site
    fullName,       // Nom complet calculé
    initials        // Initiales calculées
  } = useUser()

  return (
    <div>
      <h1>Bonjour {fullName}</h1>
      {hasRole('mayor') && <p>Vous êtes maire</p>}
    </div>
  )
}
```

#### `useUserProfile()`

Hook spécialisé pour les informations de profil :

```tsx
import { useUserProfile } from '../hooks/useUser'

const ProfileComponent = () => {
  const {
    user,
    fullName,
    initials,
    email,
    username,
    firstName,
    lastName,
    isConfirmed,
    isBlocked,
    updateUser,
    refetchUser
  } = useUserProfile()

  const handleUpdateProfile = async () => {
    updateUser({ first_name: 'Nouveau prénom' })
    await refetchUser() // Synchroniser avec le serveur
  }

  return (
    <div>
      <img src={`/avatar/${initials}`} alt={fullName} />
      <p>{email}</p>
    </div>
  )
}
```

#### `useUserRole()`

Hook pour la gestion des rôles :

```tsx
import { useUserRole } from '../hooks/useUser'

const AdminComponent = () => {
  const {
    role,        // Rôle actuel
    hasRole,     // Fonction pour vérifier un rôle
    isMayor,     // Raccourci pour vérifier si maire
    isDeputy,    // Raccourci pour vérifier si adjoint
    isSecretary, // Raccourci pour vérifier si secrétaire
    isEditor     // Raccourci pour vérifier si éditeur
  } = useUserRole()

  if (!isMayor && !isDeputy) {
    return <div>Accès refusé</div>
  }

  return <div>Contenu admin</div>
}
```

#### `useUserSite()`

Hook pour les informations du site :

```tsx
import { useUserSite } from '../hooks/useUser'

const SiteComponent = () => {
  const {
    site,         // Objet site complet
    belongsToSite,// Fonction pour vérifier l'appartenance
    siteId,       // ID du site
    siteName,     // Nom du site
    siteSlug      // Slug du site
  } = useUserSite()

  return (
    <div>
      <h2>{siteName}</h2>
      <p>Site ID: {siteId}</p>
    </div>
  )
}
```

### Utilisation avec la configuration du site

Le contexte utilisateur permet de récupérer automatiquement les données du site de l'utilisateur connecté :

```tsx
import { useSite } from '../hooks/api/useSites'
import { useUserSite } from '../hooks/useUser'

const SiteConfigComponent = () => {
  const { siteId } = useUserSite()
  const { data: site, isLoading, error } = useSite(siteId!)

  if (!siteId) {
    return <div>Aucun site associé à votre compte</div>
  }

  if (isLoading) return <div>Chargement...</div>
  if (error) return <div>Erreur de chargement</div>

  return (
    <div>
      <h1>Configuration de {site.name}</h1>
      <p>Thème: {site.theme}</p>
      <p>Email: {site.contact_mail}</p>
      {/* Autres informations du site */}
    </div>
  )
}
```

#### Exemple complet : Page de configuration du site

```tsx
import { useSite, useUpdateSite } from '../hooks/api/useSites'
import { useUserSite } from '../hooks/useUser'

const SiteConfigPage = () => {
  const { siteId, siteName } = useUserSite()
  const { data: site, isLoading } = useSite(siteId!)
  const { mutate: updateSite } = useUpdateSite()

  const handleSave = (formData) => {
    updateSite({
      id: siteId,
      ...formData
    }, {
      onSuccess: () => {
        // utiliser un toast du toaster
      }
    })
  }

  if (!siteId) {
    return <ErrorMessage>Aucun site associé</ErrorMessage>
  }

  return (
    <div>
      <h1>Configuration de {siteName}</h1>
      {/* Formulaire de configuration */}
    </div>
  )
}
```

### Fonctionnalités avancées

#### Mise à jour optimiste

```tsx
const { updateUser, refetchUser } = useUser()

// Mise à jour immédiate dans l'UI
updateUser({ first_name: 'Nouveau nom' })

// Puis synchronisation avec le serveur
try {
  await updateProfileOnServer({ first_name: 'Nouveau nom' })
  await refetchUser() // Récupérer la version serveur
} catch (error) {
  // En cas d'erreur, les données seront restaurées automatiquement
  await refetchUser()
}
```

#### Vérifications de permissions

```tsx
const { hasRole, belongsToSite } = useUser()

// Vérifier le rôle
if (hasRole('mayor')) {
  // Afficher des options spéciales pour le maire
}

// Vérifier l'appartenance à un site
if (belongsToSite(123)) {
  // L'utilisateur appartient au site avec l'ID 123
}
```

### Types disponibles

```tsx
interface UserProfile {
  id: number
  username: string
  email: string
  confirmed: boolean
  blocked: boolean
  first_name: string
  last_name: string
  municipality_role: 'mayor' | 'deputy' | 'secretary' | 'editor'
  site: {
    id: number
    name: string
    slug: string
    theme?: 'classique' | 'moderne' | 'accessible'
    contact_mail?: string
    contact_phone?: string
    address?: string
  }
  createdAt: string
  updatedAt: string
  provider?: string
  role?: {
    id: number
    name: string
    description: string
    type: string
  }
}
```

### Différence avec AuthContext

- **AuthContext** : Gère l'authentification (login/logout/token)
- **UserContext** : Gère les données utilisateur (profil, rôles, site, etc.)

Le UserContext dépend de l'AuthContext pour le token d'authentification mais se concentre sur les données utilisateur spécifiques.

# Migration de useToast vers le nouveau système de Toast dans Chakra UI v3

## Problème

Dans Chakra UI v3, le hook `useToast` n'existe plus. Il a été remplacé par un nouveau système de toaster basé sur `createToaster`.

## Solution

### 1. Installation du composant Toaster

D'abord, installez le snippet toaster officiel :

```bash
npx @chakra-ui/cli snippet add toaster
```

### 2. Ajout du Toaster dans l'application

Ajoutez le composant `Toaster` au niveau racine de votre application :

```tsx
// App.tsx
import { Toaster } from './components/ui/toaster'

function App() {
  return (
    <div>
      {/* Votre application */}
      <Toaster />
    </div>
  )
}
```

### 3. Utilisation du nouveau système

#### Ancien système (Chakra UI v2)
```tsx
import { useToast } from '@chakra-ui/react'

function MyComponent() {
  const toast = useToast()

  const handleClick = () => {
    toast({
      title: 'Succès',
      description: 'Action réussie',
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
  }

  return <button onClick={handleClick}>Cliquer</button>
}
```

#### Nouveau système (Chakra UI v3)
```tsx
import { toaster } from '../components/ui/toaster'

function MyComponent() {
  const handleClick = () => {
    toaster.create({
      title: 'Succès',
      description: 'Action réussie',
      type: 'success',  // 'status' devient 'type'
      duration: 3000,
      // isClosable n'est plus nécessaire (fermable par défaut)
    })
  }

  return <button onClick={handleClick}>Cliquer</button>
}
```

### 4. Principales différences

| Chakra UI v2 | Chakra UI v3 | Notes |
|-------------|-------------|-------|
| `useToast()` | `toaster.create()` | Import direct au lieu d'un hook |
| `status` | `type` | Changement de nom de propriété |
| `isClosable` | Supprimé | Les toasts sont fermables par défaut |
| Hook dans composant | Import direct | Plus besoin d'être dans un composant React |

### 5. Types de toast disponibles

```tsx
// Succès
toaster.create({
  title: 'Succès',
  description: 'Action réussie',
  type: 'success',
  duration: 3000,
})

// Erreur
toaster.create({
  title: 'Erreur',
  description: 'Une erreur s\'est produite',
  type: 'error',
  duration: 5000,
})

// Attention
toaster.create({
  title: 'Attention',
  description: 'Veuillez vérifier',
  type: 'warning',
  duration: 4000,
})

// Information
toaster.create({
  title: 'Information',
  description: 'Voici une info',
  type: 'info',
  duration: 3000,
})

// Chargement
toaster.create({
  title: 'Chargement...',
  description: 'Opération en cours',
  type: 'loading',
  duration: 2000,
})
```

### 6. Fonction utilitaire pour la migration

Pour faciliter la migration, vous pouvez créer une fonction utilitaire :

```tsx
interface ToastOptions {
  title: string
  description: string
  status: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  isClosable?: boolean
}

export const migrateToast = (oldToastOptions: ToastOptions) => {
  const { title, description, status, duration = 5000 } = oldToastOptions

  return toaster.create({
    title,
    description,
    type: status, // 'status' devient 'type'
    duration,
  })
}
```

### 7. Exemples d'utilisation dans les hooks React Query

```tsx
// Avec useCreatePage
const createPageMutation = useCreatePage()

const handleSubmit = async (data: PageData) => {
  try {
    await createPageMutation.mutateAsync(data)
    toaster.create({
      title: 'Page créée',
      description: 'La page a été créée avec succès.',
      type: 'success',
      duration: 3000,
    })
  } catch (error) {
    toaster.create({
      title: 'Erreur',
      description: 'Une erreur est survenue.',
      type: 'error',
      duration: 5000,
    })
  }
}
```

### 8. Test du système

Utilisez le composant `ToastTest` pour tester le système :

```tsx
// Accédez à /toast-test dans votre navigateur
<ToastTest />
```

## Avantages du nouveau système

1. **Plus simple** : Pas besoin d'un hook, import direct
2. **Plus flexible** : Peut être utilisé en dehors des composants React
3. **Meilleure performance** : Système optimisé dans Chakra UI v3
4. **Plus moderne** : Utilise le système de toaster standard

## Fichiers modifiés

- `src/components/ui/toaster.tsx` : Composant toaster officiel
- `src/App.tsx` : Ajout du composant Toaster
- `src/components/ToastTest.tsx` : Composant de test
- `src/services/testToast.ts` : Service d'exemples et utilitaires

## Prochaines étapes

1. Terminer la migration de tous les fichiers utilisant `useToast`
2. Tester le système dans toutes les pages
3. Mettre à jour les autres composants Chakra UI v3 si nécessaire
4. Supprimer les références à l'ancien système

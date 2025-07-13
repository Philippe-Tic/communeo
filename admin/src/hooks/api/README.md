# API Hooks Documentation

Cette documentation explique comment utiliser les hooks Tanstack Query pour les appels d'API dans l'application d'administration.

## Structure

```
src/hooks/api/
├── index.ts          # Export centralisé de tous les hooks
├── useAuth.ts        # Hooks d'authentification
├── useArticles.ts    # Hooks pour les articles
├── usePages.ts       # Hooks pour les pages
├── useEvents.ts      # Hooks pour les événements
├── useSites.ts       # Hooks pour les sites
└── README.md         # Cette documentation
```

## Configuration

Les hooks utilisent le client API centralisé (`apiClient`) qui gère automatiquement :
- L'authentification avec JWT
- La gestion des erreurs
- Les timeouts
- Les redirections 401

## Hooks d'authentification

### useCurrentUser
```typescript
const { data: user, isLoading, error } = useCurrentUser(token)
```

### useLogin
```typescript
const loginMutation = useLogin()

const handleLogin = async () => {
  try {
    await loginMutation.mutateAsync({
      identifier: 'user@example.com',
      password: 'password123'
    })
    // Redirection automatique après succès
  } catch (error) {
    // Gestion des erreurs
  }
}
```

### useLogout
```typescript
const logoutMutation = useLogout()

const handleLogout = async () => {
  await logoutMutation.mutateAsync()
}
```

## Hooks de contenu

### Articles

#### Lister les articles
```typescript
const { data: articles, isLoading } = useArticles({
  page: 1,
  pageSize: 20,
  status: 'published',
  search: 'terme de recherche',
  sortBy: 'createdAt',
  sortOrder: 'desc'
})
```

#### Obtenir un article
```typescript
const { data: article, isLoading } = useArticle(articleId)
```

#### Créer un article
```typescript
const createArticleMutation = useCreateArticle()

const handleCreate = async () => {
  await createArticleMutation.mutateAsync({
    title: 'Mon article',
    content: 'Contenu de l\'article...',
    status: 'draft'
  })
}
```

#### Modifier un article
```typescript
const updateArticleMutation = useUpdateArticle()

const handleUpdate = async () => {
  await updateArticleMutation.mutateAsync({
    id: articleId,
    title: 'Titre modifié'
  })
}
```

#### Supprimer un article
```typescript
const deleteArticleMutation = useDeleteArticle()

const handleDelete = async () => {
  await deleteArticleMutation.mutateAsync(articleId)
}
```

#### Publier/Dépublier un article
```typescript
const publishMutation = usePublishArticle()
const unpublishMutation = useUnpublishArticle()

const handlePublish = async () => {
  await publishMutation.mutateAsync(articleId)
}
```

### Pages

#### Lister les pages
```typescript
const { data: pages, isLoading } = usePages({
  page: 1,
  pageSize: 20,
  status: 'published',
  parent: null, // Pages racines seulement
  search: 'terme de recherche'
})
```

#### Hiérarchie des pages
```typescript
const { data: hierarchy, isLoading } = usePagesHierarchy()
```

#### Réorganiser les pages
```typescript
const reorderMutation = useReorderPages()

const handleReorder = async () => {
  await reorderMutation.mutateAsync([
    { id: 1, menu_order: 1 },
    { id: 2, menu_order: 2 },
    { id: 3, menu_order: 3 }
  ])
}
```

#### Définir comme page d'accueil
```typescript
const setHomepageMutation = useSetHomepage()

const handleSetHomepage = async () => {
  await setHomepageMutation.mutateAsync(pageId)
}
```

### Événements

#### Lister les événements
```typescript
const { data: events, isLoading } = useEvents({
  page: 1,
  pageSize: 20,
  status: 'published',
  upcoming: true, // Événements futurs seulement
  start_date: '2024-01-01',
  end_date: '2024-12-31'
})
```

#### Événements à venir
```typescript
const { data: upcomingEvents, isLoading } = useUpcomingEvents(5)
```

#### Événements du mois
```typescript
const { data: monthEvents, isLoading } = useCalendarEvents('2024-01')
```

#### Dupliquer un événement
```typescript
const duplicateMutation = useDuplicateEvent()

const handleDuplicate = async () => {
  await duplicateMutation.mutateAsync(originalEvent)
}
```

### Sites

#### Lister les sites
```typescript
const { data: sites, isLoading } = useSites({
  page: 1,
  pageSize: 20,
  is_active: true,
  search: 'nom du site'
})
```

#### Site actuel
```typescript
const { data: currentSite, isLoading } = useCurrentSite()
```

#### Basculer le statut d'un site
```typescript
const toggleStatusMutation = useToggleSiteStatus()

const handleToggleStatus = async () => {
  await toggleStatusMutation.mutateAsync(siteId)
}
```

#### Mode maintenance
```typescript
const toggleMaintenanceMutation = useToggleMaintenanceMode()

const handleToggleMaintenance = async () => {
  await toggleMaintenanceMutation.mutateAsync({
    id: siteId,
    maintenance_mode: true,
    maintenance_message: 'Site en maintenance'
  })
}
```

#### Mise à jour de la navigation
```typescript
const updateNavigationMutation = useUpdateSiteNavigation()

const handleUpdateNavigation = async () => {
  await updateNavigationMutation.mutateAsync({
    id: siteId,
    navigation_menu: [
      { id: 1, label: 'Accueil', url: '/', order: 1 },
      { id: 2, label: 'À propos', url: '/about', order: 2 }
    ]
  })
}
```

## Gestion des erreurs

Tous les hooks gèrent automatiquement les erreurs via le client API :

```typescript
const { data, error, isLoading } = useArticles()

if (error) {
  // Afficher l'erreur
  console.error('Erreur:', error.error.message)
}
```

Pour les mutations :

```typescript
const createMutation = useCreateArticle()

const handleCreate = async () => {
  try {
    await createMutation.mutateAsync(data)
    // Succès
  } catch (error) {
    // Gestion d'erreur
    console.error('Erreur:', error.error.message)
  }
}
```

## Optimisations

### Cache intelligent
- Les données sont mises en cache automatiquement
- Les listes sont invalidées lors des mutations
- Les données détaillées sont mises à jour optimistiquement

### Préchargement
```typescript
const queryClient = useQueryClient()

// Précharger un article
queryClient.prefetchQuery({
  queryKey: ARTICLES_QUERY_KEYS.detail(articleId),
  queryFn: () => apiClient.get(`/api/articles/${articleId}`)
})
```

### Invalidation manuelle
```typescript
const queryClient = useQueryClient()

// Invalider le cache des articles
queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.all })
```

## Bonnes pratiques

1. **Utilisez les hooks dans les composants** : Ne pas les utiliser en dehors du contexte React
2. **Gérez les états de chargement** : Toujours vérifier `isLoading` avant d'afficher les données
3. **Gérez les erreurs** : Toujours prévoir une gestion d'erreur appropriée
4. **Utilisez les mutations optimistes** : Pour une meilleure UX
5. **Invalidez le cache approprié** : Après les mutations pour maintenir la cohérence

## Migration depuis les appels fetch

### Avant (avec fetch)
```typescript
const [articles, setArticles] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles')
      const data = await response.json()
      setArticles(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  fetchArticles()
}, [])
```

### Après (avec hooks)
```typescript
const { data: articles, isLoading } = useArticles()
```

C'est tout ! Plus besoin de gérer manuellement les états, les erreurs, ou les effets.

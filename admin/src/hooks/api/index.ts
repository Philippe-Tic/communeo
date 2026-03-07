// Authentication hooks
export * from './useAuth'

// Content hooks
export * from './useArticles'
export * from './usePages'
export * from './useEvents'
export * from './useContactSubmissions'
export * from './useOfficialDocuments'
export * from './useSites'
export * from './useTeamMembers'
export * from './useAssociations'
export * from './useAlertes'
export * from './useMediaLibrary'
export * from './useUsers'
export * from './useWasteSchedules'

// Re-export commonly used types
export type { ApiError } from '../../services/apiClient'

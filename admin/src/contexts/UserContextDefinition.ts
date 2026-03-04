import { createContext } from 'react'

export interface UserProfile {
  id: number
  username: string
  email: string
  confirmed: boolean
  blocked: boolean
  first_name: string
  last_name: string
  municipality_role: 'super_admin' | 'admin' | 'editor'
  site?: {
    id: number
    documentId: string
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

export interface UserContextType {
  /** Les données utilisateur actuelles depuis /me */
  user: UserProfile | null

  /** État de chargement des données utilisateur */
  loading: boolean

  /** Erreur lors du chargement des données */
  error: Error | null

  /** Rafraîchir les données utilisateur depuis /me */
  refetchUser: () => Promise<void>

  /** Mettre à jour les données utilisateur localement (optimistic update) */
  updateUser: (userData: Partial<UserProfile>) => void

  /** Vérifier si l'utilisateur a un rôle spécifique */
  hasRole: (role: UserProfile['municipality_role']) => boolean

  /** Vérifier si l'utilisateur appartient à un site spécifique */
  belongsToSite: (siteId: number) => boolean

  /** Nom complet de l'utilisateur */
  fullName: string

  /** Initiales de l'utilisateur */
  initials: string
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

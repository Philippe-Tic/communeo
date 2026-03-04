import { createContext } from 'react'

export interface User {
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
  }
}

export interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

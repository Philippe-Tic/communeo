import apiClient from './apiClient'

export interface LoginCredentials {
  identifier: string // email or username
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  municipality_role: 'admin' | 'editor'
  site: number // site ID
}

export interface AuthResponse {
  jwt: string
  user: {
    id: number
    username: string
    email: string
    confirmed: boolean
    blocked: boolean
    first_name: string
    last_name: string
    municipality_role: 'admin' | 'editor'
    site: {
      id: number
      documentId: string
      name: string
      slug: string
    }
  }
}

export interface ApiError {
  error: {
    status: number
    name: string
    message: string
    details?: any
  }
}

/**
 * Legacy AuthService - Use Tanstack Query hooks instead for new implementations
 * @deprecated Prefer using hooks from /hooks/api/useAuth.ts for new code
 */
class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiClient.postWithoutAuth<AuthResponse>('/api/auth/local', credentials)
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return apiClient.postWithoutAuth<AuthResponse>('/api/auth/local/register', credentials)
  }

  async getCurrentUser(token: string): Promise<AuthResponse['user']> {
    // Save current state and set token temporarily
    const currentToken = localStorage.getItem('auth_token')
    localStorage.setItem('auth_token', token)

    try {
      const user = await apiClient.get<AuthResponse['user']>('/api/users/me?populate=site')
      return user
    } finally {
      // Restore previous token state
      if (currentToken) {
        localStorage.setItem('auth_token', currentToken)
      } else {
        localStorage.removeItem('auth_token')
      }
    }
  }

  async forgotPassword(email: string): Promise<{ ok: boolean }> {
    return apiClient.postWithoutAuth<{ ok: boolean }>('/api/auth/forgot-password', { email })
  }

  async resetPassword(
    code: string,
    password: string,
    passwordConfirmation: string
  ): Promise<AuthResponse> {
    return apiClient.postWithoutAuth<AuthResponse>('/api/auth/reset-password', {
      code,
      password,
      passwordConfirmation,
    })
  }

  // Utility method to check if token is expired
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch {
      return true
    }
  }

  // Get authorization header
  getAuthHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` }
  }
}

export const authService = new AuthService()
export default authService

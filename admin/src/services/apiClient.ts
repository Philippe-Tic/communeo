import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios'

export interface ApiError {
  error: {
    status: number
    name: string
    message: string
    details?: any
  }
}

class ApiClient {
  private instance: AxiosInstance
  private baseURL: string

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle errors
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
        }

        // Transform error to match our ApiError interface
        const apiError: ApiError = {
          error: {
            status: error.response?.status || 500,
            name: error.name || 'NetworkError',
            message: error.message || 'Network error occurred',
            details: error.response?.data,
          },
        }

        return Promise.reject(apiError)
      }
    )
  }

  // Generic methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete(url, config)
    return response.data
  }

  // Method to make requests without auth (for login, register, etc.)
  async postWithoutAuth<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post(url, data, {
      ...config,
      headers: {
        ...config?.headers,
        Authorization: undefined, // Remove auth header
      },
    })
    return response.data
  }

  // Get base URL for external use
  getBaseURL(): string {
    return this.baseURL
  }
}

export const apiClient = new ApiClient()
export default apiClient

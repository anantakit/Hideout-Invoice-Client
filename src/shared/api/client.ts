import axios from 'axios'
import type { AxiosError } from 'axios'
import type { ApiError } from '../types/api'

if (!import.meta.env.VITE_API_BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL is not defined. Set it in .env.local (dev) or Vercel environment variables (prod).'
  )
}

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Attach JWT token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status

    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    // For 409 Conflict, preserve the full axios error so callers can
    // inspect response.data (e.g. conflict details for extend-stay)
    if (status === 409) {
      return Promise.reject(error)
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'

    // Attach HTTP status so callers can distinguish 403 from other errors
    const err = new Error(message) as Error & { status?: number }
    err.status = status
    return Promise.reject(err)
  }
)

import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '../types/api'
import type { RefreshResponse } from '../types/auth'

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
  withCredentials: true, // send httpOnly cookies on every request
})

// Attach access token from memory on every request
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── In-memory access token ───────────────────────────────────────────────────
// Access token lives ONLY in JS memory — never in localStorage/sessionStorage.
// On page refresh it's lost; the httpOnly refresh cookie silently re-issues it.

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

// ── Token refresh logic ──────────────────────────────────────────────────────

let isRefreshing = false
let pendingRequests: Array<{
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}> = []

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status

    // Auto-refresh on 401 (skip for auth endpoints to avoid loops)
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: () => {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`
              resolve(apiClient(originalRequest))
            },
            reject,
          })
        })
      }

      isRefreshing = true

      try {
        // POST /auth/refresh — refresh token is in httpOnly cookie (sent automatically)
        const res = await axios.post<RefreshResponse>(
          `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )

        accessToken = res.data.token

        // Retry queued requests with new token
        pendingRequests.forEach(({ resolve }) => resolve(undefined))
        pendingRequests = []
        isRefreshing = false

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch {
        isRefreshing = false
        pendingRequests.forEach(({ reject }) => reject(error))
        pendingRequests = []
        forceLogout()
        return Promise.reject(error)
      }
    }

    // For 409 Conflict, preserve the full axios error so callers can
    // inspect response.data (e.g. conflict details for extend-stay)
    if (status === 409) {
      return Promise.reject(error)
    }

    // Build a user-friendly message from the API response.
    // For validation errors (422), include field-level details so the user
    // knows exactly which fields need fixing.
    const data = error.response?.data
    let message = data?.message || error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'

    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const details = (data.errors as Array<{ field: string; message: string }>)
        .map((e) => e.message)
        .join(', ')
      message = details
    }

    // Attach HTTP status so callers can distinguish 403 from other errors
    const err = new Error(message) as Error & { status?: number }
    err.status = status
    return Promise.reject(err)
  }
)

function forceLogout() {
  accessToken = null
  localStorage.removeItem('user')
  window.location.href = '/login'
}

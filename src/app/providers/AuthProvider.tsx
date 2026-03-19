import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { User, LoginPayload } from '../../shared/types/auth'
import { authApi } from '../../features/auth/api'
import { setAccessToken } from '../../shared/api/client'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadStoredUser)
  const [isLoading, setIsLoading] = useState(() => !!loadStoredUser())

  // On mount: if we have a stored user, try silent refresh to get a new access token.
  // The httpOnly cookie is sent automatically — if it's valid, we get a fresh access token.
  useEffect(() => {
    const storedUser = loadStoredUser()
    if (!storedUser) return

    authApi
      .refresh()
      .then((resp) => {
        setAccessToken(resp.token)
        setIsLoading(false)
      })
      .catch(() => {
        // Refresh failed — cookie expired or revoked
        localStorage.removeItem('user')
        setAccessToken(null)
        setUser(null)
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const resp = await authApi.login(payload)
    setAccessToken(resp.token)
    localStorage.setItem('user', JSON.stringify(resp.user))
    setUser(resp.user)
  }, [])

  const logout = useCallback(() => {
    // Fire-and-forget — don't block logout on API call
    authApi.logout().catch(() => {})
    setAccessToken(null)
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

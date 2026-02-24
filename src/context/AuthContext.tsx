import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, LoginPayload } from '../types/auth'
import { authApi } from '../api/auth'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
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

  const login = useCallback(async (payload: LoginPayload) => {
    const resp = await authApi.login(payload)
    localStorage.setItem('token', resp.token)
    localStorage.setItem('user', JSON.stringify(resp.user))
    setUser(resp.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

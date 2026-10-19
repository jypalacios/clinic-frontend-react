import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, apiRequest, clearStoredToken, getStoredToken, storeToken } from '../api/client'
import { hasAnyPermission, hasPermission } from './authorization'

export type UserRole = 'admin' | 'assistant' | 'doctor' | 'unknown'

export interface AuthUser {
  id?: number
  nombre?: string
  apellido?: string
  email?: string
  usuario?: string
  role?: string
  nom_role?: string
  id_role?: number
  permissions: string[]
  [key: string]: unknown
}

interface AuthContextValue {
  user: AuthUser | null
  role: UserRole
  permissions: string[]
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  loading: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

interface LoginResponse {
  access_token?: string
  token?: string
  token_type?: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getRole(user: AuthUser | null): UserRole {
  const rawRole = String(user?.role ?? user?.nom_role ?? user?.rol ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (rawRole === 'admin' || rawRole === 'administrador') return 'admin'
  if (rawRole === 'doctor' || rawRole === 'medico') return 'doctor'
  if (rawRole === 'assistant' || rawRole === 'asistente') return 'assistant'
  return 'unknown'
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === 'object'
    && value !== null
    && 'permissions' in value
    && Array.isArray(value.permissions)
    && value.permissions.every((permission) => typeof permission === 'string')
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (!getStoredToken()) {
      setLoading(false)
      return
    }
    apiRequest<unknown>('/auth/me')
      .then((profile) => {
        if (!isAuthUser(profile)) {
          throw new Error('La respuesta de sesión no contiene los permisos efectivos del rol.')
        }
        setUser(profile)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          clearStoredToken()
          return
        }
        setAuthError(error instanceof Error ? error.message : 'No fue posible verificar la sesión.')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const token = result.access_token ?? result.token
    if (!token) throw new Error('La respuesta de autenticación no contiene un token de acceso.')
    storeToken(token)
    try {
      const profile = await apiRequest<unknown>('/auth/me')
      if (!isAuthUser(profile)) {
        throw new Error('La respuesta de sesión no contiene los permisos efectivos del rol.')
      }
      setUser(profile)
      setAuthError(null)
    } catch (error) {
      clearStoredToken()
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user,
    role: getRole(user),
    permissions: user?.permissions ?? [],
    hasPermission: (permission: string) => hasPermission(user?.permissions ?? [], permission),
    hasAnyPermission: (permissions: string[]) => hasAnyPermission(user?.permissions ?? [], permissions),
    loading,
    authError,
    login,
    logout,
  }), [user, loading, authError, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.')
  return context
}

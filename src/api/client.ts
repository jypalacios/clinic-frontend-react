const API_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')
const TOKEN_KEY = 'clinica_access_token'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function errorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = payload.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) => item && typeof item === 'object' && 'msg' in item ? String(item.msg) : '')
        .filter(Boolean)
        .join(', ') || fallback
    }
  }
  return fallback
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getStoredToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError('No fue posible conectar con el servidor. Verifica que la API esté disponible.', 0)
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new ApiError(errorMessage(payload, `Error del servidor (${response.status}).`), response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from './client'

export interface ResourceState<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

export function useResource<T>(path: string, enabled = true): ResourceState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    let active = true
    if (!enabled) {
      setData(null)
      setError(null)
      setLoading(false)
      return () => {
        active = false
      }
    }
    setLoading(true)
    setError(null)
    apiRequest<T>(path)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Ocurrió un error inesperado.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [path, revision, enabled])

  return { data, error, loading, reload }
}

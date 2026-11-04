import { useEffect, useId, useState } from 'react'
import { apiRequest } from '../api/client'

interface SearchMultiSelectProps<T> {
  label: string
  endpoint: string
  selected: T[]
  onChange: (items: T[]) => void
  getId: (item: T) => number
  getCode: (item: T) => string
  getName: (item: T) => string
  placeholder?: string
  emptyText?: string
  minChars?: number
}

export function SearchMultiSelect<T>({
  label,
  endpoint,
  selected,
  onChange,
  getId,
  getCode,
  getName,
  placeholder = 'Escribe código o nombre para buscar…',
  emptyText = 'Aún no has seleccionado elementos.',
  minChars = 2,
}: SearchMultiSelectProps<T>) {
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const term = query.trim()
  const active = term.length >= minChars

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      apiRequest<T[]>(`${endpoint}?q=${encodeURIComponent(term)}&limit=20`)
        .then((data) => {
          if (cancelled) return
          setResults(data)
          setError(null)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setResults([])
          setError(err instanceof Error ? err.message : 'No se pudo realizar la búsqueda')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [active, endpoint, term])

  const selectedIds = new Set(selected.map(getId))
  const options = active ? results.filter((item) => !selectedIds.has(getId(item))) : []

  function add(item: T) {
    onChange([...selected, item])
    setQuery('')
    setResults([])
  }

  return (
    <div className="field clinical-field-wide">
      <label htmlFor={inputId}>{label}</label>
      <div className="cup-picker">
      <div className="search-picker">
      <input
        id={inputId}
        type="search"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(event) => setQuery(event.target.value)}
      />
      {active && (
        <ul className="search-results" role="listbox" aria-label={`Resultados de ${label}`}>
          {loading ? (
            <li className="cup-selected-empty">Buscando…</li>
          ) : error ? (
            <li className="cup-selected-empty">{error}</li>
          ) : options.length === 0 ? (
            <li className="cup-selected-empty">Sin coincidencias.</li>
          ) : (
            options.map((item) => (
              <li key={getId(item)} role="option" aria-selected={false}>
                <button type="button" className="text-button" onClick={() => add(item)}>
                  <b>{getCode(item)}</b> · {getName(item)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      </div>
      <div className="cup-selected" aria-live="polite">
        <div className="cup-selected-header">
          <strong>Seleccionados ({selected.length})</strong>
          {selected.length > 0 && (
            <button type="button" className="text-button" onClick={() => onChange([])}>Limpiar</button>
          )}
        </div>
        {selected.length === 0 ? (
          <span className="cup-selected-empty">{emptyText}</span>
        ) : (
          <ul>
            {selected.map((item) => (
              <li key={getId(item)}>
                <span><b>{getCode(item)}</b> · {getName(item)}</span>
                <button
                  type="button"
                  className="cup-remove"
                  aria-label={`Quitar ${getCode(item)}`}
                  onClick={() => onChange(selected.filter((current) => getId(current) !== getId(item)))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
      <small>Escribe al menos {minChars} caracteres para filtrar las coincidencias.</small>
    </div>
  )
}

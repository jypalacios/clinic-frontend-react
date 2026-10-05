import { useMemo, useState, type ReactNode } from 'react'
import type { ResourceState } from '../api/hooks'

type Row = Record<string, unknown>

interface ResourceTableProps<T> {
  title: string
  description: string
  columns: { key: string; label: string; render?: (value: unknown, row: Row) => ReactNode }[]
  resource: ResourceState<T>
  emptyMessage?: string
  actions?: (row: Row) => ReactNode
  headerAction?: ReactNode
}

function rowsFrom<T>(value: T | null): Row[] {
  if (Array.isArray(value)) return value as Row[]
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['items', 'results', 'data']) {
      if (Array.isArray(record[key])) return record[key] as Row[]
    }
  }
  return []
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ResourceTable<T>({
  title,
  description,
  columns,
  resource,
  emptyMessage = 'No hay registros disponibles.',
  actions,
  headerAction,
}: ResourceTableProps<T>) {
  const [search, setSearch] = useState('')
  const rows = useMemo(() => rowsFrom(resource.data), [resource.data])
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => Object.values(row).some((value) => displayValue(value).toLowerCase().includes(query)))
  }, [rows, search])

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GESTIÓN CLÍNICA</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="page-heading-actions">
          {headerAction}
          <button className="button button-secondary" onClick={resource.reload} disabled={resource.loading}>
            <span aria-hidden="true">↻</span> Actualizar
          </button>
        </div>
      </div>
      <div className="panel">
        <div className="table-toolbar">
          <div>
            <strong>{rows.length}</strong>
            <span className="muted"> registros</span>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar en los registros"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {resource.error ? (
          <div className="notice notice-error" role="alert">
            <strong>No se pudieron cargar los datos.</strong>
            <span>{resource.error}</span>
            <button className="text-button" onClick={resource.reload}>Intentar de nuevo</button>
          </div>
        ) : resource.loading ? (
          <div className="table-loading">Cargando registros…</div>
        ) : filteredRows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">⌕</span>
            <strong>{search ? 'Sin resultados' : emptyMessage}</strong>
            <span>{search ? 'Prueba con otra búsqueda.' : 'Los registros aparecerán aquí cuando estén disponibles.'}</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => <th key={column.key}>{column.label}</th>)}
                  {actions ? <th className="actions-column">Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={String(row.id ?? row.id_role ?? row.id_patients ?? row.id_doctors ?? row.id_appointments ?? index)}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(row[column.key], row) : displayValue(row[column.key])}</td>
                    ))}
                    {actions ? <td className="actions-cell">{actions(row)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

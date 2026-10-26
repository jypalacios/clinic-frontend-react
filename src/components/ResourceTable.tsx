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
  pageSize?: number
  filters?: ReactNode
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
  pageSize,
  filters,
}: ResourceTableProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const rows = useMemo(() => rowsFrom(resource.data), [resource.data])
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => Object.values(row).some((value) => displayValue(value).toLowerCase().includes(query)))
  }, [rows, search])
  const pageCount = pageSize ? Math.max(1, Math.ceil(filteredRows.length / pageSize)) : 1
  const currentPage = Math.min(page, pageCount)
  const visibleRows = pageSize
    ? filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredRows

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
        {filters}
        <div className="table-toolbar">
          <div>
            <strong>{filteredRows.length}</strong>
            <span className="muted"> registros</span>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar en los registros"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
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
        ) : visibleRows.length === 0 ? (
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
                {visibleRows.map((row, index) => (
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
        {pageSize && filteredRows.length > 0 && (
          <div className="table-pagination" aria-label="Paginación de resultados">
            <span>
              Mostrando {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} de {filteredRows.length}
            </span>
            <div>
              <button
                className="button button-secondary"
                type="button"
                aria-label="Página anterior"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span>Página {currentPage} de {pageCount}</span>
              <button
                className="button button-secondary"
                type="button"
                aria-label="Página siguiente"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={currentPage === pageCount}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

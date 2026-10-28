import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

interface Entity {
  nit: number
  nom_entidad: string
  activo: boolean
}

interface EntityForm {
  nit: string
  nom_entidad: string
  activo: boolean
}

const emptyForm: EntityForm = { nit: '', nom_entidad: '', activo: true }

function formatDate(value: unknown): string {
  if (typeof value !== 'string') return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function statusPill(value: unknown) {
  return value === true
    ? <span className="status-pill status-active">Activo</span>
    : <span className="status-pill status-inactive">Inactivo</span>
}

function entityFromRow(row: Record<string, unknown>): Entity | null {
  const nit = Number(row.nit)
  if (!Number.isInteger(nit) || typeof row.nom_entidad !== 'string') return null
  return { nit, nom_entidad: row.nom_entidad, activo: row.activo === true }
}

export function EntitiesPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('entities.manage')

  const entities = useResource<Entity[]>('/entities/', hasPermission('entities.view'))

  const [form, setForm] = useState<EntityForm>(emptyForm)
  const [editing, setEditing] = useState<Entity | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  function closeForm() {
    setForm(emptyForm)
    setEditing(null)
    setFormOpen(false)
    setError(null)
  }

  function startCreate() {
    setForm(emptyForm)
    setEditing(null)
    setError(null)
    setFeedback(null)
    setFormOpen(true)
  }

  function startEdit(entity: Entity) {
    setForm({ nit: String(entity.nit), nom_entidad: entity.nom_entidad, activo: entity.activo })
    setEditing(entity)
    setError(null)
    setFeedback(null)
    setFormOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      const nom_entidad = form.nom_entidad.trim()
      if (editing) {
        await apiRequest(`/entities/${editing.nit}`, {
          method: 'PUT',
          body: JSON.stringify({ nom_entidad, activo: form.activo }),
        })
      } else {
        await apiRequest('/entities/', {
          method: 'POST',
          body: JSON.stringify({ nit: Number(form.nit), nom_entidad, activo: form.activo }),
        })
      }
      setFeedback(editing ? 'Entidad actualizada correctamente.' : 'Entidad creada correctamente.')
      closeForm()
      entities.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la entidad.')
    } finally {
      setSubmitting(false)
    }
  }

  const nitValid = /^\d{1,10}$/.test(form.nit) && Number(form.nit) > 0 && Number(form.nit) <= 2147483647

  return (
    <section>
      <ResourceTable
        title="Entidades"
        description="Entidades (EPS, aseguradoras y convenios) registradas en la clínica."
        resource={entities}
        columns={[
          { key: 'nit', label: 'NIT' },
          { key: 'nom_entidad', label: 'Entidad' },
          { key: 'activo', label: 'Estado', render: statusPill },
          { key: 'usu_creacion_nombre', label: 'Creado por' },
          { key: 'fec_creacion', label: 'Fecha de creación', render: formatDate },
          { key: 'usu_actualizacion_nombre', label: 'Actualizado por' },
          { key: 'fec_actualizacion', label: 'Última actualización', render: formatDate },
        ]}
        actions={canManage ? (row) => {
          const entity = entityFromRow(row)
          if (!entity) return <span className="muted">Datos incompletos</span>
          return (
            <div className="table-actions">
              <button className="action-button action-button-edit" type="button" onClick={() => startEdit(entity)}>
                Editar
              </button>
            </div>
          )
        } : undefined}
        emptyMessage="No hay entidades registradas."
        pageSize={10}
        headerAction={canManage ? (
          <button className="button button-primary" type="button" onClick={startCreate} aria-expanded={formOpen}>
            + Nueva entidad
          </button>
        ) : undefined}
      />

      {feedback && <div className="notice notice-success patient-feedback" role="status">{feedback}</div>}

      {canManage && formOpen && (
        <div className="panel user-form-panel patient-form-panel" id="entity-form">
          <div className="user-form-header">
            <div>
              <span className="eyebrow">{editing ? 'EDITAR ENTIDAD' : 'CATÁLOGO CLÍNICO'}</span>
              <h2>{editing ? `Modificar entidad ${editing.nit}` : 'Crear una entidad'}</h2>
            </div>
          </div>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <form className="user-form" onSubmit={submit}>
            <div className="user-form-grid">
              <div className="field">
                <label htmlFor="entity-nit">NIT</label>
                <input
                  id="entity-nit"
                  inputMode="numeric"
                  value={form.nit}
                  maxLength={10}
                  required
                  disabled={editing !== null}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, nit: event.target.value.replace(/\D/g, '') }))
                    setError(null)
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="entity-name">Nombre de la entidad</label>
                <input
                  id="entity-name"
                  value={form.nom_entidad}
                  maxLength={200}
                  required
                  onChange={(event) => {
                    setForm((current) => ({ ...current, nom_entidad: event.target.value }))
                    setError(null)
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="entity-status">Estado</label>
                <select
                  id="entity-status"
                  value={form.activo ? '1' : '0'}
                  onChange={(event) => setForm((current) => ({ ...current, activo: event.target.value === '1' }))}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="user-form-actions">
              <button className="button button-secondary" type="button" onClick={closeForm} disabled={submitting}>
                Cancelar
              </button>
              <button
                className="button button-primary"
                type="submit"
                disabled={submitting || !form.nom_entidad.trim() || (!editing && !nitValid)}
              >
                {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear entidad'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

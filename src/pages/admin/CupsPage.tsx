import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

const extraKeys = [
  'extra_i', 'extra_ii', 'extra_iii', 'extra_iv', 'extra_v',
  'extra_vi', 'extra_vii', 'extra_viii', 'extra_ix',
] as const

type ExtraKey = (typeof extraKeys)[number]

interface Cup extends Record<ExtraKey, string | null> {
  id_cup: number
  codigo: string
  nombre: string
  descripcion: string | null
  habilitado: boolean
  isstandargel: boolean
  isstandmsps: boolean
}

interface CupForm extends Record<ExtraKey, string> {
  codigo: string
  nombre: string
  descripcion: string
  habilitado: boolean
  isstandargel: boolean
  isstandmsps: boolean
}

const emptyForm: CupForm = {
  codigo: '',
  nombre: '',
  descripcion: '',
  habilitado: true,
  isstandargel: false,
  isstandmsps: false,
  extra_i: '',
  extra_ii: '',
  extra_iii: '',
  extra_iv: '',
  extra_v: '',
  extra_vi: '',
  extra_vii: '',
  extra_viii: '',
  extra_ix: '',
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string') return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function statusPill(value: unknown) {
  return value === true
    ? <span className="status-pill status-active">Habilitado</span>
    : <span className="status-pill status-inactive">Inhabilitado</span>
}

function yesNo(value: unknown): string {
  return value === true ? 'Sí' : 'No'
}

function cupFromRow(row: Record<string, unknown>): Cup | null {
  const id = Number(row.id_cup)
  if (!Number.isInteger(id) || typeof row.codigo !== 'string' || typeof row.nombre !== 'string') return null
  const text = (value: unknown) => (typeof value === 'string' ? value : null)
  const cup = {
    id_cup: id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: text(row.descripcion),
    habilitado: row.habilitado === true,
    isstandargel: row.isstandargel === true,
    isstandmsps: row.isstandmsps === true,
  } as Cup
  for (const key of extraKeys) cup[key] = text(row[key])
  return cup
}

function formFromCup(cup: Cup): CupForm {
  const form: CupForm = {
    ...emptyForm,
    codigo: cup.codigo,
    nombre: cup.nombre,
    descripcion: cup.descripcion ?? '',
    habilitado: cup.habilitado,
    isstandargel: cup.isstandargel,
    isstandmsps: cup.isstandmsps,
  }
  for (const key of extraKeys) form[key] = cup[key] ?? ''
  return form
}

function toPayload(form: CupForm) {
  const payload: Record<string, unknown> = {
    codigo: form.codigo.trim(),
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim() || null,
    habilitado: form.habilitado,
    isstandargel: form.isstandargel,
    isstandmsps: form.isstandmsps,
  }
  for (const key of extraKeys) payload[key] = form[key].trim() || null
  return payload
}

export function CupsPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('cups.manage')

  const cups = useResource<Cup[]>('/cups/', hasPermission('cups.view'))

  const [form, setForm] = useState<CupForm>(emptyForm)
  const [editing, setEditing] = useState<Cup | null>(null)
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

  function startEdit(cup: Cup) {
    setForm(formFromCup(cup))
    setEditing(cup)
    setError(null)
    setFeedback(null)
    setFormOpen(true)
  }

  function setField<K extends keyof CupForm>(key: K, value: CupForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      const body = JSON.stringify(toPayload(form))
      if (editing) {
        await apiRequest(`/cups/${editing.id_cup}`, { method: 'PUT', body })
      } else {
        await apiRequest('/cups/', { method: 'POST', body })
      }
      setFeedback(editing ? 'CUPS actualizado correctamente.' : 'CUPS creado correctamente.')
      closeForm()
      cups.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el CUPS.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <ResourceTable
        title="CUPS / Órdenes"
        description="Catálogo de procedimientos CUPS disponibles para la generación de órdenes."
        resource={cups}
        columns={[
          { key: 'codigo', label: 'Código' },
          { key: 'nombre', label: 'Nombre' },
          { key: 'descripcion', label: 'Descripción' },
          { key: 'habilitado', label: 'Estado', render: statusPill },
          { key: 'isstandargel', label: 'Estándar Argel', render: yesNo },
          { key: 'isstandmsps', label: 'Estándar MSPS', render: yesNo },
          { key: 'usu_creacion_nombre', label: 'Creado por' },
          { key: 'fec_creacion', label: 'Fecha de creación', render: formatDate },
          { key: 'usu_actualizacion_nombre', label: 'Actualizado por' },
          { key: 'fec_actualizacion', label: 'Última actualización', render: formatDate },
        ]}
        actions={canManage ? (row) => {
          const cup = cupFromRow(row)
          if (!cup) return <span className="muted">Datos incompletos</span>
          return (
            <div className="table-actions">
              <button className="action-button action-button-edit" type="button" onClick={() => startEdit(cup)}>
                Editar
              </button>
            </div>
          )
        } : undefined}
        emptyMessage="No hay CUPS registrados."
        pageSize={10}
        headerAction={canManage ? (
          <button className="button button-primary" type="button" onClick={startCreate} aria-expanded={formOpen}>
            + Nuevo CUPS
          </button>
        ) : undefined}
      />

      {feedback && <div className="notice notice-success patient-feedback" role="status">{feedback}</div>}

      {canManage && formOpen && (
        <div className="panel user-form-panel patient-form-panel" id="cup-form">
          <div className="user-form-header">
            <div>
              <span className="eyebrow">{editing ? 'EDITAR CUPS' : 'CATÁLOGO CLÍNICO'}</span>
              <h2>{editing ? `Modificar CUPS ${editing.codigo}` : 'Crear un CUPS'}</h2>
            </div>
          </div>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <form className="user-form" onSubmit={submit}>
            <div className="user-form-grid">
              <div className="field">
                <label htmlFor="cup-codigo">Código</label>
                <input
                  id="cup-codigo"
                  value={form.codigo}
                  maxLength={50}
                  required
                  onChange={(event) => setField('codigo', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cup-nombre">Nombre</label>
                <input
                  id="cup-nombre"
                  value={form.nombre}
                  maxLength={255}
                  required
                  onChange={(event) => setField('nombre', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cup-descripcion">Descripción</label>
                <input
                  id="cup-descripcion"
                  value={form.descripcion}
                  maxLength={255}
                  onChange={(event) => setField('descripcion', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cup-habilitado">Estado</label>
                <select
                  id="cup-habilitado"
                  value={form.habilitado ? '1' : '0'}
                  onChange={(event) => setField('habilitado', event.target.value === '1')}
                >
                  <option value="1">Habilitado</option>
                  <option value="0">Inhabilitado</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="cup-argel">Estándar Argel</label>
                <select
                  id="cup-argel"
                  value={form.isstandargel ? '1' : '0'}
                  onChange={(event) => setField('isstandargel', event.target.value === '1')}
                >
                  <option value="0">No</option>
                  <option value="1">Sí</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="cup-msps">Estándar MSPS</label>
                <select
                  id="cup-msps"
                  value={form.isstandmsps ? '1' : '0'}
                  onChange={(event) => setField('isstandmsps', event.target.value === '1')}
                >
                  <option value="0">No</option>
                  <option value="1">Sí</option>
                </select>
              </div>
              {extraKeys.map((key, index) => (
                <div className="field" key={key}>
                  <label htmlFor={`cup-${key}`}>Campo extra {index + 1}</label>
                  <input
                    id={`cup-${key}`}
                    value={form[key]}
                    maxLength={255}
                    onChange={(event) => setField(key, event.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="user-form-actions">
              <button className="button button-secondary" type="button" onClick={closeForm} disabled={submitting}>
                Cancelar
              </button>
              <button
                className="button button-primary"
                type="submit"
                disabled={submitting || !form.codigo.trim() || !form.nombre.trim()}
              >
                {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear CUPS'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

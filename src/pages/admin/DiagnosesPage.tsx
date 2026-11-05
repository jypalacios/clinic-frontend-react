import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

interface Diagnosis {
  id_diag: number
  codigo: string
  diag_nombre: string
  tipo: string | null
  nivel: number | null
  nomurl: string | null
  activo: boolean
}

interface DiagnosisForm {
  codigo: string
  titulo: string
  tipo: string
  nivel: string
  nomurl: string
  activo: boolean
}

const emptyForm: DiagnosisForm = { codigo: '', titulo: '', tipo: '', nivel: '', nomurl: '', activo: true }

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

function diagnosisFromRow(row: Record<string, unknown>): Diagnosis | null {
  const id = Number(row.id_diag)
  if (!Number.isInteger(id) || typeof row.codigo !== 'string' || typeof row.diag_nombre !== 'string') return null
  const text = (value: unknown) => (typeof value === 'string' ? value : null)
  return {
    id_diag: id,
    codigo: row.codigo,
    diag_nombre: row.diag_nombre,
    tipo: text(row.tipo),
    nivel: typeof row.nivel === 'number' ? row.nivel : null,
    nomurl: text(row.nomurl),
    activo: row.activo === true,
  }
}

function toPayload(form: DiagnosisForm) {
  const nivel = form.nivel.trim()
  return {
    codigo: form.codigo.trim(),
    titulo: form.titulo.trim(),
    tipo: form.tipo.trim() || null,
    nivel: nivel === '' ? null : Number(nivel),
    nomurl: form.nomurl.trim() || null,
    activo: form.activo,
  }
}

export function DiagnosesPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('diagnoses.manage')

  const diagnoses = useResource<Diagnosis[]>('/diagnoses/', hasPermission('diagnoses.view'))

  const [form, setForm] = useState<DiagnosisForm>(emptyForm)
  const [editing, setEditing] = useState<Diagnosis | null>(null)
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

  function startEdit(diagnosis: Diagnosis) {
    setForm({
      codigo: diagnosis.codigo,
      titulo: diagnosis.diag_nombre,
      tipo: diagnosis.tipo ?? '',
      nivel: diagnosis.nivel === null ? '' : String(diagnosis.nivel),
      nomurl: diagnosis.nomurl ?? '',
      activo: diagnosis.activo,
    })
    setEditing(diagnosis)
    setError(null)
    setFeedback(null)
    setFormOpen(true)
  }

  function setField<K extends keyof DiagnosisForm>(key: K, value: DiagnosisForm[K]) {
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
        await apiRequest(`/diagnoses/${editing.id_diag}`, { method: 'PUT', body })
      } else {
        await apiRequest('/diagnoses/', { method: 'POST', body })
      }
      setFeedback(editing ? 'Diagnóstico actualizado correctamente.' : 'Diagnóstico creado correctamente.')
      closeForm()
      diagnoses.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el diagnóstico.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <ResourceTable
        title="Diagnósticos"
        description="Catálogo de diagnósticos disponibles para las historias clínicas."
        resource={diagnoses}
        columns={[
          { key: 'codigo', label: 'Código' },
          { key: 'diag_nombre', label: 'Diagnóstico' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'nivel', label: 'Nivel' },
          { key: 'nomurl', label: 'URL' },
          { key: 'activo', label: 'Estado', render: statusPill },
          { key: 'usu_creacion_nombre', label: 'Creado por' },
          { key: 'fec_creacion', label: 'Fecha de creación', render: formatDate },
          { key: 'usu_actualizacion_nombre', label: 'Actualizado por' },
          { key: 'fec_actualizacion', label: 'Última actualización', render: formatDate },
        ]}
        actions={canManage ? (row) => {
          const diagnosis = diagnosisFromRow(row)
          if (!diagnosis) return <span className="muted">Datos incompletos</span>
          return (
            <div className="table-actions">
              <button className="action-button action-button-edit" type="button" onClick={() => startEdit(diagnosis)}>
                Editar
              </button>
            </div>
          )
        } : undefined}
        emptyMessage="No hay diagnósticos registrados."
        pageSize={10}
        headerAction={canManage ? (
          <button className="button button-primary" type="button" onClick={startCreate} aria-expanded={formOpen}>
            + Nuevo diagnóstico
          </button>
        ) : undefined}
      />

      {feedback && <div className="notice notice-success patient-feedback" role="status">{feedback}</div>}

      {canManage && formOpen && (
        <div className="panel user-form-panel patient-form-panel" id="diagnosis-form">
          <div className="user-form-header">
            <div>
              <span className="eyebrow">{editing ? 'EDITAR DIAGNÓSTICO' : 'CATÁLOGO CLÍNICO'}</span>
              <h2>{editing ? `Modificar diagnóstico ${editing.codigo}` : 'Crear un diagnóstico'}</h2>
            </div>
          </div>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <form className="user-form" onSubmit={submit}>
            <div className="user-form-grid">
              <div className="field">
                <label htmlFor="diag-codigo">Código</label>
                <input
                  id="diag-codigo"
                  value={form.codigo}
                  maxLength={50}
                  required
                  onChange={(event) => setField('codigo', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="diag-titulo">Diagnóstico</label>
                <input
                  id="diag-titulo"
                  value={form.titulo}
                  maxLength={255}
                  required
                  onChange={(event) => setField('titulo', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="diag-tipo">Tipo</label>
                <input
                  id="diag-tipo"
                  value={form.tipo}
                  maxLength={255}
                  onChange={(event) => setField('tipo', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="diag-nivel">Nivel</label>
                <input
                  id="diag-nivel"
                  type="number"
                  min={0}
                  step={1}
                  value={form.nivel}
                  onChange={(event) => setField('nivel', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="diag-nomurl">URL</label>
                <input
                  id="diag-nomurl"
                  value={form.nomurl}
                  maxLength={255}
                  onChange={(event) => setField('nomurl', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="diag-activo">Estado</label>
                <select
                  id="diag-activo"
                  value={form.activo ? '1' : '0'}
                  onChange={(event) => setField('activo', event.target.value === '1')}
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
                disabled={submitting || !form.codigo.trim() || !form.titulo.trim()}
              >
                {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear diagnóstico'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

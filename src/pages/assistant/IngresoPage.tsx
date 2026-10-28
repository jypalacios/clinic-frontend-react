import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'

interface AppointmentRecord {
  id_appointments: number
  fecha_hora: string
  nom_estado: string
  paciente: string | null
  medico: string | null
  fec_ingreso: string | null
  fec_dilatacion: string | null
  prioridad: boolean | null
}

interface IngresoForm {
  fec_ingreso: string
  fec_dilatacion: string
  prioridad: boolean
}

const SCHEDULED_STATES = ['PROGRAMADA', 'CONFIRMADA', 'EN SALA DE ESPERA']

function toLocalInputValue(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function formatDate(value: unknown): string {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function IngresoPage() {
  const resource = useResource<AppointmentRecord[]>('/appointments/')
  const [editing, setEditing] = useState<AppointmentRecord | null>(null)
  const [form, setForm] = useState<IngresoForm>({ fec_ingreso: '', fec_dilatacion: '', prioridad: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const scheduled = {
    ...resource,
    data: (resource.data ?? []).filter((appointment) => SCHEDULED_STATES.includes(appointment.nom_estado)),
  }

  function startIngreso(appointment: AppointmentRecord) {
    setEditing(appointment)
    setForm({
      fec_ingreso: toLocalInputValue(appointment.fec_ingreso) || toLocalInputValue(new Date().toISOString()),
      fec_dilatacion: toLocalInputValue(appointment.fec_dilatacion),
      prioridad: Boolean(appointment.prioridad),
    })
    setError(null)
    setFeedback(null)
  }

  function closeForm() {
    setEditing(null)
    setError(null)
  }

  useEffect(() => {
    if (!editing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) closeForm()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [editing, submitting])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    if (form.fec_dilatacion && new Date(form.fec_dilatacion) < new Date(form.fec_ingreso)) {
      setError('La fecha de dilatación no puede ser anterior a la fecha de ingreso.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await apiRequest<AppointmentRecord>(`/appointments/${editing.id_appointments}/ingreso`, {
        method: 'PUT',
        body: JSON.stringify({
          fec_ingreso: new Date(form.fec_ingreso).toISOString(),
          fec_dilatacion: form.fec_dilatacion ? new Date(form.fec_dilatacion).toISOString() : null,
          prioridad: form.prioridad,
        }),
      })
      setFeedback(`Ingreso registrado para la cita #${editing.id_appointments}.`)
      closeForm()
      resource.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible registrar el ingreso.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <ResourceTable
        title="Ingreso"
        description="Registra el ingreso de las citas programadas: fecha de ingreso, dilatación y prioridad."
        resource={scheduled}
        columns={[
          { key: 'id_appointments', label: 'Cita' },
          { key: 'fecha_hora', label: 'Fecha y hora', render: formatDate },
          { key: 'paciente', label: 'Paciente' },
          { key: 'medico', label: 'Médico' },
          { key: 'nom_estado', label: 'Estado' },
          { key: 'fec_ingreso', label: 'Ingreso', render: formatDate },
          { key: 'fec_dilatacion', label: 'Dilatación', render: formatDate },
          { key: 'prioridad', label: 'Prioridad', render: (value) => (value === true ? <span className="priority-badge priority-high">Prioritaria</span> : value === false ? 'Normal' : '—') },
        ]}
        actions={(row) => {
          const appointment = row as unknown as AppointmentRecord
          return (
            <div className="table-actions">
              <button
                className="action-button action-button-edit"
                type="button"
                aria-haspopup="dialog"
                aria-controls="ingreso-form"
                onClick={() => startIngreso(appointment)}
              >
                {appointment.fec_ingreso ? 'Editar ingreso' : 'Dar ingreso'}
              </button>
            </div>
          )
        }}
        emptyMessage="No hay citas programadas pendientes de ingreso."
      />

      {feedback && <div className="notice notice-success patient-feedback" role="status">{feedback}</div>}

      {editing && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) closeForm() }}>
          <div className="panel user-form-panel patient-form-panel modal-dialog" id="ingreso-form" role="dialog" aria-modal="true" aria-labelledby="ingreso-form-title">
            <div className="user-form-header">
              <div>
                <span className="eyebrow">INGRESO DE CITA</span>
                <h2 id="ingreso-form-title">Cita #{editing.id_appointments} — {editing.paciente ?? 'Paciente'}</h2>
              </div>
            </div>
            {error && <div className="notice notice-error" role="alert">{error}</div>}
            <form className="user-form" onSubmit={handleSubmit}>
              <div className="user-form-grid">
                <div className="field">
                  <label htmlFor="ingreso-fec-ingreso">Fecha y hora de ingreso</label>
                  <input
                    id="ingreso-fec-ingreso"
                    type="datetime-local"
                    value={form.fec_ingreso}
                    onChange={(event) => setForm((current) => ({ ...current, fec_ingreso: event.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="ingreso-fec-dilatacion">Fecha y hora de dilatación</label>
                  <input
                    id="ingreso-fec-dilatacion"
                    type="datetime-local"
                    value={form.fec_dilatacion}
                    min={form.fec_ingreso}
                    onChange={(event) => setForm((current) => ({ ...current, fec_dilatacion: event.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ingreso-prioridad">Prioridad</label>
                  <select
                    id="ingreso-prioridad"
                    value={form.prioridad ? 'true' : 'false'}
                    onChange={(event) => setForm((current) => ({ ...current, prioridad: event.target.value === 'true' }))}
                  >
                    <option value="false">Normal</option>
                    <option value="true">Prioritaria</option>
                  </select>
                </div>
              </div>
              <div className="user-form-actions">
                <button className="button button-secondary" type="button" onClick={closeForm} disabled={submitting}>
                  Cancelar
                </button>
                <button className="button button-primary" type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Guardar ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

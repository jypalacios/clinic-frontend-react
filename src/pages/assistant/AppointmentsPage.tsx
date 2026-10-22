import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

interface AppointmentRecord {
  id_appointments: number
  id_patients: number
  id_doctors: number
  fecha_hora: string
  nom_estado: string
}

interface PatientOption {
  id_patients: number
  ced_patients: string
  nom_patients: string
  ape_patients: string
  activo: boolean | 0 | 1
  discapacidad?: boolean | null
}

interface DoctorOption {
  id_doctors: number
  nom_doctors: string
  ape_doctors: string
  activo: boolean
}

interface AppointmentForm {
  id_patients: string
  id_doctors: string
  fecha_hora: string
  estado: string
}

const emptyForm: AppointmentForm = { id_patients: '', id_doctors: '', fecha_hora: '', estado: '' }

function appointmentFromRow(row: Record<string, unknown>): AppointmentRecord | null {
  const id_appointments = Number(row.id_appointments)
  const id_patients = Number(row.id_patients)
  const id_doctors = Number(row.id_doctors)
  if (
    !Number.isInteger(id_appointments) ||
    !Number.isInteger(id_patients) ||
    !Number.isInteger(id_doctors) ||
    typeof row.fecha_hora !== 'string' ||
    typeof row.nom_estado !== 'string'
  ) return null
  return {
    id_appointments,
    id_patients,
    id_doctors,
    fecha_hora: row.fecha_hora,
    nom_estado: row.nom_estado,
  }
}

function toLocalInputValue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function AppointmentsPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('appointments.manage')
  const resource = useResource<AppointmentRecord[]>('/appointments/')
  const patients = useResource<PatientOption[]>('/patients/', canManage)
  const doctors = useResource<DoctorOption[]>('/doctors/', canManage)
  const states = useResource<string[]>('/appointments/estados', canManage)
  const [form, setForm] = useState<AppointmentForm>(emptyForm)
  const [editing, setEditing] = useState<AppointmentRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const activePatients = (patients.data ?? []).filter((patient) => patient.activo === 0 || patient.activo === true)
  const activeDoctors = (doctors.data ?? []).filter((doctor) => doctor.activo)
  const patientNames = new Map(activePatients.map((patient) => [
    patient.id_patients,
    `${patient.nom_patients} ${patient.ape_patients} (${patient.ced_patients})`,
  ]))
  const doctorNames = new Map(activeDoctors.map((doctor) => [
    doctor.id_doctors,
    `${doctor.nom_doctors} ${doctor.ape_doctors}`,
  ]))

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

  function startEdit(appointment: AppointmentRecord) {
    setForm({
      id_patients: String(appointment.id_patients),
      id_doctors: String(appointment.id_doctors),
      fecha_hora: toLocalInputValue(appointment.fecha_hora),
      estado: appointment.nom_estado,
    })
    setEditing(appointment)
    setError(null)
    setFeedback(null)
    setFormOpen(true)
  }

  function updateField(field: keyof AppointmentForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
    setFeedback(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      const fecha_hora = new Date(form.fecha_hora).toISOString()
      const endpoint = editing ? `/appointments/${editing.id_appointments}` : '/appointments/'
      const payload = editing
        ? { id_doctors: Number(form.id_doctors), fecha_hora, estado: form.estado }
        : { id_patients: Number(form.id_patients), id_doctors: Number(form.id_doctors), fecha_hora }
      await apiRequest<AppointmentRecord>(endpoint, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setFeedback(editing ? 'Cita actualizada correctamente.' : 'Cita creada correctamente.')
      closeForm()
      resource.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la cita.')
    } finally {
      setSubmitting(false)
    }
  }

  const catalogError = patients.error || doctors.error
  const catalogLoading = patients.loading || doctors.loading

  return (
    <section>
      <ResourceTable
        title="Citas"
        description="Agenda citas y reprograma su fecha, hora o médico asignado."
        resource={resource}
        columns={[
          { key: 'id_appointments', label: 'Cita' },
          { key: 'fecha_hora', label: 'Fecha y hora', render: (value) => value ? formatDate(String(value)) : '—' },
          { key: 'id_patients', label: 'Paciente', render: (value) => patientNames.get(Number(value)) ?? `Paciente #${String(value ?? '')}` },
          { key: 'id_doctors', label: 'Médico', render: (value) => doctorNames.get(Number(value)) ?? `Médico #${String(value ?? '')}` },
          { key: 'nom_estado', label: 'Estado' },
          { key: 'discapacidad', label: 'Discapacidad', render: (value) => value === true ? 'Sí' : 'No' },
        ]}
        actions={canManage ? (row) => {
          const appointment = appointmentFromRow(row)
          if (!appointment) return <span className="muted">Datos incompletos</span>
          return (
            <div className="table-actions">
              <button className="action-button action-button-edit" type="button" onClick={() => startEdit(appointment)}>
                Editar
              </button>
            </div>
          )
        } : undefined}
        emptyMessage="No hay citas registradas."
        headerAction={canManage ? (
          <button className="button button-primary" type="button" onClick={startCreate} aria-expanded={formOpen}>
            + Nueva cita
          </button>
        ) : undefined}
      />

      {feedback && <div className="notice notice-success patient-feedback" role="status">{feedback}</div>}

      {canManage && formOpen && (
        <div className="panel user-form-panel patient-form-panel" id="appointment-form">
          <div className="user-form-header">
            <div>
              <span className="eyebrow">{editing ? 'REPROGRAMAR CITA' : 'AGENDA CLÍNICA'}</span>
              <h2>{editing ? `Modificar cita #${editing.id_appointments}` : 'Crear una cita'}</h2>
            </div>
          </div>

          {catalogError && (
            <div className="notice notice-error" role="alert">
              <strong>No se pudieron cargar pacientes o profesionales.</strong>
              <span>{catalogError}</span>
              <button className="text-button" type="button" onClick={() => { patients.reload(); doctors.reload() }}>
                Intentar de nuevo
              </button>
            </div>
          )}
          {!catalogLoading && !catalogError && (!activePatients.length || !activeDoctors.length) && (
            <div className="notice notice-warning" role="status">
              Registre al menos un paciente y un médico activo antes de agendar citas.
            </div>
          )}
          {error && <div className="notice notice-error" role="alert">{error}</div>}

          <form className="user-form" onSubmit={handleSubmit}>
            <div className="user-form-grid">
              {!editing && (
                <div className="field">
                  <label htmlFor="appointment-patient">Paciente</label>
                  <select
                    id="appointment-patient"
                    value={form.id_patients}
                    onChange={(event) => updateField('id_patients', event.target.value)}
                    required
                    disabled={catalogLoading || Boolean(catalogError) || !activePatients.length}
                  >
                    <option value="">Seleccione un paciente</option>
                    {activePatients.map((patient) => (
                      <option key={patient.id_patients} value={patient.id_patients}>
                        {patient.nom_patients} {patient.ape_patients} — {patient.ced_patients}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editing && (
                <div className="field">
                  <label>Paciente</label>
                  <input value={patientNames.get(editing.id_patients) ?? `Paciente #${editing.id_patients}`} readOnly />
                </div>
              )}
              {(() => {
                const selected = (patients.data ?? []).find((patient) => patient.id_patients === Number(editing ? editing.id_patients : form.id_patients))
                return selected ? (
                  <div className="field">
                    <label>Discapacidad</label>
                    <input value={selected.discapacidad === true ? 'Sí' : 'No'} readOnly />
                  </div>
                ) : null
              })()}
              <div className="field">
                <label htmlFor="appointment-doctor">Médico asignado</label>
                <select
                  id="appointment-doctor"
                  value={form.id_doctors}
                  onChange={(event) => updateField('id_doctors', event.target.value)}
                  required
                  disabled={catalogLoading || Boolean(catalogError) || !activeDoctors.length}
                >
                  <option value="">Seleccione un médico</option>
                  {activeDoctors.map((doctor) => (
                    <option key={doctor.id_doctors} value={doctor.id_doctors}>
                      {doctor.nom_doctors} {doctor.ape_doctors}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="appointment-date">Fecha y hora</label>
                <input
                  id="appointment-date"
                  type="datetime-local"
                  value={form.fecha_hora}
                  onChange={(event) => updateField('fecha_hora', event.target.value)}
                  required
                />
              </div>
              {editing && (
                <div className="field">
                  <label htmlFor="appointment-state">Estado</label>
                  <select
                    id="appointment-state"
                    value={form.estado}
                    onChange={(event) => updateField('estado', event.target.value)}
                    required
                    disabled={states.loading || Boolean(states.error)}
                  >
                    {(states.data ?? [editing.nom_estado]).map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="user-form-actions">
              <button className="button button-secondary" type="button" onClick={closeForm} disabled={submitting}>
                Cancelar
              </button>
              <button
                className="button button-primary"
                type="submit"
                disabled={submitting || catalogLoading || Boolean(catalogError) || !activeDoctors.length || (!editing && !activePatients.length)}
              >
                {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cita'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

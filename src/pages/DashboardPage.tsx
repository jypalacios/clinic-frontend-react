import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useResource } from '../api/hooks'
import { StatCard } from '../components/StatCard'

function countRecords(value: unknown): number | null {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.total === 'number') return record.total
    if (typeof record.count === 'number') return record.count
    for (const key of ['items', 'results', 'data']) {
      if (Array.isArray(record[key])) return record[key].length
    }
  }
  return null
}

const SCHEDULED_STATES = ['PROGRAMADA', 'EN SALA DE ESPERA', 'CONFIRMADA']

function countTodayScheduled(value: unknown, onlyDisability = false): number | null {
  if (!Array.isArray(value)) return countRecords(value)
  const today = new Date().toDateString()
  return value.filter((item) => {
    const appointment = item as { fecha_hora?: string; nom_estado?: string; discapacidad?: boolean | null }
    if (onlyDisability && appointment.discapacidad !== true) return false
    if (!appointment.fecha_hora || !SCHEDULED_STATES.includes(String(appointment.nom_estado))) return false
    const date = new Date(appointment.fecha_hora)
    return !Number.isNaN(date.getTime()) && date.toDateString() === today
  }).length
}

function countTodayConfirmedPatients(value: unknown): number | null {
  if (!Array.isArray(value)) return countRecords(value)
  const today = new Date().toDateString()
  const patients = new Set<number>()
  for (const item of value) {
    const appointment = item as { id_patients?: number; fecha_hora?: string; nom_estado?: string }
    if (appointment.nom_estado !== 'CONFIRMADA' || !appointment.fecha_hora) continue
    const date = new Date(appointment.fecha_hora)
    if (!Number.isNaN(date.getTime()) && date.toDateString() === today) patients.add(Number(appointment.id_patients))
  }
  return patients.size
}

const AGENDA_HOURS = Array.from({ length: 12 }, (_, index) => index + 7)

interface AgendaItem { id: number; time: string; patient: string; doctor: string; state: string }
interface AgendaStatus { label: string; count: number; color: string }

const AGENDA_STATUS_COLORS = ['#4d82cc', '#38a883', '#d18a42', '#8667c8', '#d46b73', '#4b9a9c']

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function countAgendaStatuses(slots: Map<number, AgendaItem[]>): AgendaStatus[] {
  const counts = new Map<string, number>()
  for (const item of Array.from(slots.values()).flat()) {
    const status = item.state.trim() || 'Sin estado'
    counts.set(status, (counts.get(status) ?? 0) + 1)
  }
  return Array.from(counts, ([label, count], index) => ({
    label,
    count,
    color: AGENDA_STATUS_COLORS[index % AGENDA_STATUS_COLORS.length],
  }))
}

function pieSlicePath(startAngle: number, endAngle: number): string {
  const center = 90
  const radius = 80
  const startRadians = (startAngle * Math.PI) / 180
  const endRadians = (endAngle * Math.PI) / 180
  const startX = center + radius * Math.cos(startRadians)
  const startY = center + radius * Math.sin(startRadians)
  const endX = center + radius * Math.cos(endRadians)
  const endY = center + radius * Math.sin(endRadians)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`
}

function buildAgenda(appointmentsData: unknown, patientsData: unknown, selectedDate: string): Map<number, AgendaItem[]> {
  const slots = new Map<number, AgendaItem[]>()
  if (!Array.isArray(appointmentsData)) return slots
  const names = new Map<number, string>()
  if (Array.isArray(patientsData)) {
    for (const item of patientsData) {
      const p = item as { id_patients?: number; nom_patients?: string; ape_patients?: string }
      if (p.id_patients != null) names.set(Number(p.id_patients), `${p.nom_patients ?? ''} ${p.ape_patients ?? ''}`.trim())
    }
  }
  const sorted = appointmentsData
    .map((item) => item as { id_appointments?: number; id_patients?: number; id_doctors?: number; medico?: string | null; fecha_hora?: string; nom_estado?: string })
    .filter((a) => a.fecha_hora && !/CANCELAD/i.test(String(a.nom_estado)))
    .map((a) => ({ a, date: new Date(a.fecha_hora as string) }))
    .filter(({ date }) => !Number.isNaN(date.getTime()) && toDateInputValue(date) === selectedDate)
    .sort((x, y) => x.date.getTime() - y.date.getTime())
  for (const { a, date } of sorted) {
    const hour = Math.min(Math.max(date.getHours(), AGENDA_HOURS[0]), AGENDA_HOURS[AGENDA_HOURS.length - 1])
    const list = slots.get(hour) ?? []
    list.push({
      id: Number(a.id_appointments),
      time: date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      patient: names.get(Number(a.id_patients)) || `Paciente #${a.id_patients}`,
      doctor: a.medico || `Médico #${a.id_doctors}`,
      state: String(a.nom_estado ?? ''),
    })
    slots.set(hour, list)
  }
  return slots
}

export function DashboardPage() {
  const { user, hasPermission } = useAuth()
  const canViewPatients = hasPermission('patients.view')
  const canViewAppointments = hasPermission('appointments.view')
  const patients = useResource<unknown>('/patients/', canViewPatients)
  const appointments = useResource<unknown>('/appointments/', canViewAppointments)
  const [agendaDate, setAgendaDate] = useState(() => toDateInputValue(new Date()))
  const agendaSlots = buildAgenda(appointments.data, patients.data, agendaDate || toDateInputValue(new Date()))
  const agendaStatuses = countAgendaStatuses(agendaSlots)
  const agendaTotal = agendaStatuses.reduce((total, status) => total + status.count, 0)
  const name = user?.nombre || user?.apellido || 'Equipo clínico'
  const hasErrors = (canViewPatients && patients.error) || (canViewAppointments && appointments.error)

  return (
    <section>
      <div className="welcome-banner">
        <div>
          <span className="eyebrow">PANEL DE CONTROL</span>
          <h1>Hola, {name} <span aria-hidden="true">✦</span></h1>
          <p>Este es el resumen de actividad de tu espacio clínico.</p>
        </div>
        <div className="welcome-art" aria-hidden="true"><span>✚</span><i /><b /></div>
      </div>
      <div className="section-heading">
        <div><h2>Resumen general</h2><p>Una vista rápida de la operación de tu clínica.</p></div>
        <span className="today-pill"><span /> Actualizado en tiempo real</span>
      </div>
      {hasErrors && <div className="notice notice-warning">Algunos indicadores no están disponibles. Revisa la conexión con la API.</div>}
      <div className="stats-grid">
        <StatCard label="Pacientes registrados" value={canViewPatients ? countRecords(patients.data)?.toLocaleString() ?? '—' : '—'} helper="Base de pacientes" icon="♧" tone="blue" />
        <StatCard label="Citas programadas" value={canViewAppointments ? countTodayScheduled(appointments.data)?.toLocaleString() ?? '—' : '—'} helper="Agenda de hoy" icon="▦" tone="green" />
        <StatCard label="Citas hoy con discapacidad" value={canViewAppointments ? countTodayScheduled(appointments.data, true)?.toLocaleString() ?? '—' : '—'} helper="Pacientes con discapacidad" icon="♿" tone="violet" />
        <StatCard label="Pacientes confirmados hoy" value={canViewAppointments ? countTodayConfirmedPatients(appointments.data)?.toLocaleString() ?? '—' : '—'} helper="Citas confirmadas" icon="✔" tone="orange" />
      </div>
      <div className="dashboard-columns">
        <div className="panel agenda-status-panel">
          <div className="panel-heading"><div><h2>Estado de pacientes</h2><p>Distribución de las citas de la agenda del día.</p></div><span className="panel-heading-icon">◔</span></div>
          {!canViewAppointments ? (
            <p className="agenda-empty">No tienes permiso para ver el estado de la agenda.</p>
          ) : appointments.loading ? (
            <p className="agenda-empty">Cargando el estado de la agenda…</p>
          ) : appointments.error ? (
            <p className="agenda-empty">No fue posible cargar el estado de la agenda: {appointments.error}</p>
          ) : agendaTotal === 0 ? (
            <p className="agenda-empty">No hay pacientes en la agenda de este día.</p>
          ) : (
            <div className="agenda-status-content">
              <svg
                className="agenda-status-chart"
                viewBox="0 0 180 180"
                role="img"
                aria-label={`Estado de ${agendaTotal} citas con pacientes en la agenda del día`}
              >
                <title>Estado de pacientes en la agenda del día</title>
                {agendaStatuses.length === 1 ? (
                  <circle cx="90" cy="90" r="80" fill={agendaStatuses[0].color} />
                ) : (
                  agendaStatuses.map((status, index) => {
                    const startAngle = -90 + (agendaStatuses
                      .slice(0, index)
                      .reduce((sum, previous) => sum + previous.count, 0) / agendaTotal) * 360
                    const endAngle = startAngle + (status.count / agendaTotal) * 360
                    return <path key={status.label} d={pieSlicePath(startAngle, endAngle)} fill={status.color} stroke="#fff" strokeWidth="2" />
                  })
                )}
              </svg>
              <ul className="agenda-status-legend">
                {agendaStatuses.map((status) => (
                  <li key={status.label}>
                    <span className="agenda-status-swatch" style={{ backgroundColor: status.color }} aria-hidden="true" />
                    <span className="agenda-status-label">{status.label}</span>
                    <strong>{status.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {canViewAppointments && !appointments.error && !appointments.loading && agendaTotal > 0 && (
            <p className="agenda-status-total">Total de citas: <strong>{agendaTotal}</strong></p>
          )}
        </div>
        <div className="panel agenda-panel">
          <div className="panel-heading"><div><h2>{agendaDate === toDateInputValue(new Date()) ? 'Agenda de hoy' : 'Agenda del día'}</h2><p>Franjas horarias, pacientes y médicos asignados.</p></div><span className="panel-heading-icon">▦</span></div>
          <label className="agenda-filter">
            <span className="agenda-filter-label">Fecha</span>
            <input type="date" className="agenda-filter-input" value={agendaDate} onChange={(event) => setAgendaDate(event.target.value)} />
            {agendaDate !== toDateInputValue(new Date()) && (<button type="button" className="button button-secondary agenda-filter-today" onClick={() => setAgendaDate(toDateInputValue(new Date()))}>Hoy</button>)}
          </label>
          {!canViewAppointments ? (
            <p className="agenda-empty">No tienes permiso para ver la agenda.</p>
          ) : (
            <div className="agenda-list">
              {AGENDA_HOURS.map((hour) => {
                const slot = agendaSlots.get(hour) ?? []
                return (
                  <div className="agenda-row" key={hour}>
                    <span className="agenda-hour">{String(hour).padStart(2, '0')}:00</span>
                    <div className="agenda-events">
                      {slot.length === 0 ? <span className="agenda-free">Libre</span> : slot.map((item) => (
                        <div className="agenda-event" key={item.id}>
                          <strong>{item.time} · {item.patient}</strong>
                          <small>Médico: {item.doctor}</small>
                          <small>{item.state}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
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

export function DashboardPage() {
  const { user, hasPermission } = useAuth()
  const canViewPatients = hasPermission('patients.view')
  const canViewDoctors = hasPermission('doctors.view')
  const canViewAppointments = hasPermission('appointments.view')
  const patients = useResource<unknown>('/patients/', canViewPatients)
  const appointments = useResource<unknown>('/appointments/', canViewAppointments)
  const name = user?.nombre || user?.apellido || 'Equipo clínico'
  const hasErrors = (canViewPatients && patients.error) || (canViewAppointments && appointments.error)
  const quickLinks = [
    canViewPatients && { to: '/assistant/patients', icon: '♧', title: 'Pacientes', text: 'Consulta y gestiona pacientes.' },
    canViewAppointments && { to: '/assistant/appointments', icon: '▦', title: 'Citas', text: 'Revisa la agenda de atención.' },
    canViewDoctors && { to: '/admin/doctors', icon: '✚', title: 'Profesionales', text: 'Consulta el equipo clínico.' },
    hasPermission('my_patients.view') && { to: '/doctor/patients', icon: '♧', title: 'Mis pacientes', text: 'Consulta tu lista de pacientes asignados.' },
    hasPermission('medical_history.view') && { to: '/doctor/history', icon: '▤', title: 'Historia clínica', text: 'Accede a la información clínica.' },
    hasPermission('consultations.view') && { to: '/doctor/consult', icon: '☷', title: 'Consultas', text: 'Registra y consulta atenciones clínicas.' },
  ].filter((item) => item !== false)

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
        <div className="panel welcome-panel">
          <div className="panel-heading"><div><h2>Accesos rápidos</h2><p>Continúa con las tareas de tu jornada.</p></div><span className="panel-heading-icon">↗</span></div>
          <div className="quick-links">
            {quickLinks.map((item) => (
              <Link className="quick-link" key={item.to} to={item.to}>
                <span className="quick-link-icon">{item.icon}</span>
                <span><strong>{item.title}</strong><small>{item.text}</small></span>
                <span className="quick-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="panel care-panel">
          <div className="care-icon">✦</div>
          <span className="eyebrow">CLÍNICA SOFTWARE</span>
          <h2>Una atención que conecta</h2>
          <p>Organiza la información y acompaña cada etapa del cuidado de tus pacientes.</p>
          <div className="care-line"><span>Tu equipo clínico, más cerca</span><span aria-hidden="true">→</span></div>
        </div>
      </div>
    </section>
  )
}

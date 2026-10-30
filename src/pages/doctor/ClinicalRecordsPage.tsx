import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'
import { useNavigate } from 'react-router-dom'

interface PatientOption {
  id_patients: number
  ced_patients: string
  nom_patients: string
  ape_patients: string
  edad: number
  nom_sexo: string
}

const DILATION_ALERT_MS = 20 * 60_000

interface AllergyInfo {
  id_alergia: number
  nom_tipo_alergia?: string | null
  activo: boolean
}
const WAITING_ROOM_STATE = 'EN SALA DE ESPERA'
const ATTENDED_STATE = 'ATENDIDA'
const SCHEDULED_STATES = ['PROGRAMADA', WAITING_ROOM_STATE, 'CONFIRMADA']

interface DoctorAppointment {
  id_appointments: number
  id_patients: number
  paciente: string | null
  fecha_hora: string
  nom_estado: string
  fec_ingreso: string | null
  fec_dilatacion: string | null
  prioridad: boolean | null
}

interface ClinicalEntry {
  id_entries: number
  id_clinics: number
  id_doctors: number
  id_entries_rectifica: number | null
  fec_entrada: string
  motivo_consulta: string
  examen_fisico: string | null
  diagnostico: string | null
  plan: string | null
  formulacion: string | null
  notas: string | null
  medico: string
}

interface ClinicalRecord {
  id_clinic: number
  id_patients: number
  patient: PatientOption
  id_doctors: number
  doctor: { id_doctors: number; nom_doctors: string; ape_doctors: string }
  fec_creacion: string
  activo: boolean
  entries: ClinicalEntry[]
}

interface CupOption {
  id_cup: number
  codigo: string
  nombre: string
}

interface PatientCup {
  id_cup_patient: number
  id_cup: number
  codigo: string
  nombre: string
  fec_creacion: string | null
}

interface EntryForm {
  motivo_consulta: string
  examen_fisico: string
  diagnostico: string
  plan: string
  formulacion: string
  notas: string
}

const emptyEntry: EntryForm = {
  motivo_consulta: '',
  examen_fisico: '',
  diagnostico: '',
  plan: '',
  formulacion: '',
  notas: '',
}

function entryToForm(entry: ClinicalEntry): EntryForm {
  return {
    motivo_consulta: entry.motivo_consulta,
    examen_fisico: entry.examen_fisico ?? '',
    diagnostico: entry.diagnostico ?? '',
    plan: entry.plan ?? '',
    formulacion: entry.formulacion ?? '',
    notas: entry.notas ?? '',
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export interface ClinicalRecordsAccess {
  createPermission: string
  editPermission: string
  archivePermission?: string
  title: string
  entityName: string
  pluralEntityName: string
  readOnlyDescription: string
  createDescription: string
  filterToScheduledPatients?: boolean
  appointmentPatientAction?: boolean
  createInModal?: boolean
  // Ruta de la página que reemplaza los popups; recibe el id del paciente.
  statePath?: string
}

export function ClinicalRecordsPage({
  access,
  focusPatientId,
}: {
  access: ClinicalRecordsAccess
  focusPatientId?: number
}) {
  const navigate = useNavigate()
  const pageMode = focusPatientId !== undefined
  const asModal = Boolean(access.createInModal) && !pageMode
  const { user, role, hasPermission } = useAuth()
  const canCreate = role === 'doctor' && hasPermission(access.createPermission)
  const canEdit = role === 'doctor' && hasPermission(access.editPermission)
  const canWrite = canCreate || canEdit
  const canArchive = access.archivePermission !== undefined
    && role === 'admin'
    && hasPermission(access.archivePermission)
  const resource = useResource<ClinicalRecord[]>('/clinical-records/')
  const patients = useResource<PatientOption[]>('/patients/', canCreate)
  const appointments = useResource<DoctorAppointment[]>(
    '/appointments/',
    hasPermission('appointments.view')
      && (role === 'doctor' || access.filterToScheduledPatients === true),
  )
  const scheduledAppointments = {
    ...appointments,
    data: (appointments.data ?? []).filter((appointment) => SCHEDULED_STATES.includes(appointment.nom_estado)),
  }
  const scheduledPatientIds = new Set(
    scheduledAppointments.data.map((appointment) => appointment.id_patients),
  )
  const visibleResource = access.filterToScheduledPatients
    ? {
        ...resource,
        data: appointments.loading || appointments.error
          ? []
          : (resource.data ?? []).filter((record) => scheduledPatientIds.has(record.id_patients)),
        error: resource.error ?? appointments.error,
        loading: resource.loading || appointments.loading,
        reload: () => {
          resource.reload()
          appointments.reload()
        },
      }
    : resource
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const assignedPatientIds = new Set(
    (appointments.data ?? [])
      .filter((appointment) => !['CANCELADA', 'NO_ASISTIO'].includes(appointment.nom_estado))
      .map((appointment) => appointment.id_patients),
  )
  const assignedPatients = (patients.data ?? []).filter((patient) => assignedPatientIds.has(patient.id_patients))
  const patientOptionsLoading = patients.loading || appointments.loading
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [entryRecordId, setEntryRecordId] = useState<number | null>(null)
  const [correctionEntry, setCorrectionEntry] = useState<ClinicalEntry | null>(null)
  const [patientId, setPatientId] = useState('')
  const selectedPatient = assignedPatients.find((patient) => patient.id_patients === Number(patientId))
  const [entryForm, setEntryFormState] = useState<EntryForm>(emptyEntry)
  const [cupIds, setCupIds] = useState<number[]>([])
  const cups = useResource<CupOption[]>(
    '/clinical-records/cups',
    Boolean(access.createInModal) && canWrite,
  )
  const patientCups = useResource<PatientCup[]>(
    `/clinical-records/patients/${focusPatientId ?? 0}/cups`,
    pageMode,
  )
  const patientCupsCard = pageMode ? (
    <div className="panel patient-cups-card" aria-label="CUPS / Órdenes del paciente">
      <div className="user-form-header">
        <span className="eyebrow">CUPS / ÓRDENES</span>
        <h2>CUPS asignados al paciente</h2>
      </div>
      {patientCups.loading ? (
        <div className="notice" role="status">Consultando CUPS…</div>
      ) : patientCups.error ? (
        <div className="notice notice-error" role="alert">
          <span>No se pudieron consultar los CUPS: {patientCups.error}</span>
          <button type="button" className="text-button" onClick={patientCups.reload}>Reintentar</button>
        </div>
      ) : (patientCups.data ?? []).length === 0 ? (
        <p>El paciente no tiene CUPS / órdenes registrados.</p>
      ) : (
        <ul className="clinical-entry-list">
          {(patientCups.data ?? []).map((item) => (
            <li className="clinical-entry" key={item.id_cup_patient}>
              <strong>{item.codigo}</strong> · {item.nombre}
              {item.fec_creacion ? ` — ${formatDate(item.fec_creacion)}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null

  const headerPatient = selectedRecord?.patient ?? selectedPatient
  const headerDoctor = selectedRecord
    ? `${selectedRecord.doctor.nom_doctors} ${selectedRecord.doctor.ape_doctors}`
    : [user?.nombre, user?.apellido].filter(Boolean).join(' ') || '—'
  const patientHeaderCard = pageMode ? (
    <div className="panel consult-patient-card">
      {headerPatient ? (
        <>
          <span className="eyebrow">PACIENTE</span>
          <h1>{headerPatient.nom_patients} {headerPatient.ape_patients}</h1>
          <dl className="consult-patient-facts">
            <div><dt>Identificación</dt><dd>{headerPatient.ced_patients}</dd></div>
            <div><dt>Edad</dt><dd>{headerPatient.edad} {headerPatient.edad === 1 ? 'año' : 'años'}</dd></div>
            <div><dt>Género</dt><dd>{headerPatient.nom_sexo}</dd></div>
            <div><dt>Médico tratante</dt><dd>{headerDoctor}</dd></div>
          </dl>
        </>
      ) : (
        <div className="notice" role="status">Cargando información del paciente…</div>
      )}
    </div>
  ) : null
  // Cualquier reemplazo completo del formulario también reinicia los CUPS elegidos.
  function setEntryForm(value: EntryForm) {
    setEntryFormState(value)
    setCupIds([])
  }
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [statusAppointment, setStatusAppointment] = useState<DoctorAppointment | null>(null)
  const [newStatus, setNewStatus] = useState(WAITING_ROOM_STATE)
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const createPanelRef = useRef<HTMLDivElement>(null)
  const detailPanelRef = useRef<HTMLDivElement>(null)

  const modalOpen = asModal && createOpen && canCreate
  const allergyPatientId = pageMode
    ? focusPatientId ?? 0
    : access.createInModal
      ? (modalOpen ? Number(patientId) : selectedRecord?.id_patients ?? 0)
      : 0
  const allergies = useResource<AllergyInfo[]>(
    `/allergies/?patient_id=${allergyPatientId}`,
    allergyPatientId > 0,
  )
  const allergyBanner = (access.createInModal || pageMode) && allergyPatientId > 0 ? (
    allergies.loading ? (
      <div className="notice allergy-banner" role="status">Consultando alergias…</div>
    ) : allergies.error ? (
      <div className="notice notice-warning allergy-banner" role="alert">No se pudieron consultar las alergias del paciente.</div>
    ) : (() => {
      const active = (allergies.data ?? []).filter((item) => item.activo)
      return active.length ? (
        <div className="notice notice-error allergy-banner" role="alert">
          <strong>⚠ Paciente con alergias:</strong>
          <span>{[...new Set(active.map((item) => item.nom_tipo_alergia ?? 'Sin tipo'))].join(', ')}</span>
        </div>
      ) : (
        <div className="notice notice-success allergy-banner" role="status">Sin alergias registradas.</div>
      )
    })()
  ) : null

  const entryModalOpen = asModal && Boolean(selectedRecord)
  const statusModalOpen = statusAppointment !== null
  const anyModalOpen = modalOpen || entryModalOpen || statusModalOpen

  function openStatusModal(appointment: DoctorAppointment) {
    setStatusAppointment(appointment)
    setNewStatus(appointment.nom_estado)
    setStatusError(null)
    setNotice(null)
  }

  function closeStatusModal() {
    setStatusAppointment(null)
    setStatusError(null)
  }

  async function changeAppointmentStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!statusAppointment || statusAppointment.nom_estado !== WAITING_ROOM_STATE || newStatus !== ATTENDED_STATE) return
    setStatusSubmitting(true)
    setStatusError(null)
    try {
      await apiRequest(`/appointments/${statusAppointment.id_appointments}/finaliza`, { method: 'PUT' })
      setNotice(`La cita #${statusAppointment.id_appointments} quedó como ${ATTENDED_STATE}.`)
      closeStatusModal()
      appointments.reload()
    } catch (reason) {
      setStatusError(getErrorMessage(reason, 'No fue posible cambiar el estado de la cita.'))
    } finally {
      setStatusSubmitting(false)
    }
  }

  function closeDetail() {
    setSelectedRecord(null)
    resetEntryForm()
  }

  function closeCreate() {
    setCreateOpen(false)
    setPatientId('')
    setEntryForm(emptyEntry)
    setError(null)
  }

  const pageInitialized = useRef(false)
  const entryAutoOpened = useRef(false)
  // Abre el formulario de evolución una sola vez cuando la historia activa está lista y hay permiso.
  useEffect(() => {
    if (!pageMode || entryAutoOpened.current || !selectedRecord) return
    if (canCreate && selectedRecord.activo) {
      entryAutoOpened.current = true
      if (entryRecordId === null) startNewEntry(selectedRecord)
    }
  })
  useEffect(() => {
    if (!pageMode || !access.statePath) return
    if (!pageInitialized.current) {
      if (resource.loading || appointments.loading) return
      const existing = resource.data?.find((record) => record.id_patients === focusPatientId)
      const hasAppointment = assignedPatientIds.has(focusPatientId)
      if (existing) setSelectedRecord(existing)
      else if (canCreate && hasAppointment) {
        setPatientId(String(focusPatientId))
        setCreateOpen(true)
      } else {
        navigate('/doctor/consult', { replace: true })
        return
      }
      pageInitialized.current = true
      return
    }
    if (!createOpen && !selectedRecord) navigate('/doctor/consult', { replace: true })
  })

  useEffect(() => {
    if (!access.appointmentPatientAction || anyModalOpen) return
    const target = createOpen ? createPanelRef.current : selectedRecord ? detailPanelRef.current : null
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [access.appointmentPatientAction, createOpen, anyModalOpen, selectedRecord])

  useEffect(() => {
    if (!entryModalOpen || entryRecordId === null) return
    detailPanelRef.current?.parentElement?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [entryModalOpen, entryRecordId, correctionEntry])

  useEffect(() => {
    if (!anyModalOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || submitting || statusSubmitting) return
      if (statusModalOpen) closeStatusModal()
      else if (modalOpen) closeCreate()
      else if (entryRecordId !== null) resetEntryForm()
      else closeDetail()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [anyModalOpen, modalOpen, statusModalOpen, submitting, statusSubmitting, entryRecordId])

  function resetEntryForm() {
    setEntryRecordId(null)
    setCorrectionEntry(null)
    setEntryForm(emptyEntry)
    setError(null)
  }

  function updateEntry(field: keyof EntryForm, value: string) {
    setEntryFormState((current) => ({ ...current, [field]: value }))
    setError(null)
    setNotice(null)
  }

  function payloadFromEntry() {
    return {
      ...Object.fromEntries(
        Object.entries(entryForm).map(([key, value]) => [key, value.trim() || null]),
      ),
      id_cups: cupIds,
    }
  }

  function appointmentToFinalize(patientIdValue: number = Number(patientId)): DoctorAppointment | undefined {
    const id = patientIdValue
    const today = new Date().toDateString()
    return scheduledAppointments.data
      .filter((item) => item.id_patients === id)
      .sort((a, b) => {
        const aToday = new Date(a.fecha_hora).toDateString() === today ? 0 : 1
        const bToday = new Date(b.fecha_hora).toDateString() === today ? 0 : 1
        return aToday - bToday || new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
      })[0]
  }

  async function createHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!(Number(patientId) > 0)) {
      setError('Seleccione un paciente desde sus citas programadas.')
      return
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const finalize = submitter?.getAttribute('data-finalize') === 'true'
    const appointment = finalize ? appointmentToFinalize() : undefined
    if (finalize && !appointment) {
      setError('El paciente no tiene una cita programada para finalizar.')
      return
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)
    let created: ClinicalRecord
    try {
      created = await apiRequest<ClinicalRecord>('/clinical-records/', {
        method: 'POST',
        body: JSON.stringify({ id_patients: Number(patientId), ...payloadFromEntry() }),
      })
    } catch (reason) {
      setError(getErrorMessage(reason, `No fue posible crear ${access.entityName}.`))
      setSubmitting(false)
      return
    }
    try {
      if (appointment) {
        await apiRequest(`/appointments/${appointment.id_appointments}/finaliza`, { method: 'PUT' })
        setNotice(`${access.entityName} guardada y consulta finalizada; la cita quedó como ATENDIDA.`)
        setSelectedRecord(null)
        appointments.reload()
      } else {
        setNotice(`${access.entityName} y primera nota registradas correctamente.`)
        setSelectedRecord(created)
      }
      setPatientId('')
      setEntryForm(emptyEntry)
      setCreateOpen(false)
      resource.reload()
      patientCups.reload()
    } catch (reason) {
      setPatientId('')
      setEntryForm(emptyEntry)
      setCreateOpen(false)
      setSelectedRecord(created)
      resource.reload()
      setError(getErrorMessage(reason, 'La historia se guardó, pero no fue posible finalizar la consulta.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (entryRecordId === null) return
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const finalize = submitter?.getAttribute('data-finalize') === 'true'
    const appointment = finalize && selectedRecord ? appointmentToFinalize(selectedRecord.id_patients) : undefined
    if (finalize && !appointment) {
      setError('El paciente no tiene una cita programada para finalizar.')
      return
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)
    const endpoint = correctionEntry
      ? `/clinical-records/${entryRecordId}/entries/${correctionEntry.id_entries}`
      : `/clinical-records/${entryRecordId}/entries`
    try {
      const updated = await apiRequest<ClinicalRecord>(endpoint, {
        method: correctionEntry ? 'PUT' : 'POST',
        body: JSON.stringify(payloadFromEntry()),
      })
      setSelectedRecord(updated)
      setNotice(correctionEntry
        ? 'Rectificación guardada como una nueva nota; el registro original se conserva.'
        : 'Evolución agregada correctamente.')
      resetEntryForm()
      resource.reload()
      patientCups.reload()
    } catch (reason) {
      setError(getErrorMessage(reason, 'No fue posible guardar la nota clínica.'))
      setSubmitting(false)
      return
    }
    try {
      if (appointment) {
        await apiRequest(`/appointments/${appointment.id_appointments}/finaliza`, { method: 'PUT' })
        setNotice(`${access.entityName} guardada y consulta finalizada; la cita quedó como ATENDIDA.`)
        setSelectedRecord(null)
        appointments.reload()
      }
    } catch (reason) {
      setError(getErrorMessage(reason, 'La nota se guardó, pero no fue posible finalizar la consulta.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function archiveRecord(record: ClinicalRecord) {
    const confirmed = window.confirm(
      `¿Archivar la historia clínica de ${record.patient.nom_patients} ${record.patient.ape_patients}? Las notas se conservarán.`,
    )
    if (!confirmed) return
    setError(null)
    setNotice(null)
    try {
      await apiRequest(`/clinical-records/${record.id_clinic}`, { method: 'DELETE' })
      if (selectedRecord?.id_clinic === record.id_clinic) setSelectedRecord(null)
      setNotice('Historia archivada. Su contenido clínico se conserva íntegro.')
      resource.reload()
    } catch (reason) {
      setError(getErrorMessage(reason, 'No fue posible archivar la historia clínica.'))
    }
  }

  async function restoreRecord(record: ClinicalRecord) {
    setError(null)
    setNotice(null)
    try {
      await apiRequest(`/clinical-records/${record.id_clinic}/restore`, { method: 'PUT' })
      setNotice('Historia restaurada. Se conservan todas sus notas clínicas.')
      resource.reload()
    } catch (reason) {
      setError(getErrorMessage(reason, 'No fue posible restaurar la historia clínica.'))
    }
  }

  function startCorrection(record: ClinicalRecord, entry: ClinicalEntry) {
    setSelectedRecord(record)
    setEntryRecordId(record.id_clinic)
    setCorrectionEntry(entry)
    setEntryForm(entryToForm(entry))
    setError(null)
    setNotice(null)
  }

  function startNewEntry(record: ClinicalRecord) {
    setSelectedRecord(record)
    setEntryRecordId(record.id_clinic)
    setCorrectionEntry(null)
    setEntryForm(record.entries[0] ? entryToForm(record.entries[0]) : emptyEntry)
    setError(null)
    setNotice(null)
  }

  function openAppointmentPatient(patientId: number) {
    if (!Number.isInteger(patientId) || patientId <= 0) return
    if (access.statePath) {
      navigate(`${access.statePath}/${patientId}`)
      return
    }
    const existingRecord = resource.data?.find((record) => record.id_patients === patientId)
    setError(null)
    setNotice(null)
    if (existingRecord) {
      setSelectedRecord(existingRecord)
      setCreateOpen(false)
      resetEntryForm()
      return
    }
    setSelectedRecord(null)
    setEntryRecordId(null)
    setCorrectionEntry(null)
    setPatientId(String(patientId))
    setEntryForm(emptyEntry)
    setCreateOpen(true)
  }

  function cupSelector(prefix: string): ReactNode {
    if (!access.createInModal) return null
    const selectedCups = (cups.data ?? []).filter((cup) => cupIds.includes(cup.id_cup))
    return (
      <div className="field clinical-field-wide">
        <label htmlFor={`${prefix}-cups`}>CUPS / Órdenes</label>
        <div className="cup-picker">
          <select
            id={`${prefix}-cups`}
            multiple
            size={6}
            value={cupIds.map(String)}
            disabled={cups.loading || Boolean(cups.error)}
            onChange={(event) => {
              setCupIds(Array.from(event.target.selectedOptions, (option) => Number(option.value)))
              setError(null)
            }}
          >
            {(cups.data ?? []).map((cup) => (
              <option key={cup.id_cup} value={cup.id_cup}>{cup.codigo} · {cup.nombre}</option>
            ))}
          </select>
          <div className="cup-selected" aria-live="polite">
            <div className="cup-selected-header">
              <strong>Órdenes seleccionadas ({selectedCups.length})</strong>
              {selectedCups.length > 0 && (
                <button type="button" className="text-button" onClick={() => setCupIds([])}>Limpiar</button>
              )}
            </div>
            {selectedCups.length === 0 ? (
              <span className="cup-selected-empty">Aún no has seleccionado órdenes.</span>
            ) : (
              <ul>
                {selectedCups.map((cup) => (
                  <li key={cup.id_cup}>
                    <span><b>{cup.codigo}</b> · {cup.nombre}</span>
                    <button
                      type="button"
                      className="cup-remove"
                      aria-label={`Quitar ${cup.codigo}`}
                      onClick={() => setCupIds((current) => current.filter((id) => id !== cup.id_cup))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <small>
          {cups.error
            ? `No se pudieron cargar los CUPS: ${cups.error}`
            : 'Mantén Ctrl (o Cmd) para seleccionar varios CUPS.'}
        </small>
      </div>
    )
  }

  const entryFormOpen = Boolean(selectedRecord) && entryRecordId !== null && (correctionEntry ? canEdit : canCreate)
  const entryFormNode = (
    <form className="user-form clinical-edit-form" onSubmit={saveEntry}>
      <div className="user-form-header">
        <span className="eyebrow">{correctionEntry ? `RECTIFICACIÓN DE NOTA #${correctionEntry.id_entries}` : 'NUEVA EVOLUCIÓN'}</span>
        <h2>{correctionEntry ? 'Registrar una rectificación' : 'Agregar atención'}</h2>
        <p>Los registros clínicos son inmutables. Al editar, el sistema conserva la nota original y guarda esta como una nueva rectificación.</p>
      </div>
      {entryFields(entryForm, updateEntry, 'edit', cupSelector('edit'))}
      <div className="user-form-actions">
        <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Guardando…' : correctionEntry ? 'Guardar rectificación' : 'Agregar evolución'}</button>
        {access.createInModal && !correctionEntry && selectedRecord && (
          <button className="button button-primary" type="submit" data-finalize="true" disabled={submitting || !appointmentToFinalize(selectedRecord.id_patients)}>
            Finalizar consulta
          </button>
        )}
        <button className="button button-secondary" type="button" onClick={resetEntryForm}>Cancelar</button>
      </div>
    </form>
  )

  const selectedPatientName = selectedRecord
    ? `${selectedRecord.patient.nom_patients} ${selectedRecord.patient.ape_patients}`
    : ''

    
  return (
    <section className={pageMode ? 'consult-state' : undefined}>
      {pageMode && (
        <button className="button button-secondary" type="button" onClick={() => navigate('/doctor/consult')}>
          ← Volver a consultas
        </button>
      )}
      {patientHeaderCard}
      {pageMode && allergyBanner}
      {pageMode && patientCupsCard}
      {!pageMode && role === 'doctor' && access.appointmentPatientAction && (
        <ResourceTable
          title="Mis citas programadas"
          description="Citas asignadas a tu agenda, ordenadas por fecha."
          resource={scheduledAppointments}
          columns={[
            { key: 'id_appointments', label: 'Cita', render: (value, row) => (
              <button
                className="text-button"
                type="button"
                aria-haspopup="dialog"
                aria-label={`Cambiar estado de la cita ${String(value)}`}
                onClick={() => openStatusModal(row as unknown as DoctorAppointment)}
              >
                {String(value)}
              </button>
            ) },
            { key: 'paciente', label: 'Paciente', render: (value, row) => (
              <button
                className="text-button"
                type="button"
                onClick={() => openAppointmentPatient(Number(row.id_patients))}
                disabled={
                  resource.loading
                  || Boolean(resource.error)
                  || appointments.loading
                  || !Number.isInteger(Number(row.id_patients))
                  || Number(row.id_patients) <= 0
                  || (!resource.data?.some((record) => record.id_patients === Number(row.id_patients)) && !canCreate)
                }
                aria-label={`${resource.data?.some((record) => record.id_patients === Number(row.id_patients)) ? 'Ver historia clínica de' : 'Crear historia clínica para'} ${String(value ?? 'paciente')}`}
              >
                {String(value ?? '—')}
              </button>
            ) },
            { key: 'fecha_hora', label: 'Fecha y hora', render: (value) => value ? formatDate(String(value)) : '—' },
            { key: 'nom_estado', label: 'Estado' },
            { key: 'fec_ingreso', label: 'Fecha de ingreso', render: (value) => value ? formatDate(String(value)) : '—' },
            { key: 'fec_dilatacion', label: 'Hora de dilatación', render: (value, row) => {
              if (!value) return '—'
              const overdue = row.nom_estado === 'EN SALA DE ESPERA'
                && now - new Date(String(value)).getTime() > DILATION_ALERT_MS
              const text = formatDate(String(value))
              return overdue ? <span className="priority-badge priority-high">{text}</span> : text
            } },
            { key: 'prioridad', label: 'Prioridad', render: (value) => value === true
              ? <span className="priority-badge priority-high">Prioritaria</span>
              : value === false ? 'Normal' : '—' },
            { key: 'discapacidad', label: 'Discapacidad', render: (value) => value === true
              ? <span className="priority-badge priority-high">Sí</span>
              : 'No' },
          ]}
          pageSize={5}
          emptyMessage="No tienes citas programadas."
        />
      )}
      {!pageMode && <ResourceTable
        title={access.title}
        description={canWrite
          ? `Consulta las ${access.pluralEntityName} de tus pacientes, registra atenciones y rectifica notas mediante una nueva entrada.`
          : access.readOnlyDescription}
        resource={visibleResource}
        columns={[
          { key: 'id_clinic', label: 'Historia' },
          { key: 'patient', label: 'Paciente', render: (value, row) => {
            const patient = value as PatientOption | undefined
            if (!patient) return '—'
            const name = `${patient.nom_patients} ${patient.ape_patients}`
            if (!access.createInModal) return name
            return (
              <button
                className="text-button"
                type="button"
                aria-haspopup="dialog"
                aria-label={`Ver historia clínica de ${name}`}
                onClick={() => {
                  if (access.statePath) {
                    navigate(`${access.statePath}/${(row as unknown as ClinicalRecord).id_patients}`)
                    return
                  }
                  setSelectedRecord(row as unknown as ClinicalRecord)
                  resetEntryForm()
                }}
              >
                {name}
              </button>
            )
          } },
          { key: 'patient', label: 'Identificación', render: (value) => (value as PatientOption | undefined)?.ced_patients ?? '—' },
          { key: 'doctor', label: 'Médico tratante', render: (value) => {
            const doctor = value as ClinicalRecord['doctor'] | undefined
            return doctor ? `${doctor.nom_doctors} ${doctor.ape_doctors}` : '—'
          } },
          { key: 'fec_creacion', label: 'Apertura', render: (value) => value ? formatDate(String(value)) : '—' },
          { key: 'activo', label: 'Estado', render: (value) => value === true ? 'Activa' : 'Archivada' },
          { key: 'total_entradas', label: 'Notas', render: (value) => Number(value ?? 0) },
        ]}
        pageSize={5}
        emptyMessage={access.filterToScheduledPatients
          ? 'No hay historias clínicas de pacientes con citas programadas.'
          : `No hay ${access.pluralEntityName} disponibles.`}
        headerAction={canCreate && !access.createInModal ? (
          <button className="button button-primary" type="button" onClick={() => {
            setCreateOpen((open) => !open)
            setError(null)
            setNotice(null)
          }}>
            {createOpen ? 'Cancelar' : `Nueva ${access.entityName}`}
          </button>
        ) : undefined}
        actions={(row) => {
          const record = row as unknown as ClinicalRecord
          return (
            <div className="table-actions">
              <button type="button" className="action-button action-button-edit" onClick={() => {
                setSelectedRecord(record)
                resetEntryForm()
              }}>
                {canEdit ? 'Ver / editar' : 'Ver'}
              </button>
              {canArchive && record.activo && (
                <button type="button" className="action-button action-button-delete" onClick={() => void archiveRecord(record)}>
                  Archivar
                </button>
              )}
              {canArchive && !record.activo && (
                <button type="button" className="action-button action-button-toggle" onClick={() => void restoreRecord(record)}>
                  Restaurar
                </button>
              )}
            </div>
          )
        }}
      />}

      {error && !anyModalOpen && !pageMode && <div className="notice notice-error clinical-feedback" role="alert"><strong>Error.</strong><span>{error}</span></div>}
      {notice && <div className="notice notice-success clinical-feedback" role="status">{notice}</div>}

      {createOpen && canCreate && (
        <div
          className={asModal ? 'modal-backdrop' : undefined}
          onMouseDown={asModal ? (event) => { if (event.target === event.currentTarget) closeCreate() } : undefined}
        >
        <div
          className={`panel user-form-panel clinical-form-panel${asModal ? ' modal-dialog' : ''}`}
          ref={createPanelRef}
          role={asModal ? 'dialog' : undefined}
          aria-modal={asModal ? true : undefined}
          aria-label={asModal ? `Nueva ${access.entityName}` : undefined}
        >
          {!pageMode && allergyBanner}
          {!pageMode && patientCupsCard}
          <div className="user-form-header clinical-create-heading">
            <div>
              <span className="eyebrow">NUEVA {access.entityName.toLocaleUpperCase('es-CO')}</span>
              <h2>Registrar {access.entityName} y primera atención</h2>
              <p>{access.createDescription}</p>
              {selectedPatient && !pageMode && (
                <p className="clinical-patient-summary">
                  Paciente: {selectedPatient.nom_patients} {selectedPatient.ape_patients}
                  {' · '}Identificación: {selectedPatient.ced_patients}
                  {' · '}Edad: {selectedPatient.edad} {selectedPatient.edad === 1 ? 'año' : 'años'}
                  {' · '}Género: {selectedPatient.nom_sexo}
                </p>
              )}
            </div>
          </div>
          {patients.error && <div className="notice notice-error" role="alert"><span>No se pudieron cargar los pacientes: {patients.error}</span><button type="button" className="text-button" onClick={patients.reload}>Reintentar</button></div>}
          {error && access.createInModal && <div className="notice notice-error" role="alert"><strong>Error.</strong><span>{error}</span></div>}
          <form className="user-form" onSubmit={createHistory}>
            {!access.createInModal && (
              <div className="field">
                <label htmlFor="history-patient">Paciente</label>
                <select id="history-patient" value={patientId} onChange={(event) => setPatientId(event.target.value)} required disabled={patientOptionsLoading || Boolean(patients.error) || !assignedPatients.length}>
                  <option value="">{assignedPatients.length || patientOptionsLoading ? 'Seleccione un paciente' : 'No tienes pacientes con cita asignada'}</option>
                  {assignedPatients.map((patient) => (
                    <option key={patient.id_patients} value={patient.id_patients}>
                      {patient.ced_patients} · {patient.nom_patients} {patient.ape_patients}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {entryFields(entryForm, updateEntry, 'initial', cupSelector('initial'))}
            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={submitting || patientOptionsLoading || Boolean(patients.error) || !selectedPatient}>{submitting ? 'Guardando…' : `Crear ${access.entityName}`}</button>
              {access.createInModal && (
                <button className="button button-primary" type="submit" data-finalize="true" disabled={submitting || patientOptionsLoading || Boolean(patients.error) || !selectedPatient || !appointmentToFinalize()}>
                  Finalizar consulta
                </button>
              )}
              <button className="button button-secondary" type="button" onClick={closeCreate}>Cancelar</button>
            </div>
          </form>
        </div>
        </div>
      )}

      {statusAppointment && (
        <div className="modal-backdrop status-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !statusSubmitting) closeStatusModal() }}>
          <div className="panel user-form-panel modal-dialog status-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="appointment-status-title">
            <div className="user-form-header">
              <span className="eyebrow">ESTADO DE LA CITA</span>
              <h2 id="appointment-status-title">Cita #{statusAppointment.id_appointments} — {statusAppointment.paciente ?? 'Paciente'}</h2>
              <p>Fecha y hora: {formatDate(statusAppointment.fecha_hora)}</p>
            </div>
            {statusError && <div className="notice notice-error" role="alert"><strong>Error.</strong><span>{statusError}</span></div>}
            {statusAppointment.nom_estado !== WAITING_ROOM_STATE && (
              <div className="notice notice-warning" role="note">
                <span>Solo se puede cambiar a {ATTENDED_STATE} una cita que está {WAITING_ROOM_STATE.toLocaleLowerCase('es-CO')}. Estado actual: {statusAppointment.nom_estado}.</span>
              </div>
            )}
            <form className="user-form" onSubmit={changeAppointmentStatus}>
              <div className="field">
                <label htmlFor="appointment-new-status">Estado</label>
                <select
                  id="appointment-new-status"
                  value={newStatus}
                  onChange={(event) => setNewStatus(event.target.value)}
                  disabled={statusSubmitting || statusAppointment.nom_estado !== WAITING_ROOM_STATE}
                >
                  <option value={statusAppointment.nom_estado}>{statusAppointment.nom_estado}</option>
                  {statusAppointment.nom_estado === WAITING_ROOM_STATE && <option value={ATTENDED_STATE}>{ATTENDED_STATE}</option>}
                </select>
              </div>
              <div className="user-form-actions">
                <button className="button button-secondary" type="button" onClick={closeStatusModal} disabled={statusSubmitting}>Cancelar</button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={statusSubmitting || statusAppointment.nom_estado !== WAITING_ROOM_STATE || newStatus !== ATTENDED_STATE}
                >
                  {statusSubmitting ? 'Guardando…' : 'Guardar estado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div
          className={asModal ? 'modal-backdrop' : undefined}
          onMouseDown={asModal ? (event) => { if (event.target === event.currentTarget && !submitting) closeDetail() } : undefined}
        >
        <div
          className={`panel user-form-panel clinical-detail-panel${asModal ? ' modal-dialog' : ''}`}
          ref={detailPanelRef}
          role={asModal ? 'dialog' : undefined}
          aria-modal={asModal ? true : undefined}
          aria-label={asModal ? `${access.entityName} de ${selectedPatientName}` : undefined}
        >
          {!pageMode && allergyBanner}
          {!pageMode && patientCupsCard}
          {error && access.createInModal && <div className="notice notice-error" role="alert"><strong>Error.</strong><span>{error}</span></div>}
          <div className="user-form-header clinical-detail-heading">
            <div>
              <span className="eyebrow">{access.entityName.toLocaleUpperCase('es-CO')} #{selectedRecord.id_clinic}</span>
              <h2>{pageMode ? 'Historia clínica' : selectedPatientName}</h2>
              {!pageMode && (
              <p>
                Identificación {selectedRecord.patient.ced_patients}
                {' · '}Edad: {selectedRecord.patient.edad} {selectedRecord.patient.edad === 1 ? 'año' : 'años'}
                {' · '}Género: {selectedRecord.patient.nom_sexo}
                {' · '}Tratante: {selectedRecord.doctor.nom_doctors} {selectedRecord.doctor.ape_doctors}
              </p>
              )}
            </div>
            {!pageMode && <button className="button button-secondary" type="button" onClick={closeDetail}>Cerrar</button>}
          </div>

          {canCreate && selectedRecord.activo && entryRecordId === null && (
            <div className="user-form-actions clinical-entry-actions">
              <button className="button button-primary" type="button" onClick={() => startNewEntry(selectedRecord)}>Nueva evolución</button>
            </div>
          )}

          {canWrite && selectedRecord.entries.length === 0 && (
            <div className="notice notice-warning">No se recibieron notas para esta historia. Solo las cuentas médicas vinculadas pueden consultar el contenido clínico.</div>
          )}

          {entryFormOpen && access.createInModal && entryFormNode}

          <div className="clinical-entry-list">
            {selectedRecord.entries.map((entry) => (
              <article className="clinical-entry" key={entry.id_entries}>
                <div className="clinical-entry-heading">
                  <div><strong>{entry.motivo_consulta}</strong><span>{formatDate(entry.fec_entrada)} · {entry.medico}</span></div>
                  {entry.id_entries_rectifica && <span className="clinical-correction-pill">Rectifica nota #{entry.id_entries_rectifica}</span>}
                  {canEdit && selectedRecord.activo && (
                    <button type="button" className="action-button action-button-edit" onClick={() => startCorrection(selectedRecord, entry)}>Editar / rectificar</button>
                  )}
                </div>
                <dl className="clinical-entry-fields">
                  {entry.examen_fisico && <div><dt>Examen físico</dt><dd>{entry.examen_fisico}</dd></div>}
                  {entry.diagnostico && <div><dt>Diagnóstico</dt><dd>{entry.diagnostico}</dd></div>}
                  {entry.plan && <div><dt>Plan</dt><dd>{entry.plan}</dd></div>}
                  {entry.formulacion && <div><dt>Formulación</dt><dd>{entry.formulacion}</dd></div>}
                  {entry.notas && <div><dt>Notas</dt><dd>{entry.notas}</dd></div>}
                </dl>
              </article>
            ))}
          </div>

          {entryFormOpen && !access.createInModal && entryFormNode}
        </div>
        </div>
      )}
    </section>
  )
}

function entryFields(
  form: EntryForm,
  update: (field: keyof EntryForm, value: string) => void,
  prefix: string,
  extra?: ReactNode,
) {
  return (
    <div className="clinical-form-grid">
      <div className="field clinical-field-wide">
        <label htmlFor={`${prefix}-motivo`}>Motivo de consulta</label>
        <textarea id={`${prefix}-motivo`} value={form.motivo_consulta} onChange={(event) => update('motivo_consulta', event.target.value)} maxLength={10000} required rows={3} />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-exam`}>Examen físico</label>
        <textarea id={`${prefix}-exam`} value={form.examen_fisico} onChange={(event) => update('examen_fisico', event.target.value)} maxLength={20000} rows={3} />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-diagnosis`}>Diagnóstico</label>
        <textarea id={`${prefix}-diagnosis`} value={form.diagnostico} onChange={(event) => update('diagnostico', event.target.value)} maxLength={20000} rows={3} />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-plan`}>Plan</label>
        <textarea id={`${prefix}-plan`} value={form.plan} onChange={(event) => update('plan', event.target.value)} maxLength={20000} rows={3} />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-formulation`}>Formulación</label>
        <textarea id={`${prefix}-formulation`} value={form.formulacion} onChange={(event) => update('formulacion', event.target.value)} maxLength={20000} rows={3} />
      </div>
      <div className="field clinical-field-wide">
        <label htmlFor={`${prefix}-notes`}>Notas adicionales</label>
      </div>
      {extra}
    </div>
  )
}

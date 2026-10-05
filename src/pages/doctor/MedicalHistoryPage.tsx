import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

interface PatientOption {
  id_patients: number
  ced_patients: string
  nom_patients: string
  ape_patients: string
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

export function MedicalHistoryPage() {
  const { role, hasPermission } = useAuth()
  const canWrite = role === 'doctor' && hasPermission('medical_history.manage')
  const canArchive = role === 'admin' && hasPermission('medical_history.delete')
  const resource = useResource<ClinicalRecord[]>('/clinical-records/')
  const patients = useResource<PatientOption[]>('/patients/', canWrite)
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [entryRecordId, setEntryRecordId] = useState<number | null>(null)
  const [correctionEntry, setCorrectionEntry] = useState<ClinicalEntry | null>(null)
  const [patientId, setPatientId] = useState('')
  const [entryForm, setEntryForm] = useState<EntryForm>(emptyEntry)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function resetEntryForm() {
    setEntryRecordId(null)
    setCorrectionEntry(null)
    setEntryForm(emptyEntry)
    setError(null)
  }

  function updateEntry(field: keyof EntryForm, value: string) {
    setEntryForm((current) => ({ ...current, [field]: value }))
    setError(null)
    setNotice(null)
  }

  function payloadFromEntry() {
    return Object.fromEntries(
      Object.entries(entryForm).map(([key, value]) => [key, value.trim() || null]),
    )
  }

  async function createHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      const created = await apiRequest<ClinicalRecord>('/clinical-records/', {
        method: 'POST',
        body: JSON.stringify({ id_patients: Number(patientId), ...payloadFromEntry() }),
      })
      setNotice('Historia clínica y primera nota registradas correctamente.')
      setSelectedRecord(created)
      setPatientId('')
      setEntryForm(emptyEntry)
      setCreateOpen(false)
      resource.reload()
    } catch (reason) {
      setError(getErrorMessage(reason, 'No fue posible crear la historia clínica.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (entryRecordId === null) return
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
    } catch (reason) {
      setError(getErrorMessage(reason, 'No fue posible guardar la nota clínica.'))
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
    setEntryForm(emptyEntry)
    setError(null)
    setNotice(null)
  }

  const selectedPatientName = selectedRecord
    ? `${selectedRecord.patient.nom_patients} ${selectedRecord.patient.ape_patients}`
    : ''

  return (
    <section>
      <ResourceTable
        title="Historias clínicas"
        description={canWrite
          ? 'Consulta las historias de tus pacientes, registra atenciones y rectifica notas mediante una nueva entrada.'
          : 'Consulta el estado de las historias clínicas. El archivo conserva todas sus notas.'}
        resource={resource}
        columns={[
          { key: 'id_clinic', label: 'Historia' },
          { key: 'patient', label: 'Paciente', render: (value) => {
            const patient = value as PatientOption | undefined
            return patient ? `${patient.nom_patients} ${patient.ape_patients}` : '—'
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
        emptyMessage="No hay historias clínicas disponibles."
        headerAction={canWrite ? (
          <button className="button button-primary" type="button" onClick={() => {
            setCreateOpen((open) => !open)
            setError(null)
            setNotice(null)
          }}>
            {createOpen ? 'Cancelar' : 'Nueva historia clínica'}
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
                {canWrite ? 'Ver / editar' : 'Ver'}
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
      />

      {error && <div className="notice notice-error clinical-feedback" role="alert"><strong>Error.</strong><span>{error}</span></div>}
      {notice && <div className="notice notice-success clinical-feedback" role="status">{notice}</div>}

      {createOpen && canWrite && (
        <div className="panel user-form-panel clinical-form-panel">
          <div className="user-form-header">
            <span className="eyebrow">NUEVA HISTORIA</span>
            <h2>Registrar historia y primera atención</h2>
            <p>El médico tratante se toma de la cuenta autenticada; una historia por paciente.</p>
          </div>
          {patients.error && <div className="notice notice-error" role="alert"><span>No se pudieron cargar los pacientes: {patients.error}</span><button type="button" className="text-button" onClick={patients.reload}>Reintentar</button></div>}
          <form className="user-form" onSubmit={createHistory}>
            <div className="field">
              <label htmlFor="history-patient">Paciente</label>
              <select id="history-patient" value={patientId} onChange={(event) => setPatientId(event.target.value)} required disabled={patients.loading || Boolean(patients.error) || !patients.data?.length}>
                <option value="">Seleccione un paciente</option>
                {patients.data?.map((patient) => (
                  <option key={patient.id_patients} value={patient.id_patients}>
                    {patient.ced_patients} · {patient.nom_patients} {patient.ape_patients}
                  </option>
                ))}
              </select>
            </div>
            {entryFields(entryForm, updateEntry, 'initial')}
            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={submitting || patients.loading || Boolean(patients.error) || !patients.data?.length}>{submitting ? 'Guardando…' : 'Crear historia'}</button>
              <button className="button button-secondary" type="button" onClick={() => { setCreateOpen(false); setEntryForm(emptyEntry); setError(null) }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {selectedRecord && (
        <div className="panel user-form-panel clinical-detail-panel">
          <div className="user-form-header clinical-detail-heading">
            <div>
              <span className="eyebrow">HISTORIA #{selectedRecord.id_clinic}</span>
              <h2>{selectedPatientName}</h2>
              <p>Identificación {selectedRecord.patient.ced_patients} · Tratante: {selectedRecord.doctor.nom_doctors} {selectedRecord.doctor.ape_doctors}</p>
            </div>
            <button className="button button-secondary" type="button" onClick={() => { setSelectedRecord(null); resetEntryForm() }}>Cerrar</button>
          </div>

          {canWrite && selectedRecord.activo && entryRecordId === null && (
            <div className="user-form-actions clinical-entry-actions">
              <button className="button button-primary" type="button" onClick={() => startNewEntry(selectedRecord)}>Nueva evolución</button>
            </div>
          )}

          {canWrite && selectedRecord.entries.length === 0 && (
            <div className="notice notice-warning">No se recibieron notas para esta historia. Solo las cuentas médicas vinculadas pueden consultar el contenido clínico.</div>
          )}

          <div className="clinical-entry-list">
            {selectedRecord.entries.map((entry) => (
              <article className="clinical-entry" key={entry.id_entries}>
                <div className="clinical-entry-heading">
                  <div><strong>{entry.motivo_consulta}</strong><span>{formatDate(entry.fec_entrada)} · {entry.medico}</span></div>
                  {entry.id_entries_rectifica && <span className="clinical-correction-pill">Rectifica nota #{entry.id_entries_rectifica}</span>}
                  {canWrite && selectedRecord.activo && (
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

          {canWrite && entryRecordId !== null && (
            <form className="user-form clinical-edit-form" onSubmit={saveEntry}>
              <div className="user-form-header">
                <span className="eyebrow">{correctionEntry ? `RECTIFICACIÓN DE NOTA #${correctionEntry.id_entries}` : 'NUEVA EVOLUCIÓN'}</span>
                <h2>{correctionEntry ? 'Registrar una rectificación' : 'Agregar atención'}</h2>
                <p>Los registros clínicos son inmutables. Al editar, el sistema conserva la nota original y guarda esta como una nueva rectificación.</p>
              </div>
              {entryFields(entryForm, updateEntry, 'edit')}
              <div className="user-form-actions">
                <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Guardando…' : correctionEntry ? 'Guardar rectificación' : 'Agregar evolución'}</button>
                <button className="button button-secondary" type="button" onClick={resetEntryForm}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  )
}

function entryFields(form: EntryForm, update: (field: keyof EntryForm, value: string) => void, prefix: string) {
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
        <textarea id={`${prefix}-notes`} value={form.notas} onChange={(event) => update('notas', event.target.value)} maxLength={20000} rows={3} />
      </div>
    </div>
  )
}

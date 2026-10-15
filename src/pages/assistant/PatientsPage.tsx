import { useRef, useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

interface PatientRecord {
  id_patients?: number
  ced_patients?: string
  id_documents?: number
  document?: DocumentRecord
  nom_patients?: string
  ape_patients?: string
  fec_nacimiento?: string
  edad?: number
  id_sexo?: number
  nom_sexo?: string
  activo?: boolean | 0 | 1
  telefono?: string
  email?: string
  direccion?: string
  eps?: string
  contacto_emergencia?: string
}

interface EditablePatientRecord extends PatientRecord {
  id_patients: number
}

interface PatientCSVPreviewRow {
  row_number: number
  patient: PatientRecord
}

interface PatientCSVRowError {
  row_number: number
  messages: string[]
}

interface PatientCSVPreview {
  total_rows: number
  valid_rows: number
  invalid_rows: number
  can_import: boolean
  preview_rows: PatientCSVPreviewRow[]
  errors: PatientCSVRowError[]
}

interface PatientCSVImportResult {
  imported_rows: number
}

interface SexoRecord {
  id_sexo: number
  nom_sexo: string
}

interface DocumentRecord {
  id_documents: number
  desc_tipo: string
  desc_documents: string
}

interface PatientFormState {
  ced_patients: string
  id_documents: string
  nom_patients: string
  ape_patients: string
  fec_nacimiento: string
  id_sexo: string
  telefono: string
  email: string
  direccion: string
  eps: string
  contacto_emergencia: string
}

const initialForm: PatientFormState = {
  ced_patients: '',
  id_documents: '',
  nom_patients: '',
  ape_patients: '',
  fec_nacimiento: '',
  id_sexo: '',
  telefono: '',
  email: '',
  direccion: '',
  eps: '',
  contacto_emergencia: '',
}

const patientCSVTemplate = 'tipo_documento,cedula,nombres,apellidos,fecha_nacimiento,sexo,telefono,email,direccion,eps,contacto_emergencia'

function editablePatientFromRow(row: Record<string, unknown>): EditablePatientRecord | null {
  if (
    typeof row.id_patients !== 'number' ||
    !Number.isInteger(row.id_patients) ||
    typeof row.ced_patients !== 'string' ||
    typeof row.id_documents !== 'number' ||
    typeof row.nom_patients !== 'string' ||
    typeof row.ape_patients !== 'string' ||
    typeof row.fec_nacimiento !== 'string' ||
    typeof row.id_sexo !== 'number'
  ) return null

  return {
    id_patients: row.id_patients,
    ced_patients: row.ced_patients,
    id_documents: row.id_documents,
    nom_patients: row.nom_patients,
    ape_patients: row.ape_patients,
    fec_nacimiento: row.fec_nacimiento,
    id_sexo: row.id_sexo,
    telefono: typeof row.telefono === 'string' ? row.telefono : '',
    email: typeof row.email === 'string' ? row.email : '',
    direccion: typeof row.direccion === 'string' ? row.direccion : '',
    eps: typeof row.eps === 'string' ? row.eps : '',
    contacto_emergencia: typeof row.contacto_emergencia === 'string' ? row.contacto_emergencia : '',
  }
}

export function PatientsPage() {
  const { hasPermission } = useAuth()
  const canManagePatients = hasPermission('patients.manage')
  const resource = useResource<PatientRecord[] | { items?: PatientRecord[] }>('/patients/')
  const sexos = useResource<SexoRecord[]>('/sexos/', canManagePatients)
  const documents = useResource<DocumentRecord[]>('/documents/', canManagePatients)
  const [form, setForm] = useState<PatientFormState>(initialForm)
  const [editingPatient, setEditingPatient] = useState<EditablePatientRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<PatientCSVPreview | null>(null)
  const [csvSubmitting, setCsvSubmitting] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const csvInputRef = useRef<HTMLInputElement | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function updateField(field: keyof PatientFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setSubmitError(null)
    setSuccessMessage(null)
  }

  function closeForm() {
    setForm(initialForm)
    setEditingPatient(null)
    setSubmitError(null)
    setFormOpen(false)
  }

  function startEditingPatient(patient: EditablePatientRecord) {
    setForm({
      ced_patients: patient.ced_patients ?? '',
      id_documents: String(patient.id_documents ?? ''),
      nom_patients: patient.nom_patients ?? '',
      ape_patients: patient.ape_patients ?? '',
      fec_nacimiento: patient.fec_nacimiento ?? '',
      id_sexo: String(patient.id_sexo ?? ''),
      telefono: patient.telefono ?? '',
      email: patient.email ?? '',
      direccion: patient.direccion ?? '',
      eps: patient.eps ?? '',
      contacto_emergencia: patient.contacto_emergencia ?? '',
    })
    setEditingPatient(patient)
    setFormOpen(true)
    closeCSVImport()
    setSubmitError(null)
    setSuccessMessage(null)
  }

  function downloadCSVTemplate() {
    const blob = new Blob([`\uFEFF${patientCSVTemplate}\r\n`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla_pacientes.csv'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function closeCSVImport() {
    setCsvImportOpen(false)
    setCsvFile(null)
    setCsvPreview(null)
    setCsvError(null)
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  async function previewCSVImport() {
    if (!csvFile) {
      setCsvError('Seleccione un archivo CSV antes de validarlo.')
      return
    }
    setCsvSubmitting(true)
    setCsvError(null)
    setCsvPreview(null)
    const body = new FormData()
    body.append('file', csvFile)
    try {
      const result = await apiRequest<PatientCSVPreview>('/patients/import/preview', {
        method: 'POST',
        body,
      })
      setCsvPreview(result)
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'No fue posible validar el archivo CSV.')
    } finally {
      setCsvSubmitting(false)
    }
  }

  async function importCSVPatients() {
    if (!csvFile || !csvPreview?.can_import) return
    setCsvSubmitting(true)
    setCsvError(null)
    const body = new FormData()
    body.append('file', csvFile)
    try {
      const result = await apiRequest<PatientCSVImportResult>('/patients/import', {
        method: 'POST',
        body,
      })
      setSuccessMessage(`${result.imported_rows} pacientes importados correctamente.`)
      closeCSVImport()
      resource.reload()
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'No fue posible importar los pacientes.')
      setCsvPreview(null)
    } finally {
      setCsvSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setSuccessMessage(null)

    const payload = {
      ced_patients: form.ced_patients.trim(),
      id_documents: Number(form.id_documents),
      nom_patients: form.nom_patients.trim(),
      ape_patients: form.ape_patients.trim(),
      fec_nacimiento: form.fec_nacimiento,
      id_sexo: Number(form.id_sexo),
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      direccion: form.direccion.trim() || null,
      eps: form.eps.trim() || null,
      contacto_emergencia: form.contacto_emergencia.trim() || null,
    }

    try {
      await apiRequest<PatientRecord>(editingPatient ? `/patients/${editingPatient.id_patients}` : '/patients/', {
        method: editingPatient ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setSuccessMessage(editingPatient ? 'Paciente actualizado correctamente.' : 'Paciente registrado correctamente.')
      closeForm()
      resource.reload()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No fue posible guardar el paciente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <ResourceTable
        title="Pacientes"
        description="Consulta y gestiona la información de los pacientes registrados."
        resource={resource}
        pageSize={10}
        columns={[
          {
            key: 'document',
            label: 'Tipo de documento',
            render: (value) => (value as DocumentRecord | undefined)?.desc_tipo ?? '—',
          },
          { key: 'ced_patients', label: 'Número de identificación' },
          { key: 'nom_patients', label: 'Nombre' },
          { key: 'ape_patients', label: 'Apellido' },
          { key: 'fec_nacimiento', label: 'Fecha de nacimiento' },
          { key: 'edad', label: 'Edad' },
          { key: 'nom_sexo', label: 'Sexo' },
          { key: 'telefono', label: 'Teléfono' },
          { key: 'email', label: 'Correo electrónico' },
          { key: 'direccion', label: 'Dirección' },
          { key: 'eps', label: 'EPS' },
          { key: 'contacto_emergencia', label: 'Contacto de emergencia' },
          {
            key: 'activo',
            label: 'Estado',
            render: (value) => value === 0 || value === true
              ? 'Activo'
              : value === 1 || value === false
                ? 'Inactivo'
                : '—',
          },
        ]}
        actions={canManagePatients ? (row) => {
          const patient = editablePatientFromRow(row)
          if (!patient || patient.id_patients <= 0) return <span className="muted">Datos incompletos</span>
          return (
            <div className="table-actions">
              <button
                className="action-button action-button-edit"
                type="button"
                onClick={() => startEditingPatient(patient)}
              >
                Editar
              </button>
            </div>
          )
        } : undefined}
        emptyMessage="No hay pacientes registrados."
        headerAction={canManagePatients ? (
          <>
            <button
              className="button button-secondary"
              type="button"
              aria-expanded={csvImportOpen}
              disabled={csvSubmitting}
              onClick={() => {
                if (csvImportOpen) closeCSVImport()
                else {
                  closeForm()
                  setCsvImportOpen(true)
                  setCsvError(null)
                }
                setSuccessMessage(null)
              }}
            >
              {csvImportOpen ? 'Cancelar importación' : 'Importar CSV'}
            </button>
            <button
              className="button button-primary"
              type="button"
              aria-expanded={formOpen}
              aria-controls="patient-create-form"
              disabled={csvSubmitting}
              onClick={() => {
                if (formOpen) closeForm()
                else {
                  closeCSVImport()
                  setFormOpen(true)
                  setEditingPatient(null)
                }
                setSubmitError(null)
                setSuccessMessage(null)
              }}
            >
              <span aria-hidden="true">{formOpen ? '−' : '+'}</span>
              {formOpen ? (editingPatient ? 'Cancelar edición' : 'Cancelar alta') : 'Nuevo paciente'}
            </button>
          </>
        ) : undefined}
      />

      {successMessage && (
        <div className="notice notice-success patient-feedback" role="status">
          <strong>Paciente guardado.</strong>
          <span>{successMessage}</span>
        </div>
      )}

      {canManagePatients && csvImportOpen && (
        <div className="panel user-form-panel patient-form-panel">
          <div className="user-form-header">
            <div>
              <span className="eyebrow">CARGA MASIVA</span>
              <h2>Importar pacientes desde CSV</h2>
              <p>Use un CSV UTF-8 de hasta 5 MB y 5.000 filas. No se importará ningún registro si hay errores.</p>
            </div>
          </div>

          <div className="notice notice-warning" role="note">
            <span>La identificación debe ser única. Los pacientes existentes no se actualizan; corrija duplicados antes de confirmar.</span>
          </div>

          <div className="user-form">
            <div className="field">
              <label htmlFor="patient-csv-file">Archivo CSV</label>
              <input
                ref={csvInputRef}
                id="patient-csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setCsvFile(event.target.files?.[0] ?? null)
                  setCsvPreview(null)
                  setCsvError(null)
                }}
                disabled={csvSubmitting}
              />
              <small>Columnas requeridas: tipo_documento (código o nombre del catálogo), cedula, nombres, apellidos, fecha_nacimiento (AAAA-MM-DD) y sexo. Los tipos de documento y el sexo deben coincidir con sus catálogos.</small>
            </div>

            {csvError && <div className="notice notice-error" role="alert"><strong>No se pudo procesar el CSV.</strong><span>{csvError}</span></div>}

            {csvPreview && (
              <div className="patient-csv-preview" aria-live="polite">
                <div className={csvPreview.can_import ? 'notice notice-success' : 'notice notice-error'}>
                  <strong>Validación completada.</strong>
                  <span>{csvPreview.valid_rows} válidos, {csvPreview.invalid_rows} con errores, de {csvPreview.total_rows} filas.</span>
                  {csvPreview.valid_rows > csvPreview.preview_rows.length && (
                    <span>Se muestran las primeras {csvPreview.preview_rows.length} filas válidas.</span>
                  )}
                </div>

                {csvPreview.preview_rows.length > 0 && (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr><th>Fila</th><th>Tipo de documento</th><th>Número</th><th>Nombre</th><th>Fecha de nacimiento</th><th>Sexo</th></tr>
                      </thead>
                      <tbody>
                        {csvPreview.preview_rows.map(({ row_number, patient }) => (
                          <tr key={row_number}>
                            <td>{row_number}</td>
                            <td>{documents.data?.find((document) => document.id_documents === patient.id_documents)?.desc_tipo ?? '—'}</td>
                            <td>{patient.ced_patients}</td>
                            <td>{patient.nom_patients} {patient.ape_patients}</td>
                            <td>{patient.fec_nacimiento}</td>
                            <td>{sexos.data?.find((sexo) => sexo.id_sexo === patient.id_sexo)?.nom_sexo ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {csvPreview.errors.length > 0 && (
                  <div className="patient-csv-errors">
                    <strong>Corrija estos errores y vuelva a cargar el archivo:</strong>
                    <ul>
                      {csvPreview.errors.map((rowError) => (
                        <li key={rowError.row_number}>
                          <strong>Fila {rowError.row_number}:</strong> {rowError.messages.join('; ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="user-form-actions">
              <button className="button button-secondary" type="button" onClick={downloadCSVTemplate}>
                Descargar plantilla
              </button>
              <button className="button button-secondary" type="button" onClick={previewCSVImport} disabled={csvSubmitting || !csvFile}>
                {csvSubmitting && !csvPreview ? 'Validando…' : 'Validar archivo'}
              </button>
              {csvPreview?.can_import && (
                <button className="button button-primary" type="button" onClick={importCSVPatients} disabled={csvSubmitting}>
                  {csvSubmitting ? 'Importando…' : `Confirmar e importar ${csvPreview.valid_rows} pacientes`}
                </button>
              )}
              <button className="button button-secondary" type="button" onClick={closeCSVImport} disabled={csvSubmitting}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {canManagePatients && formOpen && (
        <div className="panel user-form-panel patient-form-panel" id="patient-create-form">
          <div className="user-form-header">
            <div>
              <span className="eyebrow">{editingPatient ? 'EDICIÓN DE PACIENTE' : 'ALTA DE PACIENTE'}</span>
              <h2>{editingPatient ? `Editar paciente #${editingPatient.id_patients}` : 'Registrar nuevo paciente'}</h2>
            </div>
          </div>

          {sexos.error && (
            <div className="notice notice-error" role="alert">
              <strong>No se pudieron cargar las opciones de sexo.</strong>
              <span>{sexos.error}</span>
              <button className="text-button" type="button" onClick={sexos.reload}>Intentar de nuevo</button>
            </div>
          )}

          {documents.error && (
            <div className="notice notice-error" role="alert">
              <strong>No se pudieron cargar los tipos de documento.</strong>
              <span>{documents.error}</span>
              <button className="text-button" type="button" onClick={documents.reload}>Intentar de nuevo</button>
            </div>
          )}

          <form className="user-form" onSubmit={handleSubmit}>
            <div className="user-form-grid">
              <div className="field">
                <label htmlFor="patient-document-type">Tipo de documento</label>
                <select id="patient-document-type" name="id_documents" value={form.id_documents} onChange={(event) => updateField('id_documents', event.target.value)} required disabled={documents.loading || Boolean(documents.error) || !documents.data?.length}>
                  <option value="">Seleccione una opción</option>
                  {documents.data?.map((document) => <option key={document.id_documents} value={document.id_documents}>{document.desc_tipo} — {document.desc_documents}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="patient-cedula">Número de identificación</label>
                <input id="patient-cedula" name="ced_patients" value={form.ced_patients} onChange={(event) => updateField('ced_patients', event.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="patient-name">Nombres</label>
                <input id="patient-name" name="nom_patients" value={form.nom_patients} onChange={(event) => updateField('nom_patients', event.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="patient-surname">Apellidos</label>
                <input id="patient-surname" name="ape_patients" value={form.ape_patients} onChange={(event) => updateField('ape_patients', event.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="patient-birth-date">Fecha de nacimiento</label>
                <input id="patient-birth-date" name="fec_nacimiento" type="date" value={form.fec_nacimiento} onChange={(event) => updateField('fec_nacimiento', event.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="patient-sex">Sexo</label>
                <select id="patient-sex" name="id_sexo" value={form.id_sexo} onChange={(event) => updateField('id_sexo', event.target.value)} required disabled={sexos.loading || Boolean(sexos.error) || !sexos.data?.length}>
                  <option value="">Seleccione una opción</option>
                  {sexos.data?.map((sexo) => <option key={sexo.id_sexo} value={sexo.id_sexo}>{sexo.nom_sexo}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="patient-phone">Teléfono</label>
                <input id="patient-phone" name="telefono" type="tel" value={form.telefono} onChange={(event) => updateField('telefono', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="patient-email">Correo electrónico</label>
                <input id="patient-email" name="email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="patient-eps">EPS</label>
                <input id="patient-eps" name="eps" value={form.eps} onChange={(event) => updateField('eps', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="patient-address">Dirección</label>
                <input id="patient-address" name="direccion" value={form.direccion} onChange={(event) => updateField('direccion', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="patient-emergency-contact">Contacto de emergencia</label>
                <input id="patient-emergency-contact" name="contacto_emergencia" value={form.contacto_emergencia} onChange={(event) => updateField('contacto_emergencia', event.target.value)} />
              </div>
            </div>

            {submitError && (
              <div className="notice notice-error" role="alert">
                <strong>No se pudo guardar el paciente.</strong>
                <span>{submitError}</span>
              </div>
            )}

            {!sexos.loading && !sexos.error && !sexos.data?.length && (
              <div className="notice notice-warning" role="alert">
                No hay opciones de sexo configuradas; no es posible completar el alta.
              </div>
            )}

            {!documents.loading && !documents.error && !documents.data?.length && (
              <div className="notice notice-warning" role="alert">
                No hay tipos de documento configurados; no es posible completar el alta.
              </div>
            )}

            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={submitting || sexos.loading || Boolean(sexos.error) || !sexos.data?.length || documents.loading || Boolean(documents.error) || !documents.data?.length}>
                {submitting ? 'Guardando…' : editingPatient ? 'Guardar cambios' : 'Registrar paciente'}
              </button>
              <button className="button button-secondary" type="button" onClick={closeForm} disabled={submitting}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

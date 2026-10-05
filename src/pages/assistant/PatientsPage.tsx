import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

interface PatientRecord {
  id_patients?: number
  ced_patients?: string
  nom_patients?: string
  ape_patients?: string
  fec_nacimiento?: string
  id_sexo?: number
  telefono?: string
  email?: string
  direccion?: string
  eps?: string
  contacto_emergencia?: string
}

interface SexoRecord {
  id_sexo: number
  nom_sexo: string
}

interface PatientFormState {
  ced_patients: string
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

export function PatientsPage() {
  const { hasPermission } = useAuth()
  const canManagePatients = hasPermission('patients.manage')
  const resource = useResource<PatientRecord[] | { items?: PatientRecord[] }>('/patients/')
  const sexos = useResource<SexoRecord[]>('/sexos/', canManagePatients)
  const [form, setForm] = useState<PatientFormState>(initialForm)
  const [formOpen, setFormOpen] = useState(false)
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
    setSubmitError(null)
    setFormOpen(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setSuccessMessage(null)

    const payload = {
      ced_patients: form.ced_patients.trim(),
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
      await apiRequest<PatientRecord>('/patients/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setSuccessMessage('Paciente registrado correctamente.')
      closeForm()
      resource.reload()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No fue posible registrar el paciente.')
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
        columns={[
          { key: 'ced_patients', label: 'Identificación' },
          { key: 'nom_patients', label: 'Nombre' },
          { key: 'ape_patients', label: 'Apellido' },
          { key: 'fec_nacimiento', label: 'Fecha de nacimiento' },
          { key: 'id_sexo', label: 'Sexo' },
          { key: 'telefono', label: 'Teléfono' },
          { key: 'eps', label: 'EPS' },
        ]}
        emptyMessage="No hay pacientes registrados."
        headerAction={canManagePatients ? (
          <button
            className="button button-primary"
            type="button"
            aria-expanded={formOpen}
            aria-controls="patient-create-form"
            onClick={() => {
              setFormOpen((open) => !open)
              setSubmitError(null)
              setSuccessMessage(null)
            }}
          >
            <span aria-hidden="true">{formOpen ? '−' : '+'}</span>
            {formOpen ? 'Cancelar alta' : 'Nuevo paciente'}
          </button>
        ) : undefined}
      />

      {successMessage && (
        <div className="notice notice-success patient-feedback" role="status">
          <strong>Registro completado.</strong>
          <span>{successMessage}</span>
        </div>
      )}

      {canManagePatients && formOpen && (
        <div className="panel user-form-panel patient-form-panel" id="patient-create-form">
          <div className="user-form-header">
            <div>
              <span className="eyebrow">ALTA DE PACIENTE</span>
              <h2>Registrar nuevo paciente</h2>
            </div>
          </div>

          {sexos.error && (
            <div className="notice notice-error" role="alert">
              <strong>No se pudieron cargar las opciones de sexo.</strong>
              <span>{sexos.error}</span>
              <button className="text-button" type="button" onClick={sexos.reload}>Intentar de nuevo</button>
            </div>
          )}

          <form className="user-form" onSubmit={handleSubmit}>
            <div className="user-form-grid">
              <div className="field">
                <label htmlFor="patient-cedula">Identificación</label>
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
                <strong>No se pudo registrar el paciente.</strong>
                <span>{submitError}</span>
              </div>
            )}

            {!sexos.loading && !sexos.error && !sexos.data?.length && (
              <div className="notice notice-warning" role="alert">
                No hay opciones de sexo configuradas; no es posible completar el alta.
              </div>
            )}

            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={submitting || sexos.loading || Boolean(sexos.error) || !sexos.data?.length}>
                {submitting ? 'Registrando…' : 'Registrar paciente'}
              </button>
              <button className="button button-secondary" type="button" onClick={closeForm} disabled={submitting}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

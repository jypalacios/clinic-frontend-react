import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

interface AllergyType {
  id_tipo_alergia: number
  nom_tipo_alergia: string
  activo: boolean
  usuario?: string | null
  fec_creacion?: string | null
}

interface AllergyRecord {
  id_alergia: number
  id_patients: number
  paciente?: string
  ced_patients?: string | null
  nom_patients?: string | null
  ape_patients?: string | null
  id_tipo_alergia: number | null
  nom_tipo_alergia?: string | null
  activo: boolean | null
  fec_creacion?: string | null
}

interface PatientOption {
  id_patients: number
  ced_patients: string
  nom_patients: string
  ape_patients: string
  activo: boolean | 0 | 1
}

interface TypeForm {
  nom_tipo_alergia: string
  activo: boolean
}

interface AllergyForm {
  id_patients: string
  id_tipo_alergia: string
  activo: boolean
}

const emptyTypeForm: TypeForm = { nom_tipo_alergia: '', activo: true }
const emptyAllergyForm: AllergyForm = { id_patients: '', id_tipo_alergia: '', activo: true }

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

function typeFromRow(row: Record<string, unknown>): AllergyType | null {
  const id = Number(row.id_tipo_alergia)
  if (!Number.isInteger(id) || typeof row.nom_tipo_alergia !== 'string') return null
  return { id_tipo_alergia: id, nom_tipo_alergia: row.nom_tipo_alergia, activo: row.activo === true }
}

function allergyFromRow(row: Record<string, unknown>): AllergyRecord | null {
  const id = Number(row.id_alergia)
  const patient = Number(row.id_patients)
  if (!Number.isInteger(id) || !Number.isInteger(patient)) return null
  return {
    id_alergia: id,
    id_patients: patient,
    paciente: [row.nom_patients, row.ape_patients].filter(Boolean).join(' '),
    id_tipo_alergia: row.id_tipo_alergia === null ? null : Number(row.id_tipo_alergia),
    activo: row.activo === true,
  }
}

export function AllergiesPage() {
  const { hasPermission } = useAuth()
  const canViewTypes = hasPermission('allergy_types.view')
  const canManageTypes = hasPermission('allergy_types.manage')
  const canViewAllergies = hasPermission('allergies.view')
  const canManageAllergies = hasPermission('allergies.manage')

  const types = useResource<AllergyType[]>('/allergy-types/', canViewTypes || canViewAllergies)
  const allergies = useResource<AllergyRecord[]>('/allergies/', canViewAllergies)
  const patients = useResource<PatientOption[]>('/patients/', canManageAllergies)

  const [typeForm, setTypeForm] = useState<TypeForm>(emptyTypeForm)
  const [editingType, setEditingType] = useState<AllergyType | null>(null)
  const [typeFormOpen, setTypeFormOpen] = useState(false)
  const [typeSubmitting, setTypeSubmitting] = useState(false)
  const [typeError, setTypeError] = useState<string | null>(null)
  const [typeFeedback, setTypeFeedback] = useState<string | null>(null)

  const [allergyForm, setAllergyForm] = useState<AllergyForm>(emptyAllergyForm)
  const [editingAllergy, setEditingAllergy] = useState<AllergyRecord | null>(null)
  const [allergyFormOpen, setAllergyFormOpen] = useState(false)
  const [allergySubmitting, setAllergySubmitting] = useState(false)
  const [allergyError, setAllergyError] = useState<string | null>(null)
  const [allergyFeedback, setAllergyFeedback] = useState<string | null>(null)

  const activePatients = (patients.data ?? []).filter((patient) => patient.activo === 0 || patient.activo === true)
  const selectableTypes = (types.data ?? []).filter(
    (type) => type.activo || type.id_tipo_alergia === editingAllergy?.id_tipo_alergia,
  )

  function closeTypeForm() {
    setTypeForm(emptyTypeForm)
    setEditingType(null)
    setTypeFormOpen(false)
    setTypeError(null)
  }

  function startCreateType() {
    setTypeForm(emptyTypeForm)
    setEditingType(null)
    setTypeError(null)
    setTypeFeedback(null)
    setTypeFormOpen(true)
  }

  function startEditType(type: AllergyType) {
    setTypeForm({ nom_tipo_alergia: type.nom_tipo_alergia, activo: type.activo })
    setEditingType(type)
    setTypeError(null)
    setTypeFeedback(null)
    setTypeFormOpen(true)
  }

  async function submitType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTypeSubmitting(true)
    setTypeError(null)
    setTypeFeedback(null)
    try {
      const nom_tipo_alergia = typeForm.nom_tipo_alergia.trim()
      if (editingType) {
        await apiRequest(`/allergy-types/${editingType.id_tipo_alergia}`, {
          method: 'PUT',
          body: JSON.stringify({ nom_tipo_alergia, activo: typeForm.activo }),
        })
      } else {
        await apiRequest('/allergy-types/', {
          method: 'POST',
          body: JSON.stringify({ nom_tipo_alergia }),
        })
      }
      setTypeFeedback(editingType ? 'Tipo de alergia actualizado correctamente.' : 'Tipo de alergia creado correctamente.')
      closeTypeForm()
      types.reload()
      allergies.reload()
    } catch (reason) {
      setTypeError(reason instanceof Error ? reason.message : 'No fue posible guardar el tipo de alergia.')
    } finally {
      setTypeSubmitting(false)
    }
  }

  function closeAllergyForm() {
    setAllergyForm(emptyAllergyForm)
    setEditingAllergy(null)
    setAllergyFormOpen(false)
    setAllergyError(null)
  }

  function startCreateAllergy() {
    setAllergyForm(emptyAllergyForm)
    setEditingAllergy(null)
    setAllergyError(null)
    setAllergyFeedback(null)
    setAllergyFormOpen(true)
  }

  function startEditAllergy(allergy: AllergyRecord) {
    setAllergyForm({
      id_patients: String(allergy.id_patients),
      id_tipo_alergia: allergy.id_tipo_alergia === null ? '' : String(allergy.id_tipo_alergia),
      activo: allergy.activo === true,
    })
    setEditingAllergy(allergy)
    setAllergyError(null)
    setAllergyFeedback(null)
    setAllergyFormOpen(true)
  }

  async function submitAllergy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAllergySubmitting(true)
    setAllergyError(null)
    setAllergyFeedback(null)
    try {
      if (editingAllergy) {
        await apiRequest(`/allergies/${editingAllergy.id_alergia}`, {
          method: 'PUT',
          body: JSON.stringify({
            id_tipo_alergia: Number(allergyForm.id_tipo_alergia),
            activo: allergyForm.activo,
          }),
        })
      } else {
        await apiRequest('/allergies/', {
          method: 'POST',
          body: JSON.stringify({
            id_patients: Number(allergyForm.id_patients),
            id_tipo_alergia: Number(allergyForm.id_tipo_alergia),
          }),
        })
      }
      setAllergyFeedback(editingAllergy ? 'Alergia actualizada correctamente.' : 'Alergia registrada correctamente.')
      closeAllergyForm()
      allergies.reload()
    } catch (reason) {
      setAllergyError(reason instanceof Error ? reason.message : 'No fue posible guardar la alergia.')
    } finally {
      setAllergySubmitting(false)
    }
  }

  const patientCatalogLoading = patients.loading || types.loading
  const patientCatalogError = patients.error || types.error

  return (
    <section>
      {canViewTypes && (
        <>
          <ResourceTable
            title="Tipos de alergias"
            description="Catálogo de tipos de alergia disponibles para registrar en los pacientes."
            resource={types}
            columns={[
              { key: 'id_tipo_alergia', label: 'Código' },
              { key: 'nom_tipo_alergia', label: 'Tipo de alergia' },
              { key: 'activo', label: 'Estado', render: statusPill },
              { key: 'usuario', label: 'Creado por' },
              { key: 'fec_creacion', label: 'Fecha de creación', render: formatDate },
            ]}
            actions={canManageTypes ? (row) => {
              const type = typeFromRow(row)
              if (!type) return <span className="muted">Datos incompletos</span>
              return (
                <div className="table-actions">
                  <button className="action-button action-button-edit" type="button" onClick={() => startEditType(type)}>
                    Editar
                  </button>
                </div>
              )
            } : undefined}
            emptyMessage="No hay tipos de alergia registrados."
            pageSize={5}
            headerAction={canManageTypes ? (
              <button className="button button-primary" type="button" onClick={startCreateType} aria-expanded={typeFormOpen}>
                + Nuevo tipo
              </button>
            ) : undefined}
          />

          {typeFeedback && <div className="notice notice-success patient-feedback" role="status">{typeFeedback}</div>}

          {canManageTypes && typeFormOpen && (
            <div className="panel user-form-panel patient-form-panel" id="allergy-type-form">
              <div className="user-form-header">
                <div>
                  <span className="eyebrow">{editingType ? 'EDITAR TIPO' : 'CATÁLOGO CLÍNICO'}</span>
                  <h2>{editingType ? `Modificar tipo #${editingType.id_tipo_alergia}` : 'Crear un tipo de alergia'}</h2>
                </div>
              </div>
              {typeError && <div className="notice notice-error" role="alert">{typeError}</div>}
              <form className="user-form" onSubmit={submitType}>
                <div className="user-form-grid">
                  <div className="field">
                    <label htmlFor="allergy-type-name">Nombre del tipo</label>
                    <input
                      id="allergy-type-name"
                      value={typeForm.nom_tipo_alergia}
                      maxLength={100}
                      required
                      onChange={(event) => {
                        setTypeForm((current) => ({ ...current, nom_tipo_alergia: event.target.value }))
                        setTypeError(null)
                      }}
                    />
                  </div>
                  {editingType && (
                    <div className="field">
                      <label htmlFor="allergy-type-status">Estado</label>
                      <select
                        id="allergy-type-status"
                        value={typeForm.activo ? '1' : '0'}
                        onChange={(event) => setTypeForm((current) => ({ ...current, activo: event.target.value === '1' }))}
                      >
                        <option value="1">Activo</option>
                        <option value="0">Inactivo</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="user-form-actions">
                  <button className="button button-secondary" type="button" onClick={closeTypeForm} disabled={typeSubmitting}>
                    Cancelar
                  </button>
                  <button className="button button-primary" type="submit" disabled={typeSubmitting || !typeForm.nom_tipo_alergia.trim()}>
                    {typeSubmitting ? 'Guardando…' : editingType ? 'Guardar cambios' : 'Crear tipo'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {canViewAllergies && (
        <>
          <ResourceTable
            title="Alergias de pacientes"
            description="Alergias registradas por paciente. Un paciente puede tener varias y varios pacientes pueden compartir la misma."
            resource={allergies}
            columns={[
              {
                key: 'nom_patients',
                label: 'Paciente',
                render: (_value, row) => [row.nom_patients, row.ape_patients].filter(Boolean).join(' ') || `Paciente #${String(row.id_patients ?? '')}`,
              },
              { key: 'ced_patients', label: 'Identificación' },
              { key: 'nom_tipo_alergia', label: 'Tipo de alergia' },
              { key: 'activo', label: 'Estado', render: statusPill },
              { key: 'fec_creacion', label: 'Fecha de registro', render: formatDate },
            ]}
            actions={canManageAllergies ? (row) => {
              const allergy = allergyFromRow(row)
              if (!allergy) return <span className="muted">Datos incompletos</span>
              return (
                <div className="table-actions">
                  <button className="action-button action-button-edit" type="button" onClick={() => startEditAllergy(allergy)}>
                    Editar
                  </button>
                </div>
              )
            } : undefined}
            emptyMessage="No hay alergias registradas."
            pageSize={10}
            headerAction={canManageAllergies ? (
              <button className="button button-primary" type="button" onClick={startCreateAllergy} aria-expanded={allergyFormOpen}>
                + Nueva alergia
              </button>
            ) : undefined}
          />

          {allergyFeedback && <div className="notice notice-success patient-feedback" role="status">{allergyFeedback}</div>}

          {canManageAllergies && allergyFormOpen && (
            <div className="panel user-form-panel patient-form-panel" id="allergy-form">
              <div className="user-form-header">
                <div>
                  <span className="eyebrow">{editingAllergy ? 'EDITAR ALERGIA' : 'HISTORIA DEL PACIENTE'}</span>
                  <h2>{editingAllergy ? `Modificar alergia #${editingAllergy.id_alergia}` : 'Registrar una alergia'}</h2>
                </div>
              </div>

              {patientCatalogError && (
                <div className="notice notice-error" role="alert">
                  <strong>No se pudieron cargar pacientes o tipos de alergia.</strong>
                  <span>{patientCatalogError}</span>
                  <button className="text-button" type="button" onClick={() => { patients.reload(); types.reload() }}>
                    Intentar de nuevo
                  </button>
                </div>
              )}
              {!patientCatalogLoading && !patientCatalogError && !selectableTypes.length && (
                <div className="notice notice-warning" role="status">
                  Registre al menos un tipo de alergia activo antes de asignar alergias.
                </div>
              )}
              {allergyError && <div className="notice notice-error" role="alert">{allergyError}</div>}

              <form className="user-form" onSubmit={submitAllergy}>
                <div className="user-form-grid">
                  <div className="field">
                    <label htmlFor="allergy-patient">Paciente</label>
                    {editingAllergy ? (
                      <input
                        id="allergy-patient"
                        readOnly
                        value={editingAllergy.paciente || `Paciente #${editingAllergy.id_patients}`}
                      />
                    ) : (
                      <select
                        id="allergy-patient"
                        value={allergyForm.id_patients}
                        required
                        disabled={patientCatalogLoading || Boolean(patientCatalogError) || !activePatients.length}
                        onChange={(event) => {
                          setAllergyForm((current) => ({ ...current, id_patients: event.target.value }))
                          setAllergyError(null)
                        }}
                      >
                        <option value="">Seleccione un paciente</option>
                        {activePatients.map((patient) => (
                          <option key={patient.id_patients} value={patient.id_patients}>
                            {patient.nom_patients} {patient.ape_patients} — {patient.ced_patients}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="field">
                    <label htmlFor="allergy-type">Tipo de alergia</label>
                    <select
                      id="allergy-type"
                      value={allergyForm.id_tipo_alergia}
                      required
                      disabled={patientCatalogLoading || Boolean(patientCatalogError) || !selectableTypes.length}
                      onChange={(event) => {
                        setAllergyForm((current) => ({ ...current, id_tipo_alergia: event.target.value }))
                        setAllergyError(null)
                      }}
                    >
                      <option value="">Seleccione un tipo</option>
                      {selectableTypes.map((type) => (
                        <option key={type.id_tipo_alergia} value={type.id_tipo_alergia}>
                          {type.nom_tipo_alergia}{type.activo ? '' : ' (inactivo)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  {editingAllergy && (
                    <div className="field">
                      <label htmlFor="allergy-status">Estado</label>
                      <select
                        id="allergy-status"
                        value={allergyForm.activo ? '1' : '0'}
                        onChange={(event) => setAllergyForm((current) => ({ ...current, activo: event.target.value === '1' }))}
                      >
                        <option value="1">Activo</option>
                        <option value="0">Inactivo</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="user-form-actions">
                  <button className="button button-secondary" type="button" onClick={closeAllergyForm} disabled={allergySubmitting}>
                    Cancelar
                  </button>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={allergySubmitting || patientCatalogLoading || Boolean(patientCatalogError) || !selectableTypes.length || (!editingAllergy && !activePatients.length)}
                  >
                    {allergySubmitting ? 'Guardando…' : editingAllergy ? 'Guardar cambios' : 'Registrar alergia'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </section>
  )
}

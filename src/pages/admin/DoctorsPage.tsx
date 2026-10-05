import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

interface DoctorRecord {
  id_doctors?: number
  id_user?: number | null
  nom_doctors?: string
  ape_doctors?: string
  id_espect?: number
  id_sexo?: number
  telefono?: string
  email?: string
  direccion?: string
}

interface SpecialtyRecord {
  id_espect: number
  nom_espect: string
}

interface SexoRecord {
  id_sexo: number
  nom_sexo: string
}

interface UserRecord {
  id: number
  usuario: string
  nombre: string
  apellido: string
  id_role: number
  id_estado: number
}

interface RoleRecord {
  id_role: number
  nom_role: string
}

interface DoctorFormState {
  nom_doctors: string
  ape_doctors: string
  id_espect: string
  id_sexo: string
  telefono: string
  email: string
  direccion: string
}

const initialDoctorForm: DoctorFormState = {
  nom_doctors: '',
  ape_doctors: '',
  id_espect: '',
  id_sexo: '',
  telefono: '',
  email: '',
  direccion: '',
}

export function DoctorsPage() {
  const { hasPermission, role } = useAuth()
  const canViewDoctors = hasPermission('doctors.view')
  const canManageDoctors = hasPermission('doctors.manage')
  const canManageSpecialties = hasPermission('specialties.manage')
  const canLinkDoctorUsers = role === 'admin' && hasPermission('doctors.link_user')
  const doctors = useResource<DoctorRecord[]>('/doctors/', canViewDoctors)
  const specialties = useResource<SpecialtyRecord[]>('/specialties/')
  const sexos = useResource<SexoRecord[]>('/sexos/', canManageDoctors)
  const users = useResource<UserRecord[]>('/users/', canLinkDoctorUsers)
  const roles = useResource<RoleRecord[]>('/roles/', canLinkDoctorUsers)
  const [doctorForm, setDoctorForm] = useState<DoctorFormState>(initialDoctorForm)
  const [specialtyName, setSpecialtyName] = useState('')
  const [doctorFormOpen, setDoctorFormOpen] = useState(false)
  const [specialtyFormOpen, setSpecialtyFormOpen] = useState(false)
  const [submittingDoctor, setSubmittingDoctor] = useState(false)
  const [submittingSpecialty, setSubmittingSpecialty] = useState(false)
  const [doctorError, setDoctorError] = useState<string | null>(null)
  const [specialtyError, setSpecialtyError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [linkFormOpen, setLinkFormOpen] = useState(false)
  const [linkDoctorId, setLinkDoctorId] = useState('')
  const [linkUserId, setLinkUserId] = useState('')
  const [linkSubmitting, setLinkSubmitting] = useState(false)

  function updateDoctor(field: keyof DoctorFormState, value: string) {
    setDoctorForm((current) => ({ ...current, [field]: value }))
    setDoctorError(null)
    setFeedback(null)
  }

  async function handleDoctorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittingDoctor(true)
    setDoctorError(null)
    setFeedback(null)
    try {
      await apiRequest<DoctorRecord>('/doctors/', {
        method: 'POST',
        body: JSON.stringify({
          nom_doctors: doctorForm.nom_doctors.trim(),
          ape_doctors: doctorForm.ape_doctors.trim(),
          id_espect: Number(doctorForm.id_espect),
          id_sexo: Number(doctorForm.id_sexo),
          telefono: doctorForm.telefono.trim() || null,
          email: doctorForm.email.trim() || null,
          direccion: doctorForm.direccion.trim() || null,
        }),
      })
      setFeedback('Profesional registrado correctamente.')
      setDoctorForm(initialDoctorForm)
      setDoctorFormOpen(false)
      doctors.reload()
    } catch (error) {
      setDoctorError(error instanceof Error ? error.message : 'No fue posible registrar el profesional.')
    } finally {
      setSubmittingDoctor(false)
    }
  }

  async function handleSpecialtySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittingSpecialty(true)
    setSpecialtyError(null)
    setFeedback(null)
    try {
      const created = await apiRequest<SpecialtyRecord>('/specialties/', {
        method: 'POST',
        body: JSON.stringify({ nom_espect: specialtyName.trim() }),
      })
      setSpecialtyName('')
      setSpecialtyFormOpen(false)
      setDoctorForm((current) => ({ ...current, id_espect: String(created.id_espect) }))
      setFeedback('Especialidad creada y seleccionada para el profesional.')
      specialties.reload()
    } catch (error) {
      setSpecialtyError(error instanceof Error ? error.message : 'No fue posible crear la especialidad.')
    } finally {
      setSubmittingSpecialty(false)
    }
  }

  async function handleLinkUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!linkDoctorId || !linkUserId) return
    setLinkSubmitting(true)
    setDoctorError(null)
    setFeedback(null)
    try {
      await apiRequest(`/doctors/${linkDoctorId}/user`, {
        method: 'PUT',
        body: JSON.stringify({ id_user: Number(linkUserId) }),
      })
      setFeedback('Cuenta vinculada al perfil médico. El profesional ya puede operar historias clínicas.')
      setLinkDoctorId('')
      setLinkUserId('')
      setLinkFormOpen(false)
      doctors.reload()
    } catch (error) {
      setDoctorError(error instanceof Error ? error.message : 'No fue posible vincular la cuenta médica.')
    } finally {
      setLinkSubmitting(false)
    }
  }

  const specialtyNameById = new Map((specialties.data ?? []).map((item) => [item.id_espect, item.nom_espect]))
  const sexoNameById = new Map((sexos.data ?? []).map((item) => [item.id_sexo, item.nom_sexo]))
  const roleNameById = new Map((roles.data ?? []).map((item) => [item.id_role, item.nom_role.trim().toLowerCase()]))
  const assignedUserIds = new Set((doctors.data ?? []).map((doctor) => doctor.id_user).filter((id): id is number => typeof id === 'number'))
  const selectedDoctor = doctors.data?.find((doctor) => String(doctor.id_doctors) === linkDoctorId)
  const availableDoctorUsers = (users.data ?? []).filter((user) => {
    const roleName = roleNameById.get(user.id_role)
    const isDoctorRole = roleName === 'medico' || roleName === 'médico' || roleName === 'doctor'
    return user.id_estado === 1 && isDoctorRole && (!assignedUserIds.has(user.id) || user.id === selectedDoctor?.id_user)
  })
  const catalogsLoading = specialties.loading || sexos.loading
  const catalogsError = specialties.error || sexos.error
  const specialtyAction = canManageSpecialties ? (
    <button
      className="button button-secondary"
      type="button"
      aria-expanded={specialtyFormOpen}
      onClick={() => {
        setSpecialtyFormOpen((open) => !open)
        setSpecialtyError(null)
        setFeedback(null)
      }}
    >
      {specialtyFormOpen ? 'Cancelar' : 'Nueva especialidad'}
    </button>
  ) : undefined

  return (
    <section>
      {canViewDoctors ? (
        <ResourceTable
          title="Médicos y profesionales"
          description="Registra profesionales y administra el catálogo de especialidades de la clínica."
          resource={doctors}
          columns={[
            { key: 'id_doctors', label: 'Código' },
            { key: 'nom_doctors', label: 'Nombre' },
            { key: 'ape_doctors', label: 'Apellido' },
            { key: 'id_espect', label: 'Especialidad', render: (value) => specialtyNameById.get(Number(value)) ?? '—' },
            { key: 'id_sexo', label: 'Sexo', render: (value) => sexoNameById.get(Number(value)) ?? '—' },
            { key: 'id_user', label: 'Cuenta de acceso', render: (value) => {
              const account = users.data?.find((user) => user.id === Number(value))
              return value ? account?.usuario ?? `Usuario #${String(value)}` : 'Sin vincular'
            } },
            { key: 'telefono', label: 'Teléfono' },
            { key: 'email', label: 'Correo electrónico' },
          ]}
          emptyMessage="No hay profesionales registrados."
          headerAction={
            <>
              {specialtyAction}
              {canLinkDoctorUsers && <button
                className="button button-secondary"
                type="button"
                aria-expanded={linkFormOpen}
                onClick={() => { setLinkFormOpen((open) => !open); setDoctorError(null); setFeedback(null) }}
              >
                {linkFormOpen ? 'Cancelar vínculo' : 'Vincular cuenta médica'}
              </button>}
              {canManageDoctors && <button
                className="button button-primary"
                type="button"
                aria-expanded={doctorFormOpen}
                aria-controls="doctor-create-form"
                onClick={() => {
                  setDoctorFormOpen((open) => !open)
                  setDoctorError(null)
                  setFeedback(null)
                }}
              >
                <span aria-hidden="true">{doctorFormOpen ? '−' : '+'}</span>
                {doctorFormOpen ? 'Cancelar alta' : 'Nuevo profesional'}
              </button>}
            </>
          }
        />
      ) : (
        <ResourceTable
          title="Especialidades"
          description="Consulta y administra el catálogo de especialidades clínicas."
          resource={specialties}
          columns={[
            { key: 'id_espect', label: 'Código' },
            { key: 'nom_espect', label: 'Especialidad' },
          ]}
          emptyMessage="No hay especialidades registradas."
          headerAction={specialtyAction}
        />
      )}

      {feedback && <div className="notice notice-success doctor-feedback" role="status">{feedback}</div>}
      {doctorError && !doctorFormOpen && !linkFormOpen && <div className="notice notice-error doctor-feedback" role="alert"><strong>No se pudo completar la operación.</strong><span>{doctorError}</span></div>}

      {canLinkDoctorUsers && linkFormOpen && (
        <div className="panel user-form-panel doctor-form-panel">
          <div className="user-form-header">
            <span className="eyebrow">ACCESO CLÍNICO</span>
            <h2>Vincular usuario médico</h2>
            <p>Selecciona un perfil profesional y una cuenta activa con rol Médico para habilitar la historia clínica.</p>
          </div>
          {(users.error || roles.error) && (
            <div className="notice notice-error" role="alert">
              <strong>No se pudieron cargar las cuentas disponibles.</strong>
              <span>{users.error ?? roles.error}</span>
              <button className="text-button" type="button" onClick={() => { users.reload(); roles.reload() }}>Reintentar</button>
            </div>
          )}
          {!users.error && !roles.error && doctors.data?.length === 0 && (
            <div className="notice notice-warning">Registra primero el perfil profesional que deseas vincular.</div>
          )}
          {!users.error && !roles.error && doctors.data?.length && !availableDoctorUsers.length ? (
            <div className="notice notice-warning">No hay cuentas médicas activas sin vincular. Crea un usuario con rol Médico desde Usuarios y vuelve aquí.</div>
          ) : null}
          <form className="user-form" onSubmit={handleLinkUser}>
            <div className="user-form-grid">
              <div className="field">
                <label htmlFor="link-doctor">Perfil profesional</label>
                <select id="link-doctor" value={linkDoctorId} onChange={(event) => { setLinkDoctorId(event.target.value); setLinkUserId('') }} required disabled={doctors.loading || !doctors.data?.length}>
                  <option value="">Seleccione el profesional</option>
                  {doctors.data?.map((doctor) => <option key={doctor.id_doctors} value={doctor.id_doctors}>{doctor.nom_doctors} {doctor.ape_doctors}{doctor.id_user ? ' (cuenta vinculada)' : ''}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="link-doctor-user">Cuenta activa con rol Médico</label>
                <select id="link-doctor-user" value={linkUserId} onChange={(event) => setLinkUserId(event.target.value)} required disabled={!linkDoctorId || users.loading || roles.loading || !availableDoctorUsers.length}>
                  <option value="">Seleccione una cuenta</option>
                  {availableDoctorUsers.map((user) => <option key={user.id} value={user.id}>{user.usuario} · {user.nombre} {user.apellido}</option>)}
                </select>
              </div>
            </div>
            {doctorError && <div className="notice notice-error" role="alert"><span>{doctorError}</span></div>}
            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={linkSubmitting || !availableDoctorUsers.length}>{linkSubmitting ? 'Vinculando…' : 'Vincular cuenta'}</button>
            </div>
          </form>
        </div>
      )}

      {canManageSpecialties && specialtyFormOpen && (
        <div className="panel user-form-panel doctor-form-panel">
          <div className="user-form-header">
            <span className="eyebrow">CATÁLOGO CLÍNICO</span>
            <h2>Crear especialidad</h2>
          </div>
          <form className="specialty-create-form" onSubmit={handleSpecialtySubmit}>
            <div className="field">
              <label htmlFor="specialty-name">Nombre de la especialidad</label>
              <input id="specialty-name" value={specialtyName} onChange={(event) => { setSpecialtyName(event.target.value); setSpecialtyError(null) }} minLength={2} maxLength={120} required />
            </div>
            {specialtyError && <div className="notice notice-error" role="alert"><strong>No se pudo crear la especialidad.</strong><span>{specialtyError}</span></div>}
            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={submittingSpecialty}>{submittingSpecialty ? 'Guardando…' : 'Crear especialidad'}</button>
            </div>
          </form>
        </div>
      )}

      {canManageDoctors && doctorFormOpen && (
        <div className="panel user-form-panel doctor-form-panel" id="doctor-create-form">
          <div className="user-form-header">
            <span className="eyebrow">ALTA DE PROFESIONAL</span>
            <h2>Registrar médico</h2>
          </div>

          {catalogsError && (
            <div className="notice notice-error" role="alert">
              <strong>No se pudieron cargar los catálogos.</strong>
              <span>{catalogsError}</span>
              <button className="text-button" type="button" onClick={() => { specialties.reload(); sexos.reload() }}>Intentar de nuevo</button>
            </div>
          )}

          {!catalogsLoading && !catalogsError && specialties.data?.length === 0 && (
            <div className="notice notice-warning" role="status">Crea una especialidad antes de registrar un profesional.</div>
          )}

          <form className="user-form" onSubmit={handleDoctorSubmit}>
            <div className="user-form-grid">
              <div className="field">
                <label htmlFor="doctor-name">Nombres</label>
                <input id="doctor-name" value={doctorForm.nom_doctors} onChange={(event) => updateDoctor('nom_doctors', event.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="doctor-surname">Apellidos</label>
                <input id="doctor-surname" value={doctorForm.ape_doctors} onChange={(event) => updateDoctor('ape_doctors', event.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="doctor-specialty">Especialidad</label>
                <select id="doctor-specialty" value={doctorForm.id_espect} onChange={(event) => updateDoctor('id_espect', event.target.value)} required disabled={catalogsLoading || Boolean(catalogsError) || !specialties.data?.length}>
                  <option value="">Seleccione una especialidad</option>
                  {specialties.data?.map((item) => <option key={item.id_espect} value={item.id_espect}>{item.nom_espect}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="doctor-sex">Sexo</label>
                <select id="doctor-sex" value={doctorForm.id_sexo} onChange={(event) => updateDoctor('id_sexo', event.target.value)} required disabled={catalogsLoading || Boolean(catalogsError) || !sexos.data?.length}>
                  <option value="">Seleccione una opción</option>
                  {sexos.data?.map((item) => <option key={item.id_sexo} value={item.id_sexo}>{item.nom_sexo}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="doctor-phone">Teléfono</label>
                <input id="doctor-phone" type="tel" value={doctorForm.telefono} onChange={(event) => updateDoctor('telefono', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="doctor-email">Correo electrónico</label>
                <input id="doctor-email" type="email" value={doctorForm.email} onChange={(event) => updateDoctor('email', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="doctor-address">Dirección</label>
                <input id="doctor-address" value={doctorForm.direccion} onChange={(event) => updateDoctor('direccion', event.target.value)} />
              </div>
            </div>
            {doctorError && <div className="notice notice-error" role="alert"><strong>No se pudo registrar el profesional.</strong><span>{doctorError}</span></div>}
            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={submittingDoctor || catalogsLoading || Boolean(catalogsError) || !specialties.data?.length || !sexos.data?.length}>
                {submittingDoctor ? 'Registrando…' : 'Registrar profesional'}
              </button>
              <button className="button button-secondary" type="button" onClick={() => setDoctorFormOpen(false)} disabled={submittingDoctor}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

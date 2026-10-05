import { useState } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { useAuth } from '../../auth/AuthContext'

interface UserRecord {
  id?: number
  cedula?: string
  nombre?: string
  apellido?: string
  usuario?: string
  email?: string
  id_role?: number
  id_estado?: number
}

interface RoleRecord {
  id_role: number
  nom_role: string
  permisos: string[]
}

interface UserFormState {
  cedula: string
  nombre: string
  apellido: string
  usuario: string
  email: string
  password: string
  confirmPassword: string
  id_role: number
  id_estado: number
}

const stateOptions = [
  { value: 1, label: 'Activo' },
  { value: 2, label: 'Inactivo' },
]

const initialForm: UserFormState = {
  cedula: '',
  nombre: '',
  apellido: '',
  usuario: '',
  email: '',
  password: '',
  confirmPassword: '',
  id_role: 0,
  id_estado: 1,
}

function getRoleLabel(value: number | undefined, roles: RoleRecord[]): string {
  return roles.find((option) => option.id_role === value)?.nom_role ?? 'Sin rol'
}

function getStateLabel(value?: number): string {
  return stateOptions.find((option) => option.value === value)?.label ?? 'Sin estado'
}

function rowToForm(user: Partial<UserRecord>): UserFormState {
  return {
    cedula: String(user.cedula ?? ''),
    nombre: String(user.nombre ?? ''),
    apellido: String(user.apellido ?? ''),
    usuario: String(user.usuario ?? ''),
    email: String(user.email ?? ''),
    password: '',
    confirmPassword: '',
    id_role: Number(user.id_role ?? 0),
    id_estado: Number(user.id_estado ?? 1),
  }
}

function buildUserPayload(form: UserFormState, includePassword: boolean) {
  const payload: Record<string, unknown> = {
    cedula: form.cedula.trim(),
    nombre: form.nombre.trim(),
    apellido: form.apellido.trim(),
    usuario: form.usuario.trim(),
    email: form.email.trim(),
    id_role: form.id_role,
    id_estado: form.id_estado,
  }

  if (includePassword && form.password) {
    payload.password = form.password
  }

  return payload
}

export function UsersPage() {
  const { hasPermission } = useAuth()
  const canViewUsers = hasPermission('users.view')
  const canCreateUsers = hasPermission('users.create')
  const canManageUsers = hasPermission('users.manage')
  const resource = useResource<UserRecord[] | { items?: UserRecord[] }>('/users/')
  const roles = useResource<RoleRecord[]>('/roles/', canViewUsers)
  const [form, setForm] = useState<UserFormState>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<UserRecord | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const assignableRoles = (roles.data ?? []).filter((role) => (
    canManageUsers || !role.permisos.some((permission) => permission === 'users.manage' || permission === 'roles.manage')
  ))

  const resetForm = () => {
    setForm(initialForm)
    setErrors({})
    setEditingUserId(null)
    setIsEditing(false)
  }

  const updateField = (field: keyof UserFormState, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError(null)
    setSuccessMessage(null)
  }

  const validateForm = (): Partial<Record<keyof UserFormState, string>> => {
    const nextErrors: Partial<Record<keyof UserFormState, string>> = {}
    const cedula = form.cedula.trim()
    const nombre = form.nombre.trim()
    const apellido = form.apellido.trim()
    const usuario = form.usuario.trim()
    const email = form.email.trim()
    const password = form.password

    if (!cedula) nextErrors.cedula = 'La cédula es obligatoria.'
    else if (!/^\d{5,15}$/.test(cedula)) nextErrors.cedula = 'La cédula debe contener solo números y entre 5 y 15 dígitos.'

    if (!nombre) nextErrors.nombre = 'El nombre es obligatorio.'
    if (!apellido) nextErrors.apellido = 'El apellido es obligatorio.'

    if (!usuario) nextErrors.usuario = 'El nombre de usuario es obligatorio.'
    else if (usuario.length < 3) nextErrors.usuario = 'El usuario debe tener al menos 3 caracteres.'
    else if (!/^[a-zA-Z0-9._-]+$/.test(usuario)) nextErrors.usuario = 'El usuario solo puede tener letras, números y . _ - .'

    if (!email) nextErrors.email = 'El correo es obligatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Ingrese un correo válido.'

    if (!isEditing) {
      if (!password) nextErrors.password = 'La contraseña es obligatoria.'
      else if (password.length < 8) nextErrors.password = 'La contraseña debe tener mínimo 8 caracteres.'
      else if (password.length > 128) nextErrors.password = 'La contraseña no puede superar 128 caracteres.'

      if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirme la contraseña.'
      else if (form.confirmPassword !== password) nextErrors.confirmPassword = 'Las contraseñas no coinciden.'
    }

    const selectedRole = form.id_role || roles.data?.[0]?.id_role || 0
    if (!Number.isInteger(selectedRole) || !assignableRoles.some((option) => option.id_role === selectedRole)) {
      nextErrors.id_role = 'Seleccione un rol válido.'
    }

    if (!Number.isInteger(form.id_estado) || !stateOptions.some((option) => option.value === form.id_estado)) {
      nextErrors.id_estado = 'Seleccione un estado válido.'
    }

    return nextErrors
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateForm()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    const selectedRole = form.id_role || roles.data?.[0]?.id_role
    const payload = { ...buildUserPayload(form, !isEditing), id_role: selectedRole }
    const endpoint = isEditing && editingUserId !== null ? `/users/${editingUserId}` : '/users/'
    const method = isEditing && editingUserId !== null ? 'PUT' : 'POST'

    setSubmitting(true)
    setSubmitError(null)
    setSuccessMessage(null)

    try {
      await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload),
      })

      setSuccessMessage(isEditing ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.')
      resetForm()
      resource.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar el usuario.'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (user: UserRecord) => {
    setForm(rowToForm(user))
    setEditingUserId(user.id ?? null)
    setIsEditing(true)
    setSubmitError(null)
    setSuccessMessage(null)
    setErrors({})
  }

  const handleDelete = async (user: UserRecord) => {
    if (!user.id) return
    const confirmed = window.confirm(`¿Desea eliminar al usuario ${user.usuario ?? user.email ?? 'seleccionado'}?`)
    if (!confirmed) return

    setSubmitError(null)
    setSuccessMessage(null)

    try {
      await apiRequest(`/users/${user.id}`, {
        method: 'DELETE',
      })
      setSuccessMessage('Usuario eliminado correctamente.')
      if (editingUserId === user.id) resetForm()
      resource.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible eliminar el usuario.'
      setSubmitError(message)
    }
  }

  const handleToggleStatus = async (user: UserRecord) => {
    if (!user.id) return

    const nextState = Number(user.id_estado ?? 1) === 1 ? 2 : 1
    const payload = {
      ...buildUserPayload(rowToForm(user), false),
      id_estado: nextState,
    }

    setSubmitError(null)
    setSuccessMessage(null)

    try {
      await apiRequest(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      setSuccessMessage(`Usuario ${nextState === 1 ? 'activado' : 'inactivado'} correctamente.`)
      resource.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cambiar el estado del usuario.'
      setSubmitError(message)
    }
  }

  const handlePasswordUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!passwordTarget?.id) return
    if (newPassword.length < 8) {
      setSubmitError('La contraseña debe tener mínimo 8 caracteres.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setSubmitError('Las contraseñas no coinciden.')
      return
    }

    setPasswordSubmitting(true)
    setSubmitError(null)
    setSuccessMessage(null)
    try {
      await apiRequest(`/users/${passwordTarget.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      })
      setSuccessMessage(`La contraseña de ${passwordTarget.usuario ?? 'el usuario'} se actualizó correctamente.`)
      setPasswordTarget(null)
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No fue posible cambiar la contraseña.')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GESTIÓN CLÍNICA</span>
          <h1>Usuarios</h1>
          <p>Administra el acceso del personal a la plataforma.</p>
        </div>
        <button className="button button-secondary" type="button" onClick={resource.reload} disabled={resource.loading}>
          <span aria-hidden="true">↻</span> Actualizar
        </button>
      </div>

      {(canCreateUsers || canManageUsers) && (
      <div className="panel user-form-panel">
        <div className="user-form-header">
          <div>
            <span className="eyebrow">{isEditing ? 'EDICIÓN DE USUARIO' : 'ALTA DE USUARIO'}</span>
            <h2>{isEditing ? 'Actualizar registro' : 'Crear nuevo registro'}</h2>
          </div>
        </div>

        <form className="user-form" onSubmit={handleSubmit} noValidate>
          <div className="user-form-grid">
            <div className="field">
              <label htmlFor="cedula">Cédula</label>
              <input id="cedula" type="text" inputMode="numeric" maxLength={15} value={form.cedula} onChange={(event) => updateField('cedula', event.target.value)} aria-invalid={Boolean(errors.cedula)} />
              {errors.cedula && <small>{errors.cedula}</small>}
            </div>

            <div className="field">
              <label htmlFor="nombre">Nombre</label>
              <input id="nombre" type="text" maxLength={100} value={form.nombre} onChange={(event) => updateField('nombre', event.target.value)} aria-invalid={Boolean(errors.nombre)} />
              {errors.nombre && <small>{errors.nombre}</small>}
            </div>

            <div className="field">
              <label htmlFor="apellido">Apellido</label>
              <input id="apellido" type="text" maxLength={100} value={form.apellido} onChange={(event) => updateField('apellido', event.target.value)} aria-invalid={Boolean(errors.apellido)} />
              {errors.apellido && <small>{errors.apellido}</small>}
            </div>

            <div className="field">
              <label htmlFor="usuario">Usuario</label>
              <input id="usuario" type="text" maxLength={50} value={form.usuario} onChange={(event) => updateField('usuario', event.target.value)} aria-invalid={Boolean(errors.usuario)} />
              {errors.usuario && <small>{errors.usuario}</small>}
            </div>

            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" maxLength={150} value={form.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} />
              {errors.email && <small>{errors.email}</small>}
            </div>

            <div className="field">
              <label htmlFor="id_role">Rol</label>
              <select id="id_role" value={String(form.id_role || assignableRoles[0]?.id_role || '')} onChange={(event) => updateField('id_role', Number(event.target.value))} aria-invalid={Boolean(errors.id_role)} disabled={roles.loading || Boolean(roles.error) || !assignableRoles.length}>
                {assignableRoles.map((option) => (
                  <option key={option.id_role} value={String(option.id_role)}>{option.nom_role}</option>
                ))}
              </select>
              {!canManageUsers && <small>Los roles de administración requieren autorización administrativa.</small>}
              {roles.error && (
                <small>No se pudieron cargar los roles: {roles.error} <button className="text-button" type="button" onClick={roles.reload}>Reintentar</button></small>
              )}
              {errors.id_role && <small>{errors.id_role}</small>}
            </div>

            {canManageUsers && <div className="field">
              <label htmlFor="id_estado">Estado</label>
              <select id="id_estado" value={String(form.id_estado)} onChange={(event) => updateField('id_estado', Number(event.target.value))} aria-invalid={Boolean(errors.id_estado)}>
                {stateOptions.map((option) => (
                  <option key={option.value} value={String(option.value)}>{option.label}</option>
                ))}
              </select>
              {errors.id_estado && <small>{errors.id_estado}</small>}
            </div>}

            {!isEditing && <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" autoComplete="new-password" maxLength={128} value={form.password} onChange={(event) => updateField('password', event.target.value)} aria-invalid={Boolean(errors.password)} />
              {errors.password && <small>{errors.password}</small>}
            </div>}

            {!isEditing && <div className="field">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input id="confirmPassword" type="password" autoComplete="new-password" maxLength={128} value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} aria-invalid={Boolean(errors.confirmPassword)} />
              {errors.confirmPassword && <small>{errors.confirmPassword}</small>}
            </div>}
          </div>

          {submitError && (
            <div className="notice notice-error" role="alert">
              <strong>Error.</strong>
              <span>{submitError}</span>
            </div>
          )}

          {successMessage && (
            <div className="notice notice-warning" role="status">
              <strong>Éxito.</strong>
              <span>{successMessage}</span>
            </div>
          )}

          <div className="user-form-actions">
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? (isEditing ? 'Guardando…' : 'Creando…') : isEditing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
            <button className="button button-secondary" type="button" onClick={resetForm}>
              {isEditing ? 'Cancelar' : 'Limpiar'}
            </button>
          </div>
        </form>
      </div>
      )}

      {canManageUsers && passwordTarget && (
        <div className="panel user-form-panel">
          <div className="user-form-header">
            <span className="eyebrow">SEGURIDAD DE LA CUENTA</span>
            <h2>Cambiar contraseña · {passwordTarget.usuario}</h2>
          </div>
          <form className="user-form" onSubmit={handlePasswordUpdate}>
            <div className="user-form-grid">
              <div className="field">
                <label htmlFor="new-user-password">Nueva contraseña</label>
                <input id="new-user-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="confirm-new-user-password">Confirmar contraseña</label>
                <input id="confirm-new-user-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} required />
              </div>
            </div>
            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={passwordSubmitting}>{passwordSubmitting ? 'Actualizando…' : 'Cambiar contraseña'}</button>
              <button className="button button-secondary" type="button" onClick={() => { setPasswordTarget(null); setSubmitError(null); setNewPassword(''); setConfirmNewPassword('') }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <ResourceTable
        title="Usuarios"
        description="Administra el acceso del personal a la plataforma."
        resource={resource}
        columns={[
          { key: 'cedula', label: 'Identificación' },
          { key: 'nombre', label: 'Nombre' },
          { key: 'apellido', label: 'Apellido' },
          { key: 'usuario', label: 'Usuario' },
          { key: 'email', label: 'Correo electrónico' },
          { key: 'id_role', label: 'Rol', render: (value) => getRoleLabel(Number(value), roles.data ?? []) },
          { key: 'id_estado', label: 'Estado' },
        ]}
        emptyMessage="No hay usuarios registrados."
        actions={canManageUsers ? (row) => {
          const user = row as UserRecord
          const idRole = Number(user.id_role ?? 0)
          const idEstado = Number(user.id_estado ?? 1)

          return (
            <div className="table-actions">
              <button type="button" className="action-button action-button-edit" onClick={() => handleEdit(user)}>
                Editar
              </button>
              <button type="button" className="action-button action-button-edit" onClick={() => { setPasswordTarget(user); setNewPassword(''); setConfirmNewPassword(''); setSubmitError(null); setSuccessMessage(null) }}>
                Cambiar contraseña
              </button>
              <button type="button" className="action-button action-button-toggle" onClick={() => handleToggleStatus(user)}>
                {idEstado === 1 ? 'Inactivar' : 'Activar'}
              </button>
              <button type="button" className="action-button action-button-delete" onClick={() => handleDelete(user)}>
                Eliminar
              </button>
              <span className="role-pill">{getRoleLabel(idRole, roles.data ?? [])}</span>
              <span className={`status-pill ${idEstado === 1 ? 'status-active' : 'status-inactive'}`}>
                {getStateLabel(idEstado)}
              </span>
            </div>
          )
        } : undefined}
      />
    </section>
  )
}

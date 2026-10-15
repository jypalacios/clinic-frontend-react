import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { permissionOptions } from '../../auth/permissions'

interface RoleRecord {
  id_role: number
  nom_role: string
  permisos: number[]
}

interface PermissionRecord {
  id_permiso: number
  nom_permiso: string
  permiso_key: string | null
  activo: boolean
}

interface RoleForm {
  nom_role: string
  permisos: number[]
}

interface PermissionForm {
  nom_permiso: string
  activo: boolean
}

const emptyRoleForm: RoleForm = { nom_role: '', permisos: [] }
const emptyPermissionForm: PermissionForm = { nom_permiso: '', activo: true }
const permissionLabels = new Map<string, string>(permissionOptions.map(({ key, label }) => [key, label]))
const permissionGroups = new Map<string, string>(permissionOptions.map(({ key, group }) => [key, group]))

function permissionLabel(permission: PermissionRecord): string {
  return permission.permiso_key
    ? permissionLabels.get(permission.permiso_key) ?? permission.nom_permiso
    : permission.nom_permiso
}

function permissionGroup(permission: PermissionRecord): string {
  return permission.permiso_key
    ? permissionGroups.get(permission.permiso_key) ?? 'Otros permisos'
    : 'Otros permisos'
}

export function RolesPage() {
  const roles = useResource<RoleRecord[]>('/roles/')
  const permissions = useResource<PermissionRecord[]>('/roles/permissions')
  const [form, setForm] = useState<RoleForm>(emptyRoleForm)
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
  const [permissionForm, setPermissionForm] = useState<PermissionForm>(emptyPermissionForm)
  const [editingPermissionId, setEditingPermissionId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function resetRoleForm() {
    setForm(emptyRoleForm)
    setEditingRoleId(null)
    setError(null)
  }

  function editRole(role: RoleRecord) {
    setForm({ nom_role: role.nom_role, permisos: [...role.permisos] })
    setEditingRoleId(role.id_role)
    setError(null)
    setSuccess(null)
  }

  function togglePermission(permissionId: number) {
    setForm((current) => ({
      ...current,
      permisos: current.permisos.includes(permissionId)
        ? current.permisos.filter((item) => item !== permissionId)
        : [...current.permisos, permissionId],
    }))
    setError(null)
    setSuccess(null)
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.nom_role.trim()
    if (name.length < 2 || name.length > 50) {
      setError('El nombre del rol debe tener entre 2 y 50 caracteres.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await apiRequest<RoleRecord>(editingRoleId === null ? '/roles/' : `/roles/${editingRoleId}`, {
        method: editingRoleId === null ? 'POST' : 'PUT',
        body: JSON.stringify({ nom_role: name, permisos: form.permisos }),
      })
      setSuccess(editingRoleId === null ? 'Rol creado correctamente.' : 'Rol actualizado correctamente.')
      resetRoleForm()
      roles.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el rol.')
    } finally {
      setSubmitting(false)
    }
  }

  function editPermission(permission: PermissionRecord) {
    setPermissionForm({ nom_permiso: permission.nom_permiso, activo: permission.activo })
    setEditingPermissionId(permission.id_permiso)
    setPermissionError(null)
  }

  function resetPermissionForm() {
    setPermissionForm(emptyPermissionForm)
    setEditingPermissionId(null)
    setPermissionError(null)
  }

  async function savePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = permissionForm.nom_permiso.trim()
    if (name.length < 2 || name.length > 100) {
      setPermissionError('El nombre del permiso debe tener entre 2 y 100 caracteres.')
      return
    }

    setSubmitting(true)
    setPermissionError(null)
    try {
      await apiRequest<PermissionRecord>(
        editingPermissionId === null
          ? '/roles/permissions'
          : `/roles/permissions/${editingPermissionId}`,
        {
          method: editingPermissionId === null ? 'POST' : 'PUT',
          body: JSON.stringify({ nom_permiso: name, activo: permissionForm.activo }),
        },
      )
      resetPermissionForm()
      permissions.reload()
      roles.reload()
    } catch (reason) {
      setPermissionError(reason instanceof Error ? reason.message : 'No fue posible guardar el permiso.')
    } finally {
      setSubmitting(false)
    }
  }

  const activePermissions = (permissions.data ?? []).filter((permission) => permission.activo)
  const groupedPermissions = activePermissions.reduce<Record<string, PermissionRecord[]>>((groups, permission) => {
    const group = permissionGroup(permission)
    groups[group] = [...(groups[group] ?? []), permission]
    return groups
  }, {})

  return (
    <section>
      <ResourceTable
        title="Roles y permisos"
        description="Define los perfiles de acceso y los permisos persistidos en la matriz de roles."
        resource={roles}
        columns={[
          { key: 'nom_role', label: 'Rol' },
          {
            key: 'permisos',
            label: 'Permisos activos',
            render: (value) => {
              const ids = Array.isArray(value) ? value.map(Number) : []
              const names = (permissions.data ?? [])
                .filter((permission) => ids.includes(permission.id_permiso))
                .map(permissionLabel)
              return names.join(', ') || 'Sin permisos'
            },
          },
        ]}
        emptyMessage="No hay roles configurados."
        actions={(row) => {
          const role: RoleRecord = {
            id_role: Number(row.id_role),
            nom_role: String(row.nom_role ?? ''),
            permisos: Array.isArray(row.permisos) ? row.permisos.map(Number) : [],
          }
          return (
            <button type="button" className="action-button action-button-edit" onClick={() => editRole(role)}>
              Editar rol y permisos
            </button>
          )
        }}
      />

      {success && <div className="notice notice-success role-feedback" role="status">{success}</div>}

      <div className="panel user-form-panel role-form-panel">
        <div className="user-form-header">
          <span className="eyebrow">{editingRoleId === null ? 'NUEVO PERFIL' : 'EDICIÓN DE ROL'}</span>
          <h2>{editingRoleId === null ? 'Crear rol' : `Editar ${form.nom_role}`}</h2>
          <p>Los cambios se guardan en roles y matriz_permisos mediante el backend.</p>
        </div>
        <form className="user-form" onSubmit={saveRole}>
          <div className="field">
            <label htmlFor="role-name">Nombre del rol</label>
            <input
              id="role-name"
              value={form.nom_role}
              onChange={(event) => { setForm((current) => ({ ...current, nom_role: event.target.value })); setError(null) }}
              minLength={2}
              maxLength={50}
              required
            />
          </div>

          <fieldset className="role-permissions">
            <legend>Permisos activos</legend>
            {permissions.error ? (
              <div className="notice notice-error" role="alert">{permissions.error}</div>
            ) : permissions.loading ? (
              <div className="table-loading">Cargando permisos…</div>
            ) : activePermissions.length === 0 ? (
              <div className="empty-state">No hay permisos activos para asignar.</div>
            ) : (
              <div className="role-permission-grid">
                {Object.entries(groupedPermissions).map(([group, items]) => (
                  <section className="role-permission-group" key={group}>
                    <h3>{group}</h3>
                    {items.map((permission) => (
                      <label className="role-permission-option" key={permission.id_permiso}>
                        <input
                          type="checkbox"
                          checked={form.permisos.includes(permission.id_permiso)}
                          onChange={() => togglePermission(permission.id_permiso)}
                        />
                        <span>{permissionLabel(permission)}</span>
                      </label>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </fieldset>

          {error && <div className="notice notice-error" role="alert"><strong>No se pudo guardar el rol.</strong><span>{error}</span></div>}

          <div className="user-form-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={submitting || permissions.loading || Boolean(permissions.error)}
            >
              {submitting ? 'Guardando…' : editingRoleId === null ? 'Crear rol' : 'Guardar cambios'}
            </button>
            {editingRoleId !== null && <button className="button button-secondary" type="button" onClick={resetRoleForm}>Cancelar</button>}
          </div>
        </form>
      </div>

      <div className="panel user-form-panel role-form-panel">
        <div className="user-form-header">
          <span className="eyebrow">CATÁLOGO</span>
          <h2>{editingPermissionId === null ? 'Crear permiso' : 'Editar permiso'}</h2>
          <p>Un permiso inactivo deja de autorizar operaciones y se retira de las asignaciones vigentes.</p>
        </div>
        <form className="user-form" onSubmit={savePermission}>
          <div className="field">
            <label htmlFor="permission-name">Nombre del permiso</label>
            <input
              id="permission-name"
              value={permissionForm.nom_permiso}
              onChange={(event) => { setPermissionForm((current) => ({ ...current, nom_permiso: event.target.value })); setPermissionError(null) }}
              placeholder="patients.manage"
              minLength={2}
              maxLength={100}
              required
            />
            <small>Usa la clave de permiso requerida por las rutas del backend, por ejemplo `patients.manage`.</small>
          </div>
          {editingPermissionId !== null && (
            <label className="role-permission-option">
              <input
                type="checkbox"
                checked={permissionForm.activo}
                onChange={(event) => setPermissionForm((current) => ({ ...current, activo: event.target.checked }))}
              />
              <span>Permiso activo</span>
            </label>
          )}
          {permissionError && <div className="notice notice-error" role="alert">{permissionError}</div>}
          <div className="user-form-actions">
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : editingPermissionId === null ? 'Crear permiso' : 'Guardar permiso'}
            </button>
            {editingPermissionId !== null && <button className="button button-secondary" type="button" onClick={resetPermissionForm}>Cancelar</button>}
          </div>
        </form>

        {permissions.error && <div className="notice notice-error" role="alert">{permissions.error}</div>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Permiso</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {(permissions.data ?? []).map((permission) => (
                <tr key={permission.id_permiso}>
                  <td>{permissionLabel(permission)}</td>
                  <td>{permission.activo ? 'Activo' : 'Inactivo'}</td>
                  <td className="actions-cell">
                    <button type="button" className="action-button action-button-edit" onClick={() => editPermission(permission)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {permissions.data?.length === 0 && <tr><td colSpan={3}>No hay permisos configurados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

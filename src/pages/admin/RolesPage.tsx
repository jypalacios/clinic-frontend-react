import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'
import { permissionOptions, type PermissionKey } from '../../auth/permissions'

interface RoleRecord {
  id_role: number
  nom_role: string
  permisos: PermissionKey[]
}

interface RoleForm {
  nom_role: string
  permisos: PermissionKey[]
}

const emptyForm: RoleForm = { nom_role: '', permisos: [] }

const permissionLabels = new Map<string, string>(permissionOptions.map(({ key, label }) => [key, label]))
const permissionKeys = new Set<string>(permissionOptions.map(({ key }) => key))

export function RolesPage() {
  const resource = useResource<RoleRecord[]>('/roles/')
  const [form, setForm] = useState<RoleForm>(emptyForm)
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function resetForm() {
    setForm(emptyForm)
    setEditingRoleId(null)
    setError(null)
  }

  function editRole(role: RoleRecord) {
    setForm({ nom_role: role.nom_role, permisos: [...role.permisos] })
    setEditingRoleId(role.id_role)
    setError(null)
    setSuccess(null)
  }

  function togglePermission(permission: PermissionKey) {
    setForm((current) => ({
      ...current,
      permisos: current.permisos.includes(permission)
        ? current.permisos.filter((item) => item !== permission)
        : [...current.permisos, permission],
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
      resetForm()
      resource.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el rol.')
    } finally {
      setSubmitting(false)
    }
  }

  const permissionGroups = [...new Set(permissionOptions.map((permission) => permission.group))]

  return (
    <section>
      <ResourceTable
        title="Roles y permisos"
        description="Define los perfiles de acceso y las secciones que puede utilizar cada rol."
        resource={resource}
        columns={[
          { key: 'nom_role', label: 'Rol' },
          {
            key: 'permisos',
            label: 'Permisos',
            render: (value) => Array.isArray(value)
              ? value.map((permission) => permissionLabels.get(String(permission)) ?? String(permission)).join(', ') || 'Sin permisos'
              : 'Sin permisos',
          },
        ]}
        emptyMessage="No hay roles configurados."
        actions={(row) => {
          const role: RoleRecord = {
            id_role: Number(row.id_role),
            nom_role: String(row.nom_role ?? ''),
            permisos: Array.isArray(row.permisos)
              ? row.permisos.filter((permission): permission is PermissionKey => typeof permission === 'string' && permissionKeys.has(permission))
              : [],
          }
          return (
            <button type="button" className="action-button action-button-edit" onClick={() => editRole(role)}>
              Editar permisos
            </button>
          )
        }}
      />

      {success && <div className="notice notice-success role-feedback" role="status">{success}</div>}

      <div className="panel user-form-panel role-form-panel">
        <div className="user-form-header">
          <span className="eyebrow">{editingRoleId === null ? 'NUEVO PERFIL' : 'EDICIÓN DE ROL'}</span>
          <h2>{editingRoleId === null ? 'Crear rol' : `Editar ${form.nom_role}`}</h2>
          <p>Los permisos se validan en el backend, además de controlar el menú y las rutas del frontend.</p>
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
            <legend>Permisos por módulo</legend>
            <div className="role-permission-grid">
              {permissionGroups.map((group) => (
                <section className="role-permission-group" key={group}>
                  <h3>{group}</h3>
                  {permissionOptions.filter((permission) => permission.group === group).map((permission) => (
                    <label className="role-permission-option" key={permission.key}>
                      <input
                        type="checkbox"
                        checked={form.permisos.includes(permission.key)}
                        onChange={() => togglePermission(permission.key)}
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </section>
              ))}
            </div>
          </fieldset>

          {error && <div className="notice notice-error" role="alert"><strong>No se pudo guardar el rol.</strong><span>{error}</span></div>}

          <div className="user-form-actions">
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : editingRoleId === null ? 'Crear rol' : 'Guardar cambios'}
            </button>
            {editingRoleId !== null && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar</button>}
          </div>
        </form>
      </div>
    </section>
  )
}

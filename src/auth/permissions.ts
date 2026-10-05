export const permissionOptions = [
  { key: 'users.view', label: 'Consultar usuarios', group: 'Usuarios' },
  { key: 'users.create', label: 'Registrar usuarios', group: 'Usuarios' },
  { key: 'users.manage', label: 'Crear y editar usuarios, estados y contraseñas', group: 'Usuarios' },
  { key: 'roles.manage', label: 'Crear roles y asignar permisos', group: 'Roles' },
  { key: 'doctors.view', label: 'Consultar profesionales', group: 'Profesionales' },
  { key: 'doctors.manage', label: 'Registrar profesionales', group: 'Profesionales' },
  { key: 'doctors.link_user', label: 'Vincular cuenta de acceso al profesional', group: 'Profesionales' },
  { key: 'specialties.view', label: 'Consultar especialidades', group: 'Especialidades' },
  { key: 'specialties.manage', label: 'Crear especialidades', group: 'Especialidades' },
  { key: 'patients.view', label: 'Consultar pacientes', group: 'Pacientes' },
  { key: 'patients.manage', label: 'Registrar pacientes', group: 'Pacientes' },
  { key: 'appointments.view', label: 'Consultar citas', group: 'Citas' },
  { key: 'appointments.manage', label: 'Crear y reprogramar citas', group: 'Citas' },
  { key: 'audit.view', label: 'Consultar auditoría', group: 'Administración' },
  { key: 'my_patients.view', label: 'Consultar mis pacientes', group: 'Atención clínica' },
  { key: 'medical_history.view', label: 'Consultar historia clínica', group: 'Atención clínica' },
  { key: 'medical_history.manage', label: 'Crear historias y registrar/rectificar notas', group: 'Atención clínica' },
  { key: 'medical_history.delete', label: 'Archivar historias clínicas conservando las notas', group: 'Atención clínica' },
] as const

export type PermissionKey = (typeof permissionOptions)[number]['key']

export function hasPermission(granted: readonly string[], required: string): boolean {
  if (granted.includes(required)) return true
  if (!required.endsWith('.view')) return false
  const prefix = required.slice(0, -5)
  return granted.includes(`${prefix}.manage`) || granted.includes(`${prefix}.create`)
}

export function hasAnyPermission(granted: readonly string[], required: readonly string[]): boolean {
  return required.some((permission) => hasPermission(granted, permission))
}

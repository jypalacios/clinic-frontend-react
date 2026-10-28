import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Brand } from '../components/Brand'

const navigation = [
  { to: '/dashboard', label: 'Resumen', icon: '⌂' },
  { to: '/admin/users', label: 'Usuarios', icon: '♙', permission: 'users.view' },
  { to: '/admin/roles', label: 'Roles y permisos', icon: '⚿', permission: 'roles.manage' },
  { to: '/admin/doctors', label: 'Médicos y profesionales', icon: '✚', anyPermissions: ['doctors.view', 'specialties.view'] },
  { to: '/admin/audit', label: 'Auditoría', icon: '◷', permission: 'audit.view' },
  { to: '/assistant/patients', label: 'Gestión de pacientes', icon: '♧', permission: 'patients.view' },
  { to: '/assistant/appointments', label: 'Citas', icon: '▦', permission: 'appointments.view' },
  { to: '/assistant/ingreso', label: 'Ingreso', icon: '⇥', permission: 'appointments.manage' },
  { to: '/assistant/allergies', label: 'Alergias', icon: '✱', anyPermissions: ['allergy_types.view', 'allergies.view'] },
  { to: '/assistant/entities', label: 'Entidades', icon: '▣', permission: 'entities.view' },
  { to: '/doctor/patients', label: 'Mis pacientes', icon: '♧', permission: 'my_patients.view' },
  { to: '/doctor/history', label: 'Historia clínica', icon: '▤', permission: 'medical_history.view' },
  { to: '/doctor/consult', label: 'Consultas', icon: '☷', permission: 'consultations.view' },
]

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  assistant: 'Asistente',
  doctor: 'Médico',
  unknown: 'Usuario',
}

export function AppLayout() {
  const { user, role, hasPermission, logout } = useAuth()
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'
  const fullName = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.usuario || user?.email || 'Usuario'
  const displayRole = role === 'unknown' ? String(user?.role ?? user?.nom_role ?? 'Usuario') : roleLabels[role]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">ESPACIO DE TRABAJO</div>
        <nav className="main-nav" aria-label="Navegación principal">
          {navigation.filter((item) => (
            (!item.permission || hasPermission(item.permission))
            && (!item.anyPermissions || item.anyPermissions.some(hasPermission))
          )).map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.to === '/assistant/appointments' && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-bubble">?</span>
            <strong>¿Necesitas ayuda?</strong>
            <span>Contacta al administrador.</span>
          </div>
          <span className="sidebar-version">Clínica Software · v{appVersion}</span>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Clínica Software</span><span>/</span><strong>Panel de gestión</strong></div>
          <div className="topbar-user">
            <div className="user-avatar">{fullName.slice(0, 1).toUpperCase()}</div>
            <div className="user-info"><strong>{fullName}</strong><span>{displayRole}</span></div>
            <button className="logout-button" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">↪</button>
          </div>
        </header>
        <div className="content-area"><Outlet /></div>
      </main>
    </div>
  )
}

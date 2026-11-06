import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function ManagementPage() {
  const { hasPermission } = useAuth()
  const links = [
    hasPermission('entities.view') && {
      to: '/assistant/entities',
      icon: '▣',
      title: 'Entidades',
      text: 'Consulta y administra entidades, EPS y convenios.',
    },
    hasPermission('diagnoses.view') && {
      to: '/admin/diagnoses',
      icon: '✎',
      title: 'Diagnósticos',
      text: 'Accede al catálogo de diagnósticos clínicos.',
    },
    hasPermission('cups.view') && {
      to: '/admin/cups',
      icon: '☰',
      title: 'CUPS',
      text: 'Consulta y administra procedimientos y órdenes.',
    },
    (hasPermission('doctors.view') || hasPermission('specialties.view')) && {
      to: '/admin/doctors',
      icon: '✚',
      title: 'Médicos y profesionales',
      text: 'Gestiona el equipo clínico y sus especialidades.',
    },
    hasPermission('doctors.link_user') && {
      to: '/admin/doctors',
      icon: '♙',
      title: 'Vincular cuentas de usuarios',
      text: 'Asocia una cuenta activa con rol Médico a su perfil profesional.',
    },
    hasPermission('users.view') && {
      to: '/admin/users',
      icon: '♙',
      title: 'Usuarios',
      text: 'Consulta y administra los usuarios de la clínica.',
    },
    hasPermission('roles.manage') && {
      to: '/admin/roles',
      icon: '⚿',
      title: 'Roles y permisos',
      text: 'Configura los roles y sus permisos de acceso.',
    },
  ].filter((link) => link !== false)

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN</span>
          <h1>Management</h1>
          <p>Accede a los catálogos y herramientas de administración de la clínica.</p>
        </div>
      </div>
      <div className="management-links">
        {links.map((link) => (
          <Link className="management-link panel" key={link.to} to={link.to}>
            <span className="quick-link-icon" aria-hidden="true">{link.icon}</span>
            <span className="management-link-copy">
              <strong>{link.title}</strong>
              <small>{link.text}</small>
            </span>
            <span className="quick-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

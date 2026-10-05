export function AuditPage() {
  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">ADMINISTRACIÓN</span><h1>Auditoría</h1><p>Seguimiento de actividad y cambios realizados en el sistema.</p></div>
      </div>
      <div className="panel empty-state audit-placeholder">
        <span className="empty-icon" aria-hidden="true">◷</span>
        <strong>Auditoría aún no disponible</strong>
        <span>La API documentada no incluye un endpoint de auditoría. Esta sección estará lista para conectarse cuando se publique.</span>
      </div>
    </section>
  )
}

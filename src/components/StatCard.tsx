export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = 'blue',
}: {
  label: string
  value: string
  helper: string
  icon: string
  tone?: 'blue' | 'green' | 'violet' | 'orange'
}) {
  return (
    <article className="stat-card">
      <span className={`stat-icon tone-${tone}`} aria-hidden="true">{icon}</span>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  )
}

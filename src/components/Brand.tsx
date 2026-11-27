import logo from '../pages/images/logo.jpeg'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? ' brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <img src={logo} alt="" />
      </span>
      {!compact && <span>Gestion<span className="brand-light">Clinica</span></span>}
    </div>
  )
}

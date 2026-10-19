import logo from '../pages/images/logo.jpeg'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? ' brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <img src={logo} alt="" />
      </span>
      {!compact && <span>Diana<span className="brand-light">Libreros</span></span>}
    </div>
  )
}

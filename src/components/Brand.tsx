export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? ' brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M16 5v22M5 16h22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      {!compact && <span>Diana<span className="brand-light">Libreros</span></span>}
    </div>
  )
}

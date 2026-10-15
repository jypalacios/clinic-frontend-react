import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Brand } from '../components/Brand'

export function LoginPage() {
  const { user, authError, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-decoration decoration-one" />
      <div className="login-decoration decoration-two" />
      <section className="login-card">
        <Brand />
        <span className="eyebrow login-eyebrow">TU CLÍNICA, EN UN SOLO LUGAR</span>
        <h1>Bienvenido de nuevo</h1>
        <p className="login-description">Ingresa a tu espacio de trabajo para continuar.</p>
        {authError && <div className="notice notice-error login-error" role="alert">{authError}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="nombre@clinica.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <div className="notice notice-error login-error" role="alert">{error}</div>}
          <button className="button button-primary login-submit" type="submit" disabled={submitting}>
            {submitting ? 'Validando acceso…' : 'Iniciar sesión'} <span aria-hidden="true">→</span>
          </button>
        </form>
        <div className="version-info"><span>Version {import.meta.env.VITE_APP_VERSION || '1.0.0'}</span></div>
        <div className="login-security"><span aria-hidden="true">▣</span> Acceso seguro para el personal autorizado</div>
      </section>
      <footer className="login-footer">© {new Date().getFullYear()} Clínica Software · Plataforma de gestión clínica</footer>
    </main>
  )
}

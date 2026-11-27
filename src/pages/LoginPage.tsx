import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Brand } from '../components/Brand'

export function LoginPage() {
  const { user, authError, login } = useAuth()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'request' | 'confirm'>('login')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(usuario.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  function changeMode(nextMode: 'login' | 'request' | 'confirm') {
    setMode(nextMode)
    setError(null)
    setMessage(null)
    setTemporaryPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function handleRecoveryRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await apiRequest('/auth/password-recovery', {
        method: 'POST',
        body: JSON.stringify({ usuario: usuario.trim() }),
      })
      changeMode('confirm')
      setMessage('Si el usuario existe, recibirá una contraseña temporal en su correo. Es válida por 15 minutos.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible solicitar la recuperación.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRecoveryConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    setSubmitting(true)
    try {
      await apiRequest('/auth/password-recovery/confirm', {
        method: 'POST',
        body: JSON.stringify({
          usuario: usuario.trim(),
          temporary_password: temporaryPassword,
          new_password: newPassword,
        }),
      })
      changeMode('login')
      setPassword('')
      setMessage('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible actualizar la contraseña.')
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
        <h1>{mode === 'login' ? 'Bienvenido de nuevo' : 'Recuperar contraseña'}</h1>
        <p className="login-description">
          {mode === 'login' ? 'Ingresa a tu espacio de trabajo para continuar.' : mode === 'request'
            ? 'Ingresa tu nombre de usuario para recibir una contraseña temporal en tu correo registrado.'
            : 'Ingresa tu contraseña temporal y elige una nueva contraseña.'}
        </p>
        {mode === 'login' && authError && <div className="notice notice-error login-error" role="alert">{authError}</div>}
        {message && <div className="notice notice-success login-error" role="status">{message}</div>}
        <form onSubmit={mode === 'login' ? handleSubmit : mode === 'request' ? handleRecoveryRequest : handleRecoveryConfirm} className="login-form">
          <label htmlFor="usuario">Nombre de usuario</label>
          <input
            id="usuario"
            type="text"
            autoComplete="username"
            placeholder="Ingresa tu nombre de usuario"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            maxLength={50}
            required
          />
          {mode === 'login' && <>
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete="current-password"
              placeholder="Ingresa tu contraseña" value={password}
              onChange={(event) => setPassword(event.target.value)} required />
          </>}
          {mode === 'confirm' && <>
            <label htmlFor="temporary-password">Contraseña temporal</label>
            <input id="temporary-password" type="password" autoComplete="one-time-code"
              value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)}
              maxLength={128} required />
            <label htmlFor="new-password">Nueva contraseña</label>
            <input id="new-password" type="password" autoComplete="new-password"
              value={newPassword} onChange={(event) => setNewPassword(event.target.value)}
              minLength={8} maxLength={128} required />
            <label htmlFor="confirm-password">Confirmar nueva contraseña</label>
            <input id="confirm-password" type="password" autoComplete="new-password"
              value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8} maxLength={128} required />
          </>}
          {error && <div className="notice notice-error login-error" role="alert">{error}</div>}
          <button className="button button-primary login-submit" type="submit" disabled={submitting}>
            {submitting ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : mode === 'request' ? 'Enviar contraseña temporal' : 'Cambiar contraseña'} <span aria-hidden="true">→</span>
          </button>
          {mode === 'login' && <button className="text-button" type="button" onClick={() => changeMode('request')}>¿Olvidaste tu contraseña?</button>}
          {mode === 'request' && <button className="text-button" type="button" onClick={() => changeMode('confirm')}>Ya tengo una contraseña temporal</button>}
          {mode !== 'login' && <button className="text-button" type="button" onClick={() => changeMode('login')}>Volver al inicio de sesión</button>}
        </form>
        <div className="sidebar-bottom">
          <div className="help-card">{/* ... */}</div>
          <div className="version-info"><span>Version {import.meta.env.VITE_APP_VERSION || '1.0.0'}</span></div>
        </div>
        <div className="login-security"><span aria-hidden="true">▣</span> Acceso seguro para el personal autorizado</div>
      </section>
      <footer className="login-footer">© {new Date().getFullYear()} Clínica Software · Plataforma de gestión clínica</footer>
    </main>
  )
}

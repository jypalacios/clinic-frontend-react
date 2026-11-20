import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { useAuth } from '../../auth/AuthContext'
import { ResourceTable } from '../../components/ResourceTable'

interface RevisionSystem {
  id_revision_sistema: number
  det_revision_sistemas: string
  usuario_creacion: string
  usuario_modificacion: string | null
}

export function RevisionSystemsPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('revision_systems.manage')
  const systems = useResource<RevisionSystem[]>('/revision-sistemas')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      await apiRequest('/revision-sistemas', {
        method: 'POST',
        body: JSON.stringify({ det_revision_sistemas: detail.trim() }),
      })
      setDetail('')
      setFeedback('Ítem de revisión por sistemas creado correctamente.')
      systems.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible crear el ítem.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      {canManage && (
        <div className="panel user-form-panel">
          <h2>Nuevo ítem de revisión</h2>
          <form className="user-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="revision-system-detail">Descripción</label>
              <input
                id="revision-system-detail"
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                maxLength={255}
                required
                disabled={submitting}
              />
            </div>
            {error && <div className="notice notice-error" role="alert">{error}</div>}
            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={submitting || !detail.trim()}>
                {submitting ? 'Guardando…' : 'Crear ítem'}
              </button>
            </div>
          </form>
          {feedback && <div className="notice notice-success" role="status">{feedback}</div>}
        </div>
      )}
      <ResourceTable
        title="Revisión por sistemas"
        description="Consulta y administra los ítems disponibles para la revisión por sistemas."
        resource={systems}
        columns={[
          { key: 'id_revision_sistema', label: 'ID' },
          { key: 'det_revision_sistemas', label: 'Descripción' },
          { key: 'usuario_creacion', label: 'Creado por' },
          { key: 'usuario_modificacion', label: 'Modificado por' },
        ]}
        emptyMessage="No hay ítems de revisión por sistemas registrados."
        pageSize={10}
      />
    </section>
  )
}

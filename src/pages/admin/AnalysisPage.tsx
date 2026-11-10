import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { useAuth } from '../../auth/AuthContext'
import { ResourceTable } from '../../components/ResourceTable'

interface AppointmentType {
  id_tipo_appointment: number
  nom_tipo_appointment: string
}

interface Detail {
  id_hc_detalle: number
  detalle: string
  general: string
}

interface Assignment {
  id_hc_appointment: number
  id_tipo_appointment: number
  id_hc_detalle: number
  det_hc_general: string
}

function AssignmentsTable({ typeId, canManage, submitting, onEdit }: {
  typeId: string
  canManage: boolean
  submitting: boolean
  onEdit: (id: number, detailId: number) => void
}) {
  const assignments = useResource<Assignment[]>(`/analysis/assignments?type_id=${encodeURIComponent(typeId)}`)
  return (
    <ResourceTable
      title="Detalles asociados"
      description="Detalles de historia clínica del tipo de cita seleccionado."
      resource={assignments}
      columns={[{ key: 'det_hc_general', label: 'Detalle de historia clínica' }]}
      emptyMessage="No hay detalles asociados a este tipo de cita."
      pageSize={10}
      actions={canManage ? (row) => (
        <button className="action-button action-button-edit" type="button" disabled={submitting} onClick={() => {
          if (typeof row.id_hc_appointment === 'number' && typeof row.id_hc_detalle === 'number') {
            onEdit(row.id_hc_appointment, row.id_hc_detalle)
          }
        }}>Editar</button>
      ) : undefined}
    />
  )
}

export function AnalysisPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('analysis.manage')
  const types = useResource<AppointmentType[]>('/analysis/types')
  const details = useResource<Detail[]>('/analysis/details')
  const [typeId, setTypeId] = useState('')
  const [revision, setRevision] = useState(0)
  const [detailId, setDetailId] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  function changeType(value: string) {
    setTypeId(value)
    setDetailId('')
    setEditingId(null)
    setError(null)
    setFeedback(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      await apiRequest(
        editingId === null ? '/analysis/assignments' : `/analysis/assignments/${editingId}`,
        {
          method: editingId === null ? 'POST' : 'PUT',
          body: JSON.stringify({ id_tipo_appointment: Number(typeId), id_hc_detalle: Number(detailId) }),
        },
      )
      setFeedback(editingId === null ? 'Asociación creada correctamente.' : 'Asociación actualizada correctamente.')
      setDetailId('')
      setEditingId(null)
      setRevision((value) => value + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la asociación.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GESTIÓN CLÍNICA</span>
          <h1>Análisis</h1>
          <p>Asocia los detalles de historia clínica con cada tipo de cita.</p>
        </div>
      </div>
      <div className="panel user-form-panel">
        {types.error && <div className="notice notice-error" role="alert">No se pudieron cargar los tipos de cita: {types.error} <button type="button" className="text-button" onClick={types.reload}>Reintentar</button></div>}
        {details.error && <div className="notice notice-error" role="alert">No se pudieron cargar los detalles: {details.error} <button type="button" className="text-button" onClick={details.reload}>Reintentar</button></div>}
        <div className="field">
          <label htmlFor="analysis-type">Tipo de cita</label>
          <select id="analysis-type" value={typeId} onChange={(event) => changeType(event.target.value)} disabled={types.loading || !!types.error || submitting}>
            <option value="">{types.loading ? 'Cargando tipos…' : 'Selecciona un tipo de cita'}</option>
            {types.data?.map((type) => <option key={type.id_tipo_appointment} value={type.id_tipo_appointment}>{type.nom_tipo_appointment}</option>)}
          </select>
        </div>
        {typeId && canManage && (
          <form className="user-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="analysis-detail">Detalle de historia clínica</label>
              <select id="analysis-detail" value={detailId} onChange={(event) => setDetailId(event.target.value)} required disabled={details.loading || !!details.error || submitting}>
                <option value="">{details.loading ? 'Cargando detalles…' : 'Selecciona un detalle'}</option>
                {details.data?.map((detail) => <option key={detail.id_hc_detalle} value={detail.id_hc_detalle}>{detail.general} — {detail.detalle}</option>)}
              </select>
            </div>
            {error && <div className="notice notice-error" role="alert">{error}</div>}
            <div className="user-form-actions">
              {editingId !== null && <button className="button button-secondary" type="button" disabled={submitting} onClick={() => { setEditingId(null); setDetailId(''); setError(null) }}>Cancelar edición</button>}
              <button className="button button-primary" type="submit" disabled={submitting || !detailId || details.loading || !!details.error}>
                {submitting ? 'Guardando…' : editingId === null ? 'Agregar detalle' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
        {feedback && <div className="notice notice-success" role="status">{feedback}</div>}
      </div>
      {typeId && (
        <AssignmentsTable
          key={`${typeId}-${revision}`}
          typeId={typeId}
          canManage={canManage}
          submitting={submitting}
          onEdit={(id, selectedDetailId) => {
            setEditingId(id)
            setDetailId(String(selectedDetailId))
            setError(null)
            setFeedback(null)
          }}
        />
      )}
    </section>
  )
}

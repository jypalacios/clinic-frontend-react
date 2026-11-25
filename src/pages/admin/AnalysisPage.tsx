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
  id_hc_general: number
  detalle: string
}

interface Group {
  id_hcgeneral: number
  det_hcgeneral: string
}

interface Assignment {
  id_hc_appointment: number
  id_tipo_appointment: number
  id_hc_detalle: number
  det_hc_general: string
}

function CreateDetailModal({ types, groups, initialTypeId, initialGroupId, onClose, onCreated }: {
  types: AppointmentType[]
  groups: Group[]
  initialTypeId: string
  initialGroupId: string
  onClose: () => void
  onCreated: (typeId: string, groupId: string) => void
}) {
  const [typeId, setTypeId] = useState(initialTypeId)
  const [groupId, setGroupId] = useState(initialGroupId)
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await apiRequest('/analysis/details', {
        method: 'POST',
        body: JSON.stringify({
          id_tipo_appointment: Number(typeId),
          id_hc_general: Number(groupId),
          detalle: detail.trim(),
        }),
      })
      onCreated(typeId, groupId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible crear el detalle.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose() }}>
      <div className="panel user-form-panel modal-dialog" role="dialog" aria-modal="true" aria-labelledby="create-analysis-detail-title" onKeyDown={(event) => {
        if (event.key === 'Escape' && !submitting) onClose()
      }}>
        <div className="user-form-header">
          <div>
            <h2 id="create-analysis-detail-title">Nuevo detalle de análisis</h2>
            <p>El detalle se creará en el grupo y se asociará al tipo de cita seleccionado.</p>
          </div>
        </div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <form className="user-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="new-analysis-type">Tipo de cita</label>
            <select id="new-analysis-type" value={typeId} onChange={(event) => { setTypeId(event.target.value); setGroupId('') }} required disabled={submitting} autoFocus>
              <option value="">Selecciona un tipo de cita</option>
              {types.map((type) => <option key={type.id_tipo_appointment} value={type.id_tipo_appointment}>{type.nom_tipo_appointment}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="new-analysis-group">Grupo de análisis</label>
            <select id="new-analysis-group" value={groupId} onChange={(event) => setGroupId(event.target.value)} required disabled={!typeId || submitting}>
              <option value="">Selecciona un grupo</option>
              {groups.map((group) => <option key={group.id_hcgeneral} value={group.id_hcgeneral}>{group.det_hcgeneral}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="new-analysis-detail">Detalle de análisis</label>
            <input id="new-analysis-detail" value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={255} required disabled={!groupId || submitting} />
          </div>
          <div className="user-form-actions">
            <button className="button button-secondary" type="button" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button className="button button-primary" type="submit" disabled={!typeId || !groupId || !detail.trim() || submitting}>
              {submitting ? 'Guardando…' : 'Crear y asociar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssignmentsTable({ typeId, groupId, canManage, submitting, onEdit }: {
  typeId: string
  groupId: string
  canManage: boolean
  submitting: boolean
  onEdit: (id: number, detailId: number) => void
}) {
  const assignments = useResource<Assignment[]>(`/analysis/assignments?type_id=${encodeURIComponent(typeId)}&group_id=${encodeURIComponent(groupId)}`)
  return (
    <ResourceTable
      title="Detalles asociados"
      description="Detalles asociados al tipo de cita y grupo seleccionados."
      resource={assignments}
      columns={[{ key: 'det_hc_general', label: 'Detalle de historia clínica' }]}
      emptyMessage="No hay detalles asociados a este tipo de cita y grupo."
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
  const groups = useResource<Group[]>('/analysis/groups')
  const details = useResource<Detail[]>('/analysis/details')
  const [typeId, setTypeId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [revision, setRevision] = useState(0)
  const [detailId, setDetailId] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [creatingDetail, setCreatingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  function changeType(value: string) {
    setTypeId(value)
    setGroupId('')
    setDetailId('')
    setError(null)
    setFeedback(null)
  }

  function changeGroup(value: string) {
    setGroupId(value)
    setDetailId('')
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
        {canManage && <button className="button button-primary" type="button" disabled={types.loading || !!types.error || groups.loading || !!groups.error || submitting} onClick={() => setCreatingDetail(true)}>Nuevo detalle</button>}
      </div>
      <div className="panel user-form-panel">
        {types.error && <div className="notice notice-error" role="alert">No se pudieron cargar los tipos de cita: {types.error} <button type="button" className="text-button" onClick={types.reload}>Reintentar</button></div>}
        {groups.error && <div className="notice notice-error" role="alert">No se pudieron cargar los grupos: {groups.error} <button type="button" className="text-button" onClick={groups.reload}>Reintentar</button></div>}
        {details.error && <div className="notice notice-error" role="alert">No se pudieron cargar los detalles: {details.error} <button type="button" className="text-button" onClick={details.reload}>Reintentar</button></div>}
        {editingId !== null && <p>Editando asociación. Selecciona el tipo de cita, el grupo y el detalle.</p>}
        <div className="field">
          <label htmlFor="analysis-type">Tipo de cita</label>
          <select id="analysis-type" value={typeId} onChange={(event) => changeType(event.target.value)} disabled={types.loading || !!types.error || submitting}>
            <option value="">{types.loading ? 'Cargando tipos…' : 'Selecciona un tipo de cita'}</option>
            {types.data?.map((type) => <option key={type.id_tipo_appointment} value={type.id_tipo_appointment}>{type.nom_tipo_appointment}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="analysis-group">Grupo de análisis</label>
          <select id="analysis-group" value={groupId} onChange={(event) => changeGroup(event.target.value)} disabled={!typeId || groups.loading || !!groups.error || submitting}>
            <option value="">{groups.loading ? 'Cargando grupos…' : 'Selecciona un grupo'}</option>
            {groups.data?.map((group) => <option key={group.id_hcgeneral} value={group.id_hcgeneral}>{group.det_hcgeneral}</option>)}
          </select>
        </div>
        {typeId && groupId && canManage && (
          <form className="user-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="analysis-detail">Detalle de historia clínica</label>
              <select id="analysis-detail" value={detailId} onChange={(event) => setDetailId(event.target.value)} required disabled={details.loading || !!details.error || submitting}>
                <option value="">{details.loading ? 'Cargando detalles…' : 'Selecciona un detalle'}</option>
                {details.data?.filter((detail) => String(detail.id_hc_general) === groupId).map((detail) => <option key={detail.id_hc_detalle} value={detail.id_hc_detalle}>{detail.detalle}</option>)}
              </select>
            </div>
            {error && <div className="notice notice-error" role="alert">{error}</div>}
            <div className="user-form-actions">
              <button className="button button-primary" type="submit" disabled={submitting || !detailId || details.loading || !!details.error}>
                {submitting ? 'Guardando…' : editingId === null ? 'Agregar detalle' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
        {editingId !== null && <button className="button button-secondary" type="button" disabled={submitting} onClick={() => { setEditingId(null); setDetailId(''); setError(null) }}>Cancelar edición</button>}
        {feedback && <div className="notice notice-success" role="status">{feedback}</div>}
      </div>
      {typeId && groupId && (
        <AssignmentsTable
          key={`${typeId}-${groupId}-${revision}`}
          typeId={typeId}
          groupId={groupId}
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
      {creatingDetail && (
        <CreateDetailModal
          types={types.data ?? []}
          groups={groups.data ?? []}
          initialTypeId={typeId}
          initialGroupId={groupId}
          onClose={() => setCreatingDetail(false)}
          onCreated={(selectedTypeId, selectedGroupId) => {
            setTypeId(selectedTypeId)
            setGroupId(selectedGroupId)
            setDetailId('')
            setEditingId(null)
            setError(null)
            setCreatingDetail(false)
            setFeedback('Detalle creado y asociado correctamente.')
            details.reload()
            setRevision((value) => value + 1)
          }}
        />
      )}
    </section>
  )
}

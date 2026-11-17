import { useState, type FormEvent } from 'react'
import { apiRequest } from '../../api/client'
import { useResource } from '../../api/hooks'
import { useAuth } from '../../auth/AuthContext'
import { ResourceTable } from '../../components/ResourceTable'

interface Antecedent {
  id_cli_antecedente: number
  det_cli_antecedente: string
}

interface Specialty {
  id_espect: number
  nom_espect: string
}

interface SubAntecedent {
  id_sub_antecedente: number
  id_cli_antecedente: number
  det_sub_antecedente: string
  id_espect: number
  det_cli_antecedente: string
  nom_espect: string
}

export function AntecedentsPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('antecedents.manage')
  const antecedents = useResource<Antecedent[]>('/antecedents')
  const specialties = useResource<Specialty[]>('/antecedents/specialties')
  const items = useResource<SubAntecedent[]>('/antecedents/items')
  const [antecedentId, setAntecedentId] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [antecedentFilter, setAntecedentFilter] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [detail, setDetail] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const filteredItems = {
    ...items,
    data: items.data?.filter((item) =>
      (!antecedentFilter || String(item.id_cli_antecedente) === antecedentFilter)
      && (!specialtyFilter || String(item.id_espect) === specialtyFilter),
    ) ?? null,
  }

  function resetForm() {
    setAntecedentId('')
    setSpecialtyId('')
    setDetail('')
    setEditingId(null)
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      await apiRequest(editingId === null ? '/antecedents/items' : `/antecedents/items/${editingId}`, {
        method: editingId === null ? 'POST' : 'PUT',
        body: JSON.stringify({
          id_cli_antecedente: Number(antecedentId),
          id_espect: Number(specialtyId),
          det_sub_antecedente: detail.trim(),
        }),
      })
      setFeedback(editingId === null ? 'Subantecedente creado correctamente.' : 'Subantecedente actualizado correctamente.')
      resetForm()
      items.reload()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el subantecedente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      {canManage && (
        <div className="panel user-form-panel">
          <h2>{editingId === null ? 'Nuevo subantecedente' : 'Editar subantecedente'}</h2>
          {antecedents.error && <div className="notice notice-error" role="alert">No se pudieron cargar los antecedentes: {antecedents.error} <button type="button" className="text-button" onClick={antecedents.reload}>Reintentar</button></div>}
          {specialties.error && <div className="notice notice-error" role="alert">No se pudieron cargar las especialidades: {specialties.error} <button type="button" className="text-button" onClick={specialties.reload}>Reintentar</button></div>}
          <form className="user-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="antecedent-category">Antecedente</label>
              <select id="antecedent-category" value={antecedentId} onChange={(event) => setAntecedentId(event.target.value)} required disabled={submitting || antecedents.loading || !!antecedents.error}>
                <option value="">{antecedents.loading ? 'Cargando antecedentes…' : 'Selecciona un antecedente'}</option>
                {antecedents.data?.map((item) => <option key={item.id_cli_antecedente} value={item.id_cli_antecedente}>{item.det_cli_antecedente}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="antecedent-specialty">Especialidad</label>
              <select id="antecedent-specialty" value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} required disabled={submitting || specialties.loading || !!specialties.error}>
                <option value="">{specialties.loading ? 'Cargando especialidades…' : 'Selecciona una especialidad'}</option>
                {specialties.data?.map((item) => <option key={item.id_espect} value={item.id_espect}>{item.nom_espect}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="antecedent-detail">Detalle</label>
              <input id="antecedent-detail" value={detail} onChange={(event) => setDetail(event.target.value)} required disabled={submitting} />
            </div>
            {error && <div className="notice notice-error" role="alert">{error}</div>}
            <div className="user-form-actions">
              {editingId !== null && <button className="button button-secondary" type="button" disabled={submitting} onClick={resetForm}>Cancelar edición</button>}
              <button className="button button-primary" type="submit" disabled={submitting || !antecedentId || !specialtyId || !detail.trim() || antecedents.loading || specialties.loading || !!antecedents.error || !!specialties.error}>
                {submitting ? 'Guardando…' : editingId === null ? 'Crear subantecedente' : 'Guardar cambios'}
              </button>
            </div>
          </form>
          {feedback && <div className="notice notice-success" role="status">{feedback}</div>}
        </div>
      )}
      <ResourceTable
        title="Antecedentes"
        description="Consulta y administra los subantecedentes por categoría y especialidad."
        resource={filteredItems}
        columns={[
          { key: 'det_cli_antecedente', label: 'Antecedente' },
          { key: 'nom_espect', label: 'Especialidad' },
          { key: 'det_sub_antecedente', label: 'Detalle' },
        ]}
        emptyMessage={antecedentFilter || specialtyFilter ? 'No hay subantecedentes para los filtros seleccionados.' : 'No hay subantecedentes registrados.'}
        pageSize={10}
        paginationResetKey={`${antecedentFilter}:${specialtyFilter}`}
        filters={(
          <>
            {antecedents.error && <div className="notice notice-error" role="alert">No se pudieron cargar los antecedentes: {antecedents.error} <button type="button" className="text-button" onClick={antecedents.reload}>Reintentar</button></div>}
            {specialties.error && <div className="notice notice-error" role="alert">No se pudieron cargar las especialidades: {specialties.error} <button type="button" className="text-button" onClick={specialties.reload}>Reintentar</button></div>}
            <div className="table-filters">
              <div className="field">
                <label htmlFor="filter-antecedent">Antecedente</label>
                <select id="filter-antecedent" value={antecedentFilter} onChange={(event) => setAntecedentFilter(event.target.value)} disabled={antecedents.loading || !!antecedents.error}>
                  <option value="">{antecedents.loading ? 'Cargando antecedentes…' : 'Todos los antecedentes'}</option>
                  {antecedents.data?.map((item) => <option key={item.id_cli_antecedente} value={item.id_cli_antecedente}>{item.det_cli_antecedente}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="filter-specialty">Especialidad</label>
                <select id="filter-specialty" value={specialtyFilter} onChange={(event) => setSpecialtyFilter(event.target.value)} disabled={specialties.loading || !!specialties.error}>
                  <option value="">{specialties.loading ? 'Cargando especialidades…' : 'Todas las especialidades'}</option>
                  {specialties.data?.map((item) => <option key={item.id_espect} value={item.id_espect}>{item.nom_espect}</option>)}
                </select>
              </div>
              <button className="button button-secondary" type="button" onClick={() => { setAntecedentFilter(''); setSpecialtyFilter('') }}>
                Restablecer
              </button>
            </div>
          </>
        )}
        actions={canManage ? (row) => (
          <button className="action-button action-button-edit" type="button" disabled={submitting} onClick={() => {
            if (typeof row.id_sub_antecedente === 'number' && typeof row.id_cli_antecedente === 'number' && typeof row.id_espect === 'number' && typeof row.det_sub_antecedente === 'string') {
              setEditingId(row.id_sub_antecedente)
              setAntecedentId(String(row.id_cli_antecedente))
              setSpecialtyId(String(row.id_espect))
              setDetail(row.det_sub_antecedente)
              setError(null)
              setFeedback(null)
            }
          }}>Editar</button>
        ) : undefined}
      />
    </section>
  )
}

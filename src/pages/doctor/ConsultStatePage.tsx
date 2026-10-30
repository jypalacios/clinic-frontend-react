import { Navigate, useParams } from 'react-router-dom'
import { ClinicalRecordsPage } from './ClinicalRecordsPage'
import { consultAccess } from './ConsultPage'

export function ConsultStatePage() {
  const { patientId } = useParams()
  const id = Number(patientId)
  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/doctor/consult" replace />
  return <ClinicalRecordsPage access={consultAccess} focusPatientId={id} />
}

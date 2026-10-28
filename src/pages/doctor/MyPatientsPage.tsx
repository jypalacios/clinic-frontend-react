import { useResource } from '../../api/hooks'
import { ResourceTable } from '../../components/ResourceTable'

interface PatientRecord {
  id_patients?: number
  ced_patients?: string
  nom_patients?: string
  ape_patients?: string
  telefono?: string
  email?: string
  nom_entidad?: string
}

export function MyPatientsPage() {
  const resource = useResource<PatientRecord[] | { items?: PatientRecord[] }>('/patients/')
  return <ResourceTable title="Mis pacientes" description="Pacientes disponibles para consulta según tu acceso clínico." resource={resource} columns={[
    { key: 'ced_patients', label: 'Identificación' },
    { key: 'nom_patients', label: 'Nombre' },
    { key: 'ape_patients', label: 'Apellido' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'email', label: 'Correo electrónico' },
    { key: 'nom_entidad', label: 'Entidad' },
  ]} emptyMessage="No hay pacientes para mostrar." />
}

import { ClinicalRecordsPage } from './ClinicalRecordsPage'

export function ConsultPage() {
  return <ClinicalRecordsPage access={{
    title: 'Consultas',
    entityName: 'consulta',
    pluralEntityName: 'consultas',
    readOnlyDescription: 'Consulta la información clínica de las consultas de tus pacientes.',
    createDescription: 'La consulta se vincula a un paciente con cita asignada y al médico autenticado.',
    filterToScheduledPatients: true,
    appointmentPatientAction: true,
    createInModal: true,
    createPermission: 'consultations.create',
    editPermission: 'consultations.edit',
  }} />
}

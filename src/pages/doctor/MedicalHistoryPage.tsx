import { ClinicalRecordsPage } from './ClinicalRecordsPage'

export function MedicalHistoryPage() {
  return <ClinicalRecordsPage access={{
    title: 'Historias clínicas',
    entityName: 'historia clínica',
    pluralEntityName: 'historias clínicas',
    readOnlyDescription: 'Consulta el estado de las historias clínicas. El archivo conserva todas sus notas.',
    createDescription: 'El médico tratante se toma de la cuenta autenticada; una historia por paciente.',
    createPermission: 'medical_history.manage',
    editPermission: 'medical_history.manage',
    archivePermission: 'medical_history.delete',
  }} />
}

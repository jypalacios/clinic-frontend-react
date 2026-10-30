import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { AppLayout } from '../layouts/AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { UsersPage } from '../pages/admin/UsersPage'
import { RolesPage } from '../pages/admin/RolesPage'
import { DoctorsPage } from '../pages/admin/DoctorsPage'
import { AuditPage } from '../pages/admin/AuditPage'
import { CupsPage } from '../pages/admin/CupsPage'
import { PatientsPage } from '../pages/assistant/PatientsPage'
import { AppointmentsPage } from '../pages/assistant/AppointmentsPage'
import { IngresoPage } from '../pages/assistant/IngresoPage'
import { AllergiesPage } from '../pages/assistant/AllergiesPage'
import { EntitiesPage } from '../pages/assistant/EntitiesPage'
import { MyPatientsPage } from '../pages/doctor/MyPatientsPage'
import { MedicalHistoryPage } from '../pages/doctor/MedicalHistoryPage'
import { ConsultPage } from '../pages/doctor/ConsultPage'
import { ConsultStatePage } from '../pages/doctor/ConsultStatePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route element={<ProtectedRoute permission="users.view" />}>
            <Route path="/admin/users" element={<UsersPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="roles.manage" />}>
            <Route path="/admin/roles" element={<RolesPage />} />
          </Route>
          <Route element={<ProtectedRoute anyPermissions={['doctors.view', 'specialties.view']} />}>
            <Route path="/admin/doctors" element={<DoctorsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="audit.view" />}>
            <Route path="/admin/audit" element={<AuditPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="cups.view" />}>
            <Route path="/admin/cups" element={<CupsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="patients.view" />}>
            <Route path="/assistant/patients" element={<PatientsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="appointments.view" />}>
            <Route path="/assistant/appointments" element={<AppointmentsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="appointments.manage" />}>
            <Route path="/assistant/ingreso" element={<IngresoPage />} />
          </Route>
          <Route element={<ProtectedRoute anyPermissions={['allergy_types.view', 'allergies.view']} />}>
            <Route path="/assistant/allergies" element={<AllergiesPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="entities.view" />}>
            <Route path="/assistant/entities" element={<EntitiesPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="my_patients.view" />}>
            <Route path="/doctor/patients" element={<MyPatientsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="medical_history.view" />}>
            <Route path="/doctor/history" element={<MedicalHistoryPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="consultations.view" />}>
            <Route path="/doctor/consult" element={<ConsultPage />} />
            <Route path="/doctor/consult-state/:patientId" element={<ConsultStatePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

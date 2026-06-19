import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import DashboardPage from '@/pages/DashboardPage'
import NewAuditPage from '@/pages/NewAuditPage'
import ReviewPage from '@/pages/ReviewPage'
import WorkflowsPage from '@/pages/WorkflowsPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            element={
              <AuthGuard>
                <AppShell />
              </AuthGuard>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="audit/new" element={<NewAuditPage />} />
            <Route path="audit/:auditId/review" element={<ReviewPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="workflows/:workflowId" element={<WorkflowsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}

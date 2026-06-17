import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CompaniesPage from './pages/CompaniesPage'
import WorkspacePage from './pages/WorkspacePage'
import FinancialsPage from './pages/FinancialsPage'
import CommodityPage from './pages/CommodityPage'
import ScenarioPage from './pages/ScenarioPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return isAuthenticated ? <Navigate to="/overview" replace /> : <Navigate to="/login" replace />
}

function ScenarioRedirect() {
  return <Navigate to="/workspace" replace />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/overview" element={<DashboardPage />} />
              <Route path="/workspace" element={<CompaniesPage />} />
              <Route path="/workspace/:id" element={<WorkspacePage />} />
              <Route path="/financials/:companyId" element={<FinancialsPage />} />
              <Route path="/commodities" element={<CommodityPage />} />
              <Route path="/scenarios" element={<ScenarioRedirect />} />
              <Route path="/scenarios/:companyId" element={<ScenarioPage />} />

              <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/companies/:id" element={<WorkspacePage />} />
              <Route path="/commodity" element={<Navigate to="/commodities" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
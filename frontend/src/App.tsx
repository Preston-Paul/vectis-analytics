import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
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

import TradingHomePage from './pages/trading/TradingHomePage'
import OptionsLabPage from './pages/trading/OptionsLabPage'
import VolatilityPage from './pages/trading/VolatilityPage'
import MonteCarloPage from './pages/trading/MonteCarloPage'
import StrategiesPage from './pages/trading/StrategiesPage'
import PortfolioPage from './pages/trading/PortfolioPage'
import FlowPage from './pages/trading/FlowPage'

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

function LegacyCompanyRedirect() {
  const { id } = useParams()
  return <Navigate to={id ? `/workspace/${id}` : '/workspace'} replace />
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

              <Route path="/trading" element={<TradingHomePage />} />
              <Route path="/trading/options" element={<OptionsLabPage />} />
              <Route path="/trading/volatility" element={<VolatilityPage />} />
              <Route path="/trading/monte-carlo" element={<MonteCarloPage />} />
              <Route path="/trading/strategies" element={<StrategiesPage />} />
              <Route path="/trading/portfolio" element={<PortfolioPage />} />
              <Route path="/trading/flow" element={<FlowPage />} />

              <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
              <Route path="/companies" element={<Navigate to="/workspace" replace />} />
              <Route path="/companies/:id" element={<LegacyCompanyRedirect />} />
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
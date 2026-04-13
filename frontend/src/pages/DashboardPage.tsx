import { Link } from 'react-router-dom'
import { Building2, BarChart2, DollarSign, TrendingUp, PlusCircle, ArrowRight, FlaskConical } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import api from '../lib/api'
import type { Company, FinancialPeriod } from '../types'

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

async function fetchCompanies(): Promise<Company[]> {
  const res = await api.get('/companies')
  return res.data
}

async function fetchAllPeriods(companies: Company[]): Promise<FinancialPeriod[]> {
  const results = await Promise.all(
    companies.map((c) => api.get(`/financials/${c.id}/periods`).then((r) => r.data as FinancialPeriod[]))
  )
  return results.flat()
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  })

  const { data: allPeriods = [] } = useQuery({
    queryKey: ['all-periods', companies.map((c) => c.id)],
    queryFn: () => fetchAllPeriods(companies),
    enabled: companies.length > 0,
  })

  // Derive KPI values from fetched data
  const totalCompanies = companies.length
  const totalPeriods = allPeriods.length

  // Latest revenue: find the most recent period across all companies and get its income statement
  const latestPeriod = allPeriods.sort((a, b) =>
    new Date(b.period_date).getTime() - new Date(a.period_date).getTime()
  )[0]

  const { data: latestStatement } = useQuery({
    queryKey: ['income-statement', latestPeriod?.company_id, latestPeriod?.id],
    queryFn: () => api.get(`/financials/${latestPeriod!.company_id}/income-statement/${latestPeriod!.id}`).then(r => r.data),
    enabled: !!latestPeriod,
  })

  const latestRevenue = latestStatement?.revenue?.total ?? latestStatement?.revenue ?? null

  // Budget variance: average variance % across all periods that have budgets
  // We'll show a simple count of periods that have budget data
  const periodsWithBudgets = allPeriods.filter((p: FinancialPeriod & { line_items?: { budget_amount: number | null }[] }) =>
    p.line_items?.some((li) => li.budget_amount != null)
  ).length

  const isLoading = loadingCompanies

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ''}. Here's your financial overview.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Total Companies</span>
            <Building2 size={20} className="text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{isLoading ? '…' : totalCompanies}</p>
          <p className="text-xs text-gray-500 mt-2">{totalCompanies === 0 ? 'Add your first company' : `${totalCompanies} tracked`}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Financial Periods</span>
            <BarChart2 size={20} className="text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{isLoading ? '…' : totalPeriods}</p>
          <p className="text-xs text-gray-500 mt-2">{totalPeriods === 0 ? 'No periods yet' : `Across all companies`}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Latest Revenue</span>
            <DollarSign size={20} className="text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{isLoading ? '…' : fmt(latestRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {latestPeriod ? `Period ${latestPeriod.period_date}` : 'No periods yet'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Periods with Budgets</span>
            <TrendingUp size={20} className="text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{isLoading ? '…' : periodsWithBudgets}</p>
          <p className="text-xs text-gray-500 mt-2">{periodsWithBudgets === 0 ? 'Add budgets for variance analysis' : 'Ready for variance analysis'}</p>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Companies list */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Your Companies</h2>
            <Link to="/companies" className="text-xs text-teal-600 hover:underline">View all</Link>
          </div>
          {isLoading && <div className="text-sm text-gray-400 py-4">Loading…</div>}
          {!isLoading && companies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 size={32} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-500">No companies yet.</p>
              <p className="text-xs text-gray-400 mt-1">Start by adding a company.</p>
            </div>
          )}
          {!isLoading && companies.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {companies.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/companies/${c.id}`}
                    className="flex items-center justify-between py-3 hover:text-teal-600 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <Building2 size={15} className="text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-teal-600">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.location}</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-gray-300 group-hover:text-teal-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/companies"
              className="flex items-center justify-between w-full px-4 py-3 rounded-md border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <PlusCircle size={18} className="text-teal-600" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-teal-700">Add Company</span>
              </div>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-teal-600" />
            </Link>
            <Link
              to="/commodity"
              className="flex items-center justify-between w-full px-4 py-3 rounded-md border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className="text-teal-600" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-teal-700">View Commodity Prices</span>
              </div>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-teal-600" />
            </Link>
            {companies.length > 0 && (
              <Link
                to={`/scenarios/${companies[0].id}`}
                className="flex items-center justify-between w-full px-4 py-3 rounded-md border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FlaskConical size={18} className="text-purple-600" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Run Scenario Model</span>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-purple-600" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

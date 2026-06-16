import { Link } from 'react-router-dom'
import {
  Building2, BarChart2, DollarSign, TrendingUp,
  PlusCircle, ArrowRight, FlaskConical, Activity,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import api from '../lib/api'
import { fmtCurrency, fmtDate } from '../lib/format'
import { SkeletonKPI, SkeletonRow } from '../components/SkeletonCard'
import type { Company, FinancialPeriod } from '../types'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts'

// ─── Data fetchers ──────────────────────────────────────────────

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

// ─── Sub-components ────────────────────────────────────────────

interface KPICardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  accent?: boolean
}

function KPICard({ title, value, subtitle, icon: Icon, accent }: KPICardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${
      accent ? 'border-teal-200 bg-teal-50/30' : 'border-gray-200'
    } p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className={`p-1.5 rounded-md ${
          accent ? 'bg-teal-100' : 'bg-gray-100'
        }`}>
          <Icon size={16} className={accent ? 'text-teal-600' : 'text-gray-500'} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────

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

  const totalCompanies = companies.length
  const totalPeriods = allPeriods.length

  // Sort periods by date descending
  const sortedPeriods = [...allPeriods].sort(
    (a, b) => new Date(b.period_date).getTime() - new Date(a.period_date).getTime()
  )
  const latestPeriod = sortedPeriods[0]

  const { data: latestStatement } = useQuery({
    queryKey: ['income-statement', latestPeriod?.company_id, latestPeriod?.id],
    queryFn: () =>
      api
        .get(`/financials/${latestPeriod!.company_id}/income-statement/${latestPeriod!.id}`)
        .then((r) => r.data),
    enabled: !!latestPeriod,
  })

  const latestRevenue = latestStatement?.revenue?.total ?? latestStatement?.revenue ?? null
  const periodsWithBudgets = allPeriods.filter((p: FinancialPeriod) =>
    p.line_items?.some((li) => li.budget_amount != null)
  ).length

  // Build a simple period-count chart grouped by month for trend visualization
  const trendData = (() => {
    if (!allPeriods.length) return []
    const counts: Record<string, number> = {}
    allPeriods.forEach((p) => {
      const key = fmtDate(p.period_date)
      counts[key] = (counts[key] ?? 0) + 1
    })
    return Object.entries(counts)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-12)
      .map(([month, count]) => ({ month, count }))
  })()

  const isLoading = loadingCompanies

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ''}. Here’s your financial overview.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)
        ) : (
          <>
            <KPICard
              title="Total Companies"
              value={totalCompanies}
              subtitle={totalCompanies === 0 ? 'Add your first company' : `${totalCompanies} tracked`}
              icon={Building2}
              accent={totalCompanies > 0}
            />
            <KPICard
              title="Financial Periods"
              value={totalPeriods}
              subtitle={totalPeriods === 0 ? 'No periods yet' : 'Across all companies'}
              icon={BarChart2}
            />
            <KPICard
              title="Latest Revenue"
              value={fmtCurrency(latestRevenue)}
              subtitle={latestPeriod ? `Period ${fmtDate(latestPeriod.period_date)}` : 'No periods yet'}
              icon={DollarSign}
              accent={latestRevenue != null}
            />
            <KPICard
              title="Periods w/ Budgets"
              value={periodsWithBudgets}
              subtitle={periodsWithBudgets === 0 ? 'Add budgets for variance' : 'Ready for variance analysis'}
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      {/* Trend chart + companies list */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">
        {/* Period trend chart */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Period Activity</h2>
              <p className="text-xs text-gray-400">Financial periods added over time</p>
            </div>
            <Activity size={16} className="text-gray-400" />
          </div>
          {trendData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart2 size={32} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No data yet</p>
              <p className="text-xs text-gray-300 mt-1">Add financial periods to see the trend</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Periods"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fill="url(#tealGrad)"
                  dot={{ fill: '#0d9488', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Companies list */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Your Companies</h2>
            <Link to="/companies" className="text-xs text-teal-600 hover:underline">View all</Link>
          </div>

          {isLoading && (
            <div className="space-y-0.5">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {!isLoading && companies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Building2 size={28} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-500">No companies yet.</p>
              <Link to="/companies" className="mt-2 text-xs text-teal-600 hover:underline">Add one →</Link>
            </div>
          )}

          {!isLoading && companies.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {companies.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/companies/${c.id}`}
                    className="flex items-center justify-between py-2.5 hover:text-teal-600 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <Building2 size={13} className="text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-teal-600 leading-tight">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.location}</p>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-gray-300 group-hover:text-teal-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/companies"
            className="flex items-center justify-between px-4 py-3 rounded-md border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <PlusCircle size={17} className="text-teal-600" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-teal-700">Add Company</span>
            </div>
            <ArrowRight size={15} className="text-gray-400 group-hover:text-teal-600" />
          </Link>
          <Link
            to="/commodity"
            className="flex items-center justify-between px-4 py-3 rounded-md border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={17} className="text-teal-600" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-teal-700">Market Prices</span>
            </div>
            <ArrowRight size={15} className="text-gray-400 group-hover:text-teal-600" />
          </Link>
          {companies.length > 0 && (
            <Link
              to={`/scenarios/${companies[0].id}`}
              className="flex items-center justify-between px-4 py-3 rounded-md border border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FlaskConical size={17} className="text-violet-600" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-violet-700">Scenario Model</span>
              </div>
              <ArrowRight size={15} className="text-gray-400 group-hover:text-violet-600" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import {
  Building2,
  BarChart2,
  DollarSign,
  TrendingUp,
  Activity,
  FlaskConical,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock3,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { useAuth } from '../lib/auth'
import api from '../lib/api'
import { fmtCurrency, fmtDate } from '../lib/format'
import { SkeletonKPI, SkeletonRow } from '../components/SkeletonCard'
import type { Company, FinancialPeriod, Scenario } from '../types'

async function fetchCompanies(): Promise<Company[]> {
  const res = await api.get('/companies')
  return res.data
}

async function fetchAllPeriods(companies: Company[]): Promise<FinancialPeriod[]> {
  const results = await Promise.all(
    companies.map((c) =>
      api.get(`/financials/${c.id}/periods`).then((r) => r.data as FinancialPeriod[])
    )
  )
  return results.flat()
}

async function fetchAllScenarios(companies: Company[]): Promise<Scenario[]> {
  const results = await Promise.all(
    companies.map((c) =>
      api.get(`/scenarios/${c.id}/scenarios`).then((r) => r.data as Scenario[])
    )
  )
  return results.flat()
}

function KPIBlock({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  tone?: 'default' | 'teal' | 'amber' | 'violet'
}) {
  const toneMap = {
    default: {
      card: 'border-gray-200 bg-white',
      iconWrap: 'bg-gray-100',
      icon: 'text-gray-600',
    },
    teal: {
      card: 'border-teal-200 bg-teal-50/50',
      iconWrap: 'bg-teal-100',
      icon: 'text-teal-700',
    },
    amber: {
      card: 'border-amber-200 bg-amber-50/60',
      iconWrap: 'bg-amber-100',
      icon: 'text-amber-700',
    },
    violet: {
      card: 'border-violet-200 bg-violet-50/60',
      iconWrap: 'bg-violet-100',
      icon: 'text-violet-700',
    },
  }

  const styles = toneMap[tone]

  return (
    <div className={`rounded-xl border shadow-sm p-5 ${styles.card}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className={`p-2 rounded-lg ${styles.iconWrap}`}>
          <Icon size={16} className={styles.icon} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>
    </div>
  )
}

function StatusCard({
  title,
  description,
  tone,
  icon: Icon,
}: {
  title: string
  description: string
  tone: 'good' | 'warn'
  icon: React.ElementType
}) {
  const styles =
    tone === 'good'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-amber-200 bg-amber-50 text-amber-700'

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs mt-1 opacity-90">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  })

  const { data: allPeriods = [], isLoading: loadingPeriods } = useQuery({
    queryKey: ['all-periods', companies.map((c) => c.id)],
    queryFn: () => fetchAllPeriods(companies),
    enabled: companies.length > 0,
  })

  const { data: allScenarios = [], isLoading: loadingScenarios } = useQuery({
    queryKey: ['all-scenarios', companies.map((c) => c.id)],
    queryFn: () => fetchAllScenarios(companies),
    enabled: companies.length > 0,
  })

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
  const totalCompanies = companies.length
  const totalPeriods = allPeriods.length
  const totalScenarios = allScenarios.length
  const periodsWithBudgets = allPeriods.filter((p) =>
    p.line_items?.some((li) => li.budget_amount != null)
  ).length
  const budgetCoveragePct =
    totalPeriods > 0 ? Math.round((periodsWithBudgets / totalPeriods) * 100) : 0

  const periodTrend = (() => {
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

  const scenarioMix = [
    {
      name: 'Revenue',
      value: allScenarios.filter((s) => s.revenue_change_pct !== 0).length,
    },
    {
      name: 'COGS',
      value: allScenarios.filter((s) => s.cogs_change_pct !== 0).length,
    },
    {
      name: 'OpEx',
      value: allScenarios.filter((s) => s.opex_change_pct !== 0).length,
    },
    {
      name: 'Commodity',
      value: allScenarios.filter((s) => s.commodity_price_change_pct !== 0).length,
    },
  ]

  const recentScenarios = [...allScenarios].slice(0, 5)
  const isLoading = loadingCompanies || loadingPeriods || loadingScenarios

  const alertItems = [
    totalCompanies === 0
      ? {
          title: 'Workspace setup incomplete',
          description: 'Add your first company to start building financial periods and scenarios.',
          tone: 'warn' as const,
          icon: AlertTriangle,
        }
      : null,
    totalPeriods === 0
      ? {
          title: 'No financial periods loaded',
          description: 'Import or create a period to unlock statements, variance, and scenarios.',
          tone: 'warn' as const,
          icon: AlertTriangle,
        }
      : null,
    totalPeriods > 0 && periodsWithBudgets < totalPeriods
      ? {
          title: 'Budget coverage is partial',
          description: `${periodsWithBudgets} of ${totalPeriods} periods include budget data.`,
          tone: 'warn' as const,
          icon: Clock3,
        }
      : null,
    totalScenarios > 0
      ? {
          title: 'Scenario modeling active',
          description: `${totalScenarios} saved scenario${totalScenarios === 1 ? '' : 's'} ready for review.`,
          tone: 'good' as const,
          icon: CheckCircle2,
        }
      : null,
  ].filter(Boolean) as Array<{
    title: string
    description: string
    tone: 'good' | 'warn'
    icon: React.ElementType
  }>

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-teal-50/50 shadow-sm">
        <div className="px-6 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 mb-2">
              Overview
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back{user?.full_name ? `, ${user.full_name}` : ''}.
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Here’s the current snapshot across your workspace, financial data, and scenario activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/workspace"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Building2 size={15} />
              Workspace
            </Link>
            <Link
              to="/commodities"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <TrendingUp size={15} />
              Commodities
            </Link>
            <Link
              to="/scenarios"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              <FlaskConical size={15} />
              Scenario Lab
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)
        ) : (
          <>
            <KPIBlock
              title="Latest Revenue"
              value={fmtCurrency(latestRevenue)}
              subtitle={latestPeriod ? `Latest period: ${fmtDate(latestPeriod.period_date)}` : 'No period available'}
              icon={DollarSign}
              tone={latestRevenue != null ? 'teal' : 'default'}
            />
            <KPIBlock
              title="Financial Periods"
              value={totalPeriods}
              subtitle={totalPeriods === 0 ? 'No data loaded yet' : 'Tracked across workspace'}
              icon={BarChart2}
            />
            <KPIBlock
              title="Budget Coverage"
              value={`${budgetCoveragePct}%`}
              subtitle={totalPeriods === 0 ? 'No periods yet' : `${periodsWithBudgets} of ${totalPeriods} periods`}
              icon={Activity}
              tone={budgetCoveragePct >= 75 ? 'teal' : 'amber'}
            />
            <KPIBlock
              title="Saved Scenarios"
              value={totalScenarios}
              subtitle={totalScenarios === 0 ? 'No what-if models yet' : 'Ready for analysis'}
              icon={FlaskConical}
              tone={totalScenarios > 0 ? 'violet' : 'default'}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Period Activity</h2>
              <p className="text-xs text-gray-400 mt-1">Recent financial period volume across the workspace</p>
            </div>
            <Activity size={16} className="text-gray-400" />
          </div>

          {isLoading ? (
            <div className="h-[220px] animate-pulse rounded-xl bg-gray-100" />
          ) : periodTrend.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart2 size={30} className="text-gray-200 mb-2" />
              <p className="text-sm font-medium text-gray-500">No trend data yet</p>
              <p className="text-xs text-gray-400 mt-1">Add or import financial periods to populate this view.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={periodTrend} margin={{ top: 4, right: 6, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Periods"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fill="url(#overviewTrend)"
                  dot={{ r: 3, fill: '#0d9488' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">System Status</h2>
              <p className="text-xs text-gray-400 mt-1">Flags and readiness checks</p>
            </div>
            <AlertTriangle size={16} className="text-gray-400" />
          </div>

          <div className="space-y-3">
            {alertItems.length === 0 ? (
              <StatusCard
                title="Everything looks healthy"
                description="Core workspace, period, and scenario data are all in good shape."
                tone="good"
                icon={CheckCircle2}
              />
            ) : (
              alertItems.map((item) => (
                <StatusCard
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  tone={item.tone}
                  icon={item.icon}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Scenario Driver Mix</h2>
              <p className="text-xs text-gray-400 mt-1">Which assumptions are being modeled most often</p>
            </div>
            <FlaskConical size={16} className="text-gray-400" />
          </div>

          {isLoading ? (
            <div className="h-[220px] animate-pulse rounded-xl bg-gray-100" />
          ) : totalScenarios === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FlaskConical size={28} className="text-gray-200 mb-2" />
              <p className="text-sm font-medium text-gray-500">No scenarios yet</p>
              <p className="text-xs text-gray-400 mt-1">Create a scenario to begin what-if analysis.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scenarioMix} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {scenarioMix.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === 'Revenue'
                          ? '#0d9488'
                          : entry.name === 'COGS'
                          ? '#f59e0b'
                          : entry.name === 'OpEx'
                          ? '#8b5cf6'
                          : '#334155'
                      }
                      fillOpacity={0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="xl:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Recent Scenarios</h2>
              <p className="text-xs text-gray-400 mt-1">Latest saved scenario models across your companies</p>
            </div>
            <Link to="/scenarios" className="text-xs font-medium text-teal-600 hover:underline">
              Open scenarios
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : recentScenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <FlaskConical size={28} className="text-gray-200 mb-2" />
              <p className="text-sm font-medium text-gray-500">No saved scenarios</p>
              <p className="text-xs text-gray-400 mt-1">Create a model to start tracking what-if cases.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentScenarios.map((scenario) => {
                const direction =
                  scenario.revenue_change_pct !== 0
                    ? `Revenue ${scenario.revenue_change_pct > 0 ? 'up' : 'down'} ${Math.abs(scenario.revenue_change_pct).toFixed(1)}%`
                    : scenario.cogs_change_pct !== 0
                    ? `COGS ${scenario.cogs_change_pct > 0 ? 'up' : 'down'} ${Math.abs(scenario.cogs_change_pct).toFixed(1)}%`
                    : 'Mixed assumption changes'

                return (
                  <li key={scenario.id}>
                    <Link
                      to={`/scenarios/${scenario.company_id}`}
                      className="flex items-center justify-between gap-3 py-3 group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 truncate">
                          {scenario.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 truncate">{direction}</p>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-teal-600 flex-shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
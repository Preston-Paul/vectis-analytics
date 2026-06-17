import { useMemo, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts'
import {
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  ArrowRight,
  Layers3,
} from 'lucide-react'
import api from '../lib/api'
import type { IncomeStatement, VarianceItem } from '../types'

type Tab = 'income' | 'variance' | 'trends'

const CATEGORY_LABELS: Record<string, string> = {
  REVENUE: 'Revenue',
  COGS: 'Cost of Goods Sold',
  OPEX: 'Operating Expenses',
  OTHER_INCOME: 'Other Income',
  OTHER_EXPENSE: 'Other Expense',
  TAX: 'Tax',
}

function fmtCategory(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat
}

async function fetchIncomeStatement(companyId: string, periodId: string): Promise<IncomeStatement> {
  const res = await api.get(`/financials/${companyId}/income-statement/${periodId}`)
  return res.data
}

async function fetchVariance(companyId: string, periodId: string): Promise<VarianceItem[]> {
  const res = await api.get(`/financials/${companyId}/variance/${periodId}`)
  return res.data.items ?? []
}

async function fetchTrends(companyId: string) {
  const res = await api.get(`/financials/${companyId}/trends`)
  return res.data.data_points ?? []
}

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

function fmtFull(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtPct(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  change,
  tone = 'default',
  icon,
}: {
  label: string
  value: string
  change?: number | null
  tone?: 'default' | 'teal' | 'blue'
  icon: React.ReactNode
}) {
  const toneMap = {
    default: 'bg-white border-gray-200',
    teal: 'bg-teal-50 border-teal-200',
    blue: 'bg-blue-50 border-blue-200',
  }

  const positive = (change ?? 0) >= 0

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
          {change != null && (
            <div
              className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${
                positive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {fmtPct(change)}
            </div>
          )}
        </div>
        <div className="rounded-xl bg-white/80 p-2 text-gray-700">{icon}</div>
      </div>
    </div>
  )
}

function IncomeStatementTab({ companyId, periodId }: { companyId: string; periodId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['income-statement', companyId, periodId],
    queryFn: () => fetchIncomeStatement(companyId, periodId),
  })

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading income statement…</div>
  if (isError || !data) return <div className="py-12 text-center text-red-500">Failed to load income statement.</div>

  const rows: [string, number, boolean][] = [
    ['Revenue', data.revenue, false],
    ['Cost of Goods Sold', data.cogs, false],
    ['Gross Profit', data.gross_profit, true],
    ['Operating Expenses', data.operating_expenses, false],
    ['Operating Income', data.operating_income, true],
    ['Other Income / (Expense)', data.other_income, false],
    ['Pre-Tax Income', data.pre_tax_income, true],
    ['Income Tax', data.tax, false],
    ['Net Income', data.net_income, true],
  ]

  return (
    <div className="space-y-6">
      <SectionCard title="Income Statement" subtitle="Core P&L waterfall for the selected reporting period.">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums">{fmt(data.revenue)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Gross Profit</p>
            <p className="text-lg font-bold text-teal-700 mt-1 tabular-nums">{fmt(data.gross_profit)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Operating Income</p>
            <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums">{fmt(data.operating_income)}</p>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-xs text-teal-700">Net Income</p>
            <p className={`text-lg font-bold mt-1 tabular-nums ${data.net_income < 0 ? 'text-red-600' : 'text-teal-700'}`}>
              {fmt(data.net_income)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Line Item</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, value, subtotal], idx) => (
                <tr
                  key={label}
                  className={subtotal ? 'bg-teal-50 font-semibold' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
                >
                  <td className={`px-4 py-3 ${subtotal ? 'text-teal-800' : 'text-gray-900'}`}>{label}</td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      value < 0 ? 'text-red-600' : subtotal ? 'text-teal-700' : 'text-gray-900'
                    }`}
                  >
                    {fmtFull(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {data.line_items && data.line_items.length > 0 && (
        <SectionCard
          title="Line Item Detail"
          subtitle="Actual and budget values across the uploaded period line items."
        >
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actual</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Budget</th>
                </tr>
              </thead>
              <tbody>
                {data.line_items.map((li, idx) => (
                  <tr key={li.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="px-4 py-3 text-gray-600">{fmtCategory(li.category)}</td>
                    <td className="px-4 py-3 text-gray-900">{li.description}</td>
                    <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{fmtFull(li.amount)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                      {li.budget_amount != null ? fmtFull(li.budget_amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function VarianceTab({ companyId, periodId }: { companyId: string; periodId: string }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['variance', companyId, periodId],
    queryFn: () => fetchVariance(companyId, periodId),
  })

  const summary = useMemo(() => {
    const withVariance = data.filter((item) => item.variance_dollar != null)
    const favorable = withVariance.filter((item) => (item.variance_dollar ?? 0) >= 0).length
    const unfavorable = withVariance.filter((item) => (item.variance_dollar ?? 0) < 0).length
    const biggest = [...withVariance].sort(
      (a, b) => Math.abs(b.variance_dollar ?? 0) - Math.abs(a.variance_dollar ?? 0)
    )[0]

    return { favorable, unfavorable, biggest }
  }, [data])

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading variance analysis…</div>
  if (isError) return <div className="py-12 text-center text-red-500">Failed to load variance data.</div>
  if (data.length === 0) {
    return <div className="py-12 text-center text-gray-500">No variance data available for this period.</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-green-700">Favorable lines</p>
          <p className="text-xl font-bold text-green-700 mt-1">{summary.favorable}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">Unfavorable lines</p>
          <p className="text-xl font-bold text-red-700 mt-1">{summary.unfavorable}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Largest variance</p>
          <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{summary.biggest?.description ?? '—'}</p>
          <p
            className={`text-sm font-bold mt-1 tabular-nums ${
              (summary.biggest?.variance_dollar ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {summary.biggest?.variance_dollar != null ? fmtFull(summary.biggest.variance_dollar) : '—'}
          </p>
        </div>
      </div>

      <SectionCard title="Variance Analysis" subtitle="Actual versus budget by line item for the selected period.">
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actual</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Budget</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Variance ($)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Variance (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => {
                const favorable = (item.variance_dollar ?? 0) >= 0
                return (
                  <tr key={`${item.description}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="px-4 py-3 text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtCategory(item.category)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{fmtFull(item.actual)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{fmtFull(item.budget)}</td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${favorable ? 'text-green-600' : 'text-red-600'}`}>
                      {item.variance_dollar != null ? `${favorable ? '+' : ''}${fmtFull(item.variance_dollar)}` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${favorable ? 'text-green-600' : 'text-red-600'}`}>
                      {item.variance_pct != null ? `${favorable ? '+' : ''}${item.variance_pct.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

function TrendsTab({ companyId }: { companyId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['trends', companyId],
    queryFn: () => fetchTrends(companyId),
  })

  const latest = data?.[data.length - 1]
  const previous = data?.[data.length - 2]

  const revenueDelta =
    latest && previous && previous.revenue
      ? ((latest.revenue - previous.revenue) / previous.revenue) * 100
      : null

  const netIncomeDelta =
    latest && previous && previous.net_income
      ? ((latest.net_income - previous.net_income) / previous.net_income) * 100
      : null

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading trends…</div>
  if (isError) return <div className="py-12 text-center text-red-500">Failed to load trend data.</div>
  if (!data || data.length < 2) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600 font-medium">Not enough data for trends yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Add at least 2 financial periods for this company to see a trend chart.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard
          label="Latest Revenue"
          value={fmt(latest?.revenue)}
          change={revenueDelta}
          tone="teal"
          icon={<TrendingUp size={16} />}
        />
        <KpiCard label="Latest COGS" value={fmt(latest?.cogs)} icon={<Activity size={16} />} />
        <KpiCard
          label="Latest Net Income"
          value={fmt(latest?.net_income)}
          change={netIncomeDelta}
          tone="blue"
          icon={
            latest?.net_income != null && latest.net_income >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )
          }
        />
        <KpiCard label="Periods Loaded" value={String(data.length)} icon={<CalendarDays size={16} />} />
      </div>

      <SectionCard title="Performance Trends" subtitle="Revenue, cost of goods sold, and net income over time.">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="period_date" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => fmt(v)} />
            <Tooltip formatter={(value: number) => fmtFull(value)} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Revenue" />
            <Line type="monotone" dataKey="cogs" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} name="COGS" />
            <Line type="monotone" dataKey="net_income" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Net Income" />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Net Income Focus" subtitle="A cleaner read on profitability direction across periods.">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="netIncomeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="period_date" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => fmt(v)} />
            <Tooltip formatter={(value: number) => fmtFull(value)} />
            <Area
              type="monotone"
              dataKey="net_income"
              stroke="#0f766e"
              strokeWidth={2.5}
              fill="url(#netIncomeFill)"
              name="Net Income"
            />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  )
}

export default function FinancialsPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const [searchParams] = useSearchParams()
  const periodId = searchParams.get('period') ?? ''
  const [activeTab, setActiveTab] = useState<Tab>('income')

  const tabs: { id: Tab; label: string; icon: React.ReactNode; hint: string }[] = [
    { id: 'income', label: 'Income Statement', icon: <FileSpreadsheet size={15} />, hint: 'Period P&L view' },
    { id: 'variance', label: 'Variance Analysis', icon: <BarChart3 size={15} />, hint: 'Actual vs budget' },
    { id: 'trends', label: 'Trends', icon: <TrendingUp size={15} />, hint: 'Historical direction' },
  ]

  const activeTabMeta = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) ?? tabs[0],
    [activeTab]
  )

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        <Link to="/workspace" className="hover:text-teal-600">
          Workspace
        </Link>
        {companyId && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/workspace/${companyId}`} className="hover:text-teal-600">
              Company #{companyId}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-700">Financials</span>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-teal-50/50 shadow-sm overflow-hidden">
        <div className="px-6 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700 mb-3">
              <Activity size={14} />
              Reporting workspace
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review statement performance, compare budget variance, and track financial direction over time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {periodId ? (
              <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
                Selected period <span className="font-semibold text-gray-900">#{periodId}</span>
              </div>
            ) : (
              <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                No period selected
              </div>
            )}
          </div>
        </div>
      </div>

      {!periodId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <Layers3 size={18} className="text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Select a reporting period first</p>
              <p className="text-sm text-amber-700 mt-1">
                Open this page from a company workspace period to view statement and variance detail.
              </p>
              {companyId && (
                <Link
                  to={`/workspace/${companyId}`}
                  className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-amber-800 hover:text-amber-900"
                >
                  Return to workspace
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/80 px-4 pt-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white text-teal-700 border border-gray-200 border-b-white -mb-px'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-b border-gray-100 bg-white px-6 py-4">
          <p className="text-sm font-semibold text-gray-900">{activeTabMeta.label}</p>
          <p className="text-xs text-gray-500 mt-1">{activeTabMeta.hint}</p>
        </div>

        <div className="p-6">
          {activeTab === 'income' && companyId && periodId && (
            <IncomeStatementTab companyId={companyId} periodId={periodId} />
          )}

          {activeTab === 'income' && (!companyId || !periodId) && (
            <div className="py-12 text-center text-gray-500">Select a period to view the income statement.</div>
          )}

          {activeTab === 'variance' && companyId && periodId && (
            <VarianceTab companyId={companyId} periodId={periodId} />
          )}

          {activeTab === 'variance' && (!companyId || !periodId) && (
            <div className="py-12 text-center text-gray-500">Select a period to view variance analysis.</div>
          )}

          {activeTab === 'trends' && companyId && <TrendsTab companyId={companyId} />}

          {activeTab === 'trends' && !companyId && (
            <div className="py-12 text-center text-gray-500">Select a workspace company to view trends.</div>
          )}
        </div>
      </div>
    </div>
  )
}
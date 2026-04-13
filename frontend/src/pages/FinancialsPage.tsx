import { useState } from 'react'
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
} from 'recharts'
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
  // Backend returns { company_id, data_points: [...] }
  return res.data.data_points ?? []
}

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function IncomeStatementTab({ companyId, periodId }: { companyId: string; periodId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['income-statement', companyId, periodId],
    queryFn: () => fetchIncomeStatement(companyId, periodId),
  })

  if (isLoading) return <div className="py-10 text-center text-gray-500">Loading income statement…</div>
  if (isError || !data) return <div className="py-10 text-center text-red-500">Failed to load income statement.</div>

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
    <div>
      <table className="w-full text-sm border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-4 py-2 font-medium text-gray-600">Line Item</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value, subtotal], idx) => (
            <tr
              key={label}
              className={`${subtotal ? 'bg-teal-50 font-semibold' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <td className="px-4 py-2.5 text-gray-900">{label}</td>
              <td className={`px-4 py-2.5 text-right ${value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {fmt(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.line_items && data.line_items.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Line Item Detail</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Actual</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Budget</th>
              </tr>
            </thead>
            <tbody>
              {data.line_items.map((li, idx) => (
                <tr key={li.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 text-gray-600">{fmtCategory(li.category)}</td>
                  <td className="px-4 py-2 text-gray-900">{li.description}</td>
                  <td className="px-4 py-2 text-right text-gray-900">{fmt(li.amount)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {li.budget_amount != null ? fmt(li.budget_amount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function VarianceTab({ companyId, periodId }: { companyId: string; periodId: string }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['variance', companyId, periodId],
    queryFn: () => fetchVariance(companyId, periodId),
  })

  if (isLoading) return <div className="py-10 text-center text-gray-500">Loading variance analysis…</div>
  if (isError) return <div className="py-10 text-center text-red-500">Failed to load variance data.</div>
  if (data.length === 0) return <div className="py-10 text-center text-gray-500">No variance data available for this period.</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Actual</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Budget</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Variance ($)</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Variance (%)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => {
            const favorable = (item.variance_dollar ?? 0) >= 0
            return (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2.5 text-gray-900">{item.description}</td>
                <td className="px-4 py-2.5 text-gray-600">{fmtCategory(item.category)}</td>
                <td className="px-4 py-2.5 text-right text-gray-900">{fmt(item.actual)}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">{fmt(item.budget)}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${favorable ? 'text-green-600' : 'text-red-600'}`}>
                  {item.variance_dollar != null ? `${favorable ? '+' : ''}${fmt(item.variance_dollar)}` : '—'}
                </td>
                <td className={`px-4 py-2.5 text-right font-medium ${favorable ? 'text-green-600' : 'text-red-600'}`}>
                  {item.variance_pct != null ? `${favorable ? '+' : ''}${item.variance_pct.toFixed(1)}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TrendsTab({ companyId }: { companyId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['trends', companyId],
    queryFn: () => fetchTrends(companyId),
  })

  if (isLoading) return <div className="py-10 text-center text-gray-500">Loading trends…</div>
  if (isError) return <div className="py-10 text-center text-red-500">Failed to load trend data.</div>
  if (!data || data.length < 2) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-500 font-medium">Not enough data for trends yet.</p>
        <p className="text-sm text-gray-400 mt-1">Add at least 2 financial periods for this company to see a trend chart.</p>
      </div>
    )
  }

  return (
    <div className="py-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue, COGS & Net Income Over Time</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period_date" tick={{ fontSize: 12, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => fmt(v)} />
          <Tooltip formatter={(value: number) => fmt(value)} />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
          <Line type="monotone" dataKey="cogs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="COGS" />
          <Line type="monotone" dataKey="net_income" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Net Income" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function FinancialsPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const [searchParams] = useSearchParams()
  const periodId = searchParams.get('period') ?? ''
  const [activeTab, setActiveTab] = useState<Tab>('income')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'income', label: 'Income Statement' },
    { id: 'variance', label: 'Variance Analysis' },
    { id: 'trends', label: 'Trends' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/companies" className="hover:text-teal-600">Companies</Link>
        {companyId && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/companies/${companyId}`} className="hover:text-teal-600">Company #{companyId}</Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-700">Financials</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        {periodId && (
          <span className="text-sm text-gray-500 bg-gray-100 rounded-full px-3 py-1">Period #{periodId}</span>
        )}
      </div>

      {!periodId && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-700 mb-6">
          No period selected. Navigate here from a company's financial periods to view specific data.
        </div>
      )}

      {/* Tab navigation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex border-b border-gray-200 px-4 gap-1 pt-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'bg-white border-l border-t border-r border-gray-200 text-teal-600 border-b-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'income' && companyId && periodId && (
            <IncomeStatementTab companyId={companyId} periodId={periodId} />
          )}
          {activeTab === 'income' && (!companyId || !periodId) && (
            <div className="py-10 text-center text-gray-500">Select a period to view the income statement.</div>
          )}
          {activeTab === 'variance' && companyId && periodId && (
            <VarianceTab companyId={companyId} periodId={periodId} />
          )}
          {activeTab === 'variance' && (!companyId || !periodId) && (
            <div className="py-10 text-center text-gray-500">Select a period to view variance analysis.</div>
          )}
          {activeTab === 'trends' && companyId && (
            <TrendsTab companyId={companyId} />
          )}
        </div>
      </div>
    </div>
  )
}

import { useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  MapPin,
  CalendarDays,
  PlusCircle,
  FileText,
  BarChart2,
  Download,
  X,
  Trash2,
  Upload,
  FlaskConical,
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock3,
  Wallet,
} from 'lucide-react'
import api from '../lib/api'
import type { Company, FinancialPeriod } from '../types'

const INDUSTRY_LABELS: Record<string, string> = {
  OIL_GAS: 'Oil & Gas',
  MIDSTREAM: 'Midstream',
  REFINING: 'Refining',
  TRADING: 'Trading',
  LOGISTICS: 'Logistics',
  OTHER: 'Other',
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Annual',
}

const PERIOD_TYPES: { label: string; value: string }[] = [
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Quarterly', value: 'QUARTERLY' },
  { label: 'Annual', value: 'ANNUAL' },
]

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'Revenue', value: 'REVENUE' },
  { label: 'Cost of Goods Sold', value: 'COGS' },
  { label: 'Operating Expenses', value: 'OPEX' },
  { label: 'Other Income', value: 'OTHER_INCOME' },
  { label: 'Other Expense', value: 'OTHER_EXPENSE' },
  { label: 'Tax', value: 'TAX' },
]

async function fetchCompany(id: string): Promise<Company> {
  const res = await api.get(`/companies/${id}`)
  return res.data
}

async function fetchPeriods(companyId: string): Promise<FinancialPeriod[]> {
  const res = await api.get(`/financials/${companyId}/periods`)
  return res.data
}

interface LineItemInput {
  category: string
  subcategory: string
  description: string
  amount: string
  budget_amount: string
}

const emptyLineItem = (): LineItemInput => ({
  category: CATEGORIES[0].value,
  subcategory: '',
  description: '',
  amount: '',
  budget_amount: '',
})

interface PeriodForm {
  period_type: string
  period_date: string
  line_items: LineItemInput[]
}

const emptyPeriodForm: PeriodForm = {
  period_type: 'QUARTERLY',
  period_date: '',
  line_items: [emptyLineItem()],
}

function WorkspaceStat({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  tone?: 'default' | 'teal' | 'violet'
}) {
  const styles =
    tone === 'teal'
      ? 'border-teal-200 bg-teal-50/60'
      : tone === 'violet'
      ? 'border-violet-200 bg-violet-50/60'
      : 'border-gray-200 bg-white'

  const iconStyles =
    tone === 'teal'
      ? 'bg-teal-100 text-teal-700'
      : tone === 'violet'
      ? 'bg-violet-100 text-violet-700'
      : 'bg-gray-100 text-gray-600'

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${styles}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <div className={`rounded-lg p-2 ${iconStyles}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>
    </div>
  )
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [periodForm, setPeriodForm] = useState<PeriodForm>(emptyPeriodForm)
  const [formError, setFormError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importPeriodType, setImportPeriodType] = useState('MONTHLY')
  const [importPeriodDate, setImportPeriodDate] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ['company', id],
    queryFn: () => fetchCompany(id!),
    enabled: !!id,
  })

  const { data: periods = [], isLoading: loadingPeriods } = useQuery({
    queryKey: ['periods', id],
    queryFn: () => fetchPeriods(id!),
    enabled: !!id,
  })

  const createPeriodMutation = useMutation({
    mutationFn: async (data: PeriodForm) => {
      const payload = {
        ...data,
        line_items: data.line_items.map((li) => ({
          ...li,
          amount: parseFloat(li.amount) || 0,
          budget_amount: li.budget_amount ? parseFloat(li.budget_amount) : null,
        })),
      }
      return api.post(`/financials/${id}/periods`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods', id] })
      setShowModal(false)
      setPeriodForm(emptyPeriodForm)
      setFormError(null)
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? err.message
          : 'Failed to add period.'
      setFormError(typeof msg === 'string' ? msg : 'Failed to add period.')
    },
  })

  const addLineItem = () => {
    setPeriodForm((prev) => ({ ...prev, line_items: [...prev.line_items, emptyLineItem()] }))
  }

  const removeLineItem = (idx: number) => {
    setPeriodForm((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== idx),
    }))
  }

  const updateLineItem = (idx: number, field: keyof LineItemInput, value: string) => {
    setPeriodForm((prev) => ({
      ...prev,
      line_items: prev.line_items.map((li, i) => (i === idx ? { ...li, [field]: value } : li)),
    }))
  }

  async function handleExcelImport(e: React.FormEvent) {
    e.preventDefault()
    setImportError(null)
    setImportSuccess(null)

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setImportError('Please select an Excel file.')
      return
    }
    if (!importPeriodDate) {
      setImportError('Please select a period date.')
      return
    }

    setImportLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await api.post(
        `/financials/${id}/import-excel?period_type=${importPeriodType}&period_date=${importPeriodDate}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      queryClient.invalidateQueries({ queryKey: ['periods', id] })
      setImportSuccess(`Imported ${res.data.line_items?.length ?? 0} line items as Period #${res.data.id}`)
      setShowImportModal(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
        'Import failed.'
      setImportError(typeof msg === 'string' ? msg : 'Import failed.')
    } finally {
      setImportLoading(false)
    }
  }

  const sortedPeriods = useMemo(
    () =>
      [...periods].sort(
        (a, b) => new Date(b.period_date).getTime() - new Date(a.period_date).getTime()
      ),
    [periods]
  )

  const latestPeriod = sortedPeriods[0]
  const periodsWithBudgets = periods.filter((p) =>
    p.line_items?.some((li) => li.budget_amount != null)
  ).length
  const monthlyPeriods = periods.filter((p) => p.period_type === 'MONTHLY').length

  if (loadingCompany) return <div className="text-center py-20 text-gray-500">Loading…</div>
  if (!company) return <div className="text-center py-20 text-red-500">Company not found.</div>

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-sm text-gray-500">
        <Link to="/workspace" className="hover:text-teal-600">
          Workspace
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{company.name}</span>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-teal-50/50 shadow-sm">
        <div className="px-6 py-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={26} className="text-teal-700" />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <span className="text-sm font-medium bg-white/80 border border-gray-200 text-slate-600 rounded-full px-3 py-1">
                  {INDUSTRY_LABELS[company.industry] ?? company.industry}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  {company.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Wallet size={14} />
                  Revenue: {company.revenue_range}
                </span>
              </div>

              <p className="text-sm text-gray-500 mt-3 max-w-2xl">
                Manage imports, review financial periods, and jump directly into analysis workflows for this company.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload size={15} />
              Import Excel
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              <PlusCircle size={15} />
              Add Period
            </button>
          </div>
        </div>
      </div>

      {importSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{importSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <WorkspaceStat
          label="Financial Periods"
          value={periods.length}
          subtitle={periods.length === 0 ? 'No periods loaded yet' : 'Tracked for this workspace'}
          icon={CalendarDays}
          tone={periods.length > 0 ? 'teal' : 'default'}
        />
        <WorkspaceStat
          label="Latest Period"
          value={latestPeriod ? latestPeriod.period_date : '—'}
          subtitle={latestPeriod ? PERIOD_TYPE_LABELS[latestPeriod.period_type] ?? latestPeriod.period_type : 'No financial data yet'}
          icon={Clock3}
        />
        <WorkspaceStat
          label="Budget-Ready Periods"
          value={periodsWithBudgets}
          subtitle={periods.length === 0 ? 'No periods yet' : `${periodsWithBudgets} include budget values`}
          icon={Activity}
          tone={periodsWithBudgets > 0 ? 'teal' : 'default'}
        />
        <WorkspaceStat
          label="Monthly Periods"
          value={monthlyPeriods}
          subtitle="Useful for tighter operating analysis"
          icon={BarChart2}
          tone={monthlyPeriods > 0 ? 'violet' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Workspace Actions</h2>
              <p className="text-xs text-gray-400 mt-1">Jump directly into key workflows</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to={`/financials/${company.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 hover:border-teal-300 hover:bg-teal-50/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-100 p-2 text-teal-700">
                  <BarChart2 size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Financials</p>
                  <p className="text-xs text-gray-400">Statements and period detail</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-teal-600" />
            </Link>

            <Link
              to={`/scenarios/${company.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 hover:border-violet-300 hover:bg-violet-50/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
                  <FlaskConical size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Scenario Lab</p>
                  <p className="text-xs text-gray-400">What-if analysis and projections</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-violet-600" />
            </Link>

            <Link
              to="/commodities"
              className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <Activity size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Commodities</p>
                  <p className="text-xs text-gray-400">Market pricing and monitoring</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-emerald-600" />
            </Link>
          </div>
        </div>

        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Workspace Health</h2>

          <div className="space-y-3">
            {periods.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">No periods loaded</p>
                <p className="text-xs text-amber-700 mt-1">
                  Import or add a financial period to unlock financial analysis and scenario workflows.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-green-800">Financial data available</p>
                <p className="text-xs text-green-700 mt-1">
                  This workspace has {periods.length} recorded period{periods.length === 1 ? '' : 's'}.
                </p>
              </div>
            )}

            {periods.length > 0 && periodsWithBudgets < periods.length && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">Partial budget coverage</p>
                <p className="text-xs text-amber-700 mt-1">
                  Only {periodsWithBudgets} of {periods.length} periods include budget values.
                </p>
              </div>
            )}

            {periodsWithBudgets === periods.length && periods.length > 0 && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-green-800">Budget-ready workspace</p>
                <p className="text-xs text-green-700 mt-1">
                  All recorded periods include budget values for variance analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Financial Periods</h2>
            <p className="text-xs text-gray-400 mt-1">All periods currently available for this company workspace</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 font-medium rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <Upload size={14} />
              Import Excel
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              <PlusCircle size={15} />
              Add Period
            </button>
          </div>
        </div>

        {loadingPeriods && <div className="text-gray-500 text-sm">Loading periods…</div>}

        {!loadingPeriods && periods.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-gray-300 rounded-xl">
            <CalendarDays size={34} className="text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500">No financial periods yet</p>
            <p className="text-xs text-gray-400 mt-1">Use Add Period or Import Excel to start building this workspace.</p>
          </div>
        )}

        {!loadingPeriods && periods.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Budget</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPeriods.map((period) => {
                  const hasBudget = period.line_items?.some((li) => li.budget_amount != null)

                  return (
                    <tr key={period.id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 text-gray-900 font-medium">Period #{period.id}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {PERIOD_TYPE_LABELS[period.period_type] ?? period.period_type}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{period.period_date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            hasBudget
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {hasBudget ? 'Budget ready' : 'No budget'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            to={`/financials/${company.id}?period=${period.id}`}
                            className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 text-xs font-medium"
                          >
                            <BarChart2 size={14} />
                            Financials
                          </Link>
                          <Link
                            to={`/scenarios/${company.id}`}
                            className="flex items-center gap-1.5 text-violet-600 hover:text-violet-700 text-xs font-medium"
                          >
                            <FlaskConical size={14} />
                            Scenarios
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Reports</h2>
            <p className="text-xs text-gray-400 mt-1">Export and reporting actions for this workspace</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => alert('PDF export coming soon.')}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
          >
            <FileText size={16} />
            Generate PDF
          </button>
          <button
            onClick={() => alert('Excel export coming soon.')}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 font-medium rounded-lg px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Generate Excel
          </button>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Import from Excel</h2>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportError(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 gap-3">
              <p className="text-xs text-gray-500">Need a template? Download our sample import file.</p>
              <button
                type="button"
                onClick={() => {
                  const rows = [
                    ['Line Item', 'Actual ($)', 'Budget ($)'],
                    ['Oil & Gas Revenue', 850000, 900000],
                    ['Service Revenue', 150000, 120000],
                    ['Cost of Goods Sold', 320000, 300000],
                    ['Operating Expenses', 180000, 175000],
                    ['General & Administrative', 95000, 90000],
                    ['Depreciation', 45000, 45000],
                    ['Interest Expense', 12000, 10000],
                    ['Income Tax', 88000, 100000],
                  ]
                  const csv = rows.map((r) => r.join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = 'vectis_import_template.csv'
                  a.click()
                }}
                className="text-xs text-teal-600 font-medium hover:underline whitespace-nowrap"
              >
                Download template
              </button>
            </div>

            {importError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {importError}
              </div>
            )}

            <form onSubmit={handleExcelImport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File (.xlsx or .csv)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period type</label>
                  <select
                    value={importPeriodType}
                    onChange={(e) => setImportPeriodType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {PERIOD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period date</label>
                  <input
                    type="date"
                    required
                    value={importPeriodDate}
                    onChange={(e) => setImportPeriodDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false)
                    setImportError(null)
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importLoading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={14} />
                  {importLoading ? 'Importing…' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Financial Period</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setFormError(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createPeriodMutation.mutate(periodForm)
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period type</label>
                  <select
                    value={periodForm.period_type}
                    onChange={(e) => setPeriodForm((p) => ({ ...p, period_type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {PERIOD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period date</label>
                  <input
                    type="date"
                    required
                    value={periodForm.period_date}
                    onChange={(e) => setPeriodForm((p) => ({ ...p, period_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Line Items</label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-teal-600 text-xs font-medium hover:underline flex items-center gap-1"
                  >
                    <PlusCircle size={13} /> Add row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-2 text-left text-gray-600 font-medium border-b border-gray-200">Category</th>
                        <th className="px-2 py-2 text-left text-gray-600 font-medium border-b border-gray-200">Subcategory</th>
                        <th className="px-2 py-2 text-left text-gray-600 font-medium border-b border-gray-200">Description</th>
                        <th className="px-2 py-2 text-left text-gray-600 font-medium border-b border-gray-200">Amount</th>
                        <th className="px-2 py-2 text-left text-gray-600 font-medium border-b border-gray-200">Budget</th>
                        <th className="px-2 py-2 border-b border-gray-200"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodForm.line_items.map((li, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                          <td className="p-1.5">
                            <select
                              value={li.category}
                              onChange={(e) => updateLineItem(idx, 'category', e.target.value)}
                              className="w-full text-xs border-none outline-none bg-transparent"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              value={li.subcategory}
                              onChange={(e) => updateLineItem(idx, 'subcategory', e.target.value)}
                              className="w-full text-xs border-none outline-none bg-transparent"
                              placeholder="Subcategory"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              value={li.description}
                              onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                              className="w-full text-xs border-none outline-none bg-transparent"
                              placeholder="Description"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={li.amount}
                              onChange={(e) => updateLineItem(idx, 'amount', e.target.value)}
                              className="w-full text-xs border-none outline-none bg-transparent"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={li.budget_amount}
                              onChange={(e) => updateLineItem(idx, 'budget_amount', e.target.value)}
                              className="w-full text-xs border-none outline-none bg-transparent"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            {periodForm.line_items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLineItem(idx)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormError(null)
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPeriodMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  {createPeriodMutation.isPending ? 'Saving…' : 'Save Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
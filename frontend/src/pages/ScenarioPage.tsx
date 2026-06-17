import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PlusCircle,
  X,
  Trash2,
  FlaskConical,
  TrendingUp,
  Save,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import api from '../lib/api'
import type { Scenario, ScenarioPnL, FinancialPeriod } from '../types'

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

function fmtPct(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Annual',
}

async function fetchPeriods(companyId: string): Promise<FinancialPeriod[]> {
  const res = await api.get(`/financials/${companyId}/periods`)
  return res.data
}

async function fetchScenarios(companyId: string): Promise<Scenario[]> {
  const res = await api.get(`/scenarios/${companyId}/scenarios`)
  return res.data
}

async function fetchProjection(companyId: string, scenarioId: number): Promise<ScenarioPnL> {
  const res = await api.get(`/scenarios/${companyId}/scenarios/${scenarioId}/projection`)
  return res.data
}

interface SliderProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  helpText?: string
}

function SliderInput({ label, value, onChange, min = -50, max = 50, helpText }: SliderProps) {
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-500'

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <label className="text-sm font-medium text-gray-800">{label}</label>
        <span className={`text-sm font-semibold tabular-nums ${color}`}>{fmtPct(value)}</span>
      </div>
      {helpText && <p className="text-xs text-gray-500 mb-3">{helpText}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
      />
      <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
        <span>{min}%</span>
        <span>0%</span>
        <span>+{max}%</span>
      </div>
    </div>
  )
}

function ProjectionTable({ pnl }: { pnl: ScenarioPnL }) {
  const isSubtotal = (cat: string) => cat === 'SUBTOTAL'

  const summaryCards = [
    {
      label: 'Base Net Income',
      value: pnl.base_net_income,
      tone: 'text-gray-900',
      bg: 'bg-white border-gray-200',
    },
    {
      label: 'Projected Net Income',
      value: pnl.scenario_net_income,
      tone: 'text-teal-700',
      bg: 'bg-teal-50 border-teal-200',
    },
    {
      label: 'Impact',
      value: pnl.net_income_change,
      pct: pnl.net_income_change_pct,
      tone: pnl.net_income_change >= 0 ? 'text-green-600' : 'text-red-600',
      bg: 'bg-white border-gray-200',
    },
  ]

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-lg font-bold tabular-nums ${card.tone}`}>
              {card.label === 'Impact' && (card.value ?? 0) > 0 ? '+' : ''}
              {fmt(card.value)}
              {card.label === 'Impact' && card.pct != null && (
                <span className="text-sm font-medium ml-1">({fmtPct(card.pct)})</span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Line Item</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Base</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Projected</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Change</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Change %</th>
            </tr>
          </thead>
          <tbody>
            {pnl.line_items.map((item, idx) => {
              const sub = isSubtotal(item.category)
              const favorable = item.change >= 0

              return (
                <tr
                  key={`${item.description}-${idx}`}
                  className={`${sub ? 'bg-teal-50 font-semibold' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
                >
                  <td className={`px-4 py-3 ${sub ? 'text-teal-800' : 'text-gray-900'}`}>{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{fmt(item.base_amount)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${sub ? 'text-teal-700' : 'text-gray-900'}`}>
                    {fmt(item.scenario_amount)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-medium ${
                      item.change === 0 ? 'text-gray-400' : favorable ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.change === 0 ? '—' : `${favorable ? '+' : ''}${fmt(item.change)}`}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      item.change === 0 ? 'text-gray-400' : favorable ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.change === 0 ? '—' : fmtPct(item.change_pct)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface ScenarioForm {
  period_id: string
  name: string
  description: string
  revenue_change_pct: number
  cogs_change_pct: number
  opex_change_pct: number
  other_income_change_pct: number
  other_expense_change_pct: number
  commodity_price_change_pct: number
}

const emptyForm = (periodId = ''): ScenarioForm => ({
  period_id: periodId,
  name: '',
  description: '',
  revenue_change_pct: 0,
  cogs_change_pct: 0,
  opex_change_pct: 0,
  other_income_change_pct: 0,
  other_expense_change_pct: 0,
  commodity_price_change_pct: 0,
})

function toScenarioForm(s: Scenario): ScenarioForm {
  return {
    period_id: String(s.period_id),
    name: s.name,
    description: s.description ?? '',
    revenue_change_pct: s.revenue_change_pct,
    cogs_change_pct: s.cogs_change_pct,
    opex_change_pct: s.opex_change_pct,
    other_income_change_pct: s.other_income_change_pct,
    other_expense_change_pct: s.other_expense_change_pct,
    commodity_price_change_pct: s.commodity_price_change_pct,
  }
}

function formsEqual(a: ScenarioForm | null, b: ScenarioForm | null) {
  if (!a || !b) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function ScenarioPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [form, setForm] = useState<ScenarioForm>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const [activeScenarioId, setActiveScenarioId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<ScenarioForm | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<ScenarioForm | null>(null)

  const [projectionRunId, setProjectionRunId] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const { data: periods = [] } = useQuery({
    queryKey: ['periods', companyId],
    queryFn: () => fetchPeriods(companyId!),
    enabled: !!companyId,
  })

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios', companyId],
    queryFn: () => fetchScenarios(companyId!),
    enabled: !!companyId,
  })

  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeScenarioId) ?? null,
    [scenarios, activeScenarioId]
  )

  useEffect(() => {
    if (!activeScenarioId && scenarios.length > 0) {
      const first = scenarios[0]
      setActiveScenarioId(first.id)
      const nextForm = toScenarioForm(first)
      setEditForm(nextForm)
      setSavedSnapshot(nextForm)
    }
  }, [scenarios, activeScenarioId])

  const hasUnsavedChanges = !!editForm && !!savedSnapshot && !formsEqual(editForm, savedSnapshot)

  const { data: projection, isFetching: projecting } = useQuery({
    queryKey: ['projection', companyId, activeScenarioId, projectionRunId],
    queryFn: () => fetchProjection(companyId!, activeScenarioId!),
    enabled: !!companyId && !!activeScenarioId && projectionRunId > 0,
  })

  const createMutation = useMutation({
    mutationFn: (data: ScenarioForm) =>
      api.post(`/scenarios/${companyId}/scenarios`, {
        ...data,
        period_id: parseInt(data.period_id, 10),
      }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['scenarios', companyId] })
      setShowCreateModal(false)
      setForm(emptyForm())
      setFormError(null)

      const created = res.data as Scenario
      const nextForm = toScenarioForm(created)
      setActiveScenarioId(created.id)
      setEditForm(nextForm)
      setSavedSnapshot(nextForm)
      setStatusMessage('Scenario created successfully.')
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? err.message
          : 'Failed to create scenario.'
      setFormError(typeof msg === 'string' ? msg : 'Failed to create scenario.')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !activeScenarioId || !editForm) throw new Error('No active scenario to save.')
      const payload = {
        name: editForm.name,
        description: editForm.description,
        revenue_change_pct: editForm.revenue_change_pct,
        cogs_change_pct: editForm.cogs_change_pct,
        opex_change_pct: editForm.opex_change_pct,
        other_income_change_pct: editForm.other_income_change_pct,
        other_expense_change_pct: editForm.other_expense_change_pct,
        commodity_price_change_pct: editForm.commodity_price_change_pct,
      }
      const res = await api.patch(`/scenarios/${companyId}/scenarios/${activeScenarioId}`, payload)
      return res.data as Scenario
    },
    onSuccess: async (updatedScenario) => {
      await queryClient.invalidateQueries({ queryKey: ['scenarios', companyId] })
      const nextForm = toScenarioForm(updatedScenario)
      setSavedSnapshot(nextForm)
      setEditForm(nextForm)
      setStatusMessage('Scenario changes saved.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/scenarios/${companyId}/scenarios/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scenarios', companyId] })
      setShowDeleteModal(false)
      setProjectionRunId(0)
      setStatusMessage('Scenario deleted.')
      setActiveScenarioId(null)
      setEditForm(null)
      setSavedSnapshot(null)
    },
  })

  function selectScenario(s: Scenario) {
    const nextForm = toScenarioForm(s)
    setActiveScenarioId(s.id)
    setEditForm(nextForm)
    setSavedSnapshot(nextForm)
    setProjectionRunId(0)
    setStatusMessage(null)
  }

  async function handleSave() {
    setStatusMessage(null)
    await saveMutation.mutateAsync()
  }

  async function handleRunProjection() {
    if (!activeScenarioId) return

    if (hasUnsavedChanges) {
      await handleSave()
    }

    await queryClient.invalidateQueries({ queryKey: ['projection', companyId, activeScenarioId] })
    setProjectionRunId((n) => n + 1)
    setStatusMessage('Projection updated.')
  }

  const activePeriod = periods.find((p) => p.id === activeScenario?.period_id)

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        <Link to="/workspace" className="hover:text-teal-600">
          Workspace
        </Link>
        <span className="mx-2">/</span>
        {companyId && (
          <>
            <Link to={`/workspace/${companyId}`} className="hover:text-teal-600">
              Company #{companyId}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-gray-700">Scenario Lab</span>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-violet-50/40 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-6 py-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <FlaskConical size={18} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                Scenario Lab
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Model what-if outcomes</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Build scenario cases from real financial periods, adjust key assumptions, and compare projected P&amp;L impact.
            </p>
          </div>

          <button
            onClick={() => {
              setForm(emptyForm(periods[0]?.id ? String(periods[0].id) : ''))
              setFormError(null)
              setShowCreateModal(true)
            }}
            disabled={periods.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
          >
            <PlusCircle size={16} />
            New Scenario
          </button>
        </div>
      </div>

      {periods.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">No financial periods available</p>
              <p className="text-sm text-amber-700 mt-1">
                Scenario modeling needs at least one financial period with line items.
              </p>
              {companyId && (
                <Link
                  to={`/workspace/${companyId}`}
                  className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-amber-800 hover:text-amber-900"
                >
                  Go to workspace
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Saved Scenarios</h2>
                <span className="text-xs text-gray-400">{scenarios.length}</span>
              </div>
            </div>

            {isLoading && <div className="p-4 text-sm text-gray-400">Loading scenarios…</div>}

            {!isLoading && scenarios.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                <FlaskConical size={30} className="text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">No scenarios yet</p>
                <p className="text-xs text-gray-400 mt-1">Create your first saved case to start exploring outcomes.</p>
              </div>
            )}

            {!isLoading && scenarios.length > 0 && (
              <ul className="divide-y divide-gray-100 max-h-[760px] overflow-y-auto">
                {scenarios.map((s) => {
                  const period = periods.find((p) => p.id === s.period_id)
                  const isActive = activeScenarioId === s.id

                  return (
                    <li
                      key={s.id}
                      onClick={() => selectScenario(s)}
                      className={`cursor-pointer px-4 py-4 transition-colors ${
                        isActive ? 'bg-violet-50/80 border-l-2 border-violet-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                          {period && (
                            <p className="text-xs text-gray-400 mt-1">
                              {PERIOD_TYPE_LABELS[period.period_type] ?? period.period_type} · {period.period_date}
                            </p>
                          )}
                        </div>

                        {isActive && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3 flex-wrap">
                        {s.revenue_change_pct !== 0 && (
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                              s.revenue_change_pct > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            Rev {fmtPct(s.revenue_change_pct)}
                          </span>
                        )}
                        {s.cogs_change_pct !== 0 && (
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                              s.cogs_change_pct < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            COGS {fmtPct(s.cogs_change_pct)}
                          </span>
                        )}
                        {s.opex_change_pct !== 0 && (
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                              s.opex_change_pct < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            OpEx {fmtPct(s.opex_change_pct)}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9">
          {!activeScenario && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
              <Sparkles size={38} className="text-gray-200 mb-3" />
              <p className="text-gray-700 font-medium">Select or create a scenario</p>
              <p className="text-sm text-gray-400 mt-1 max-w-md">
                Choose a saved scenario on the left to edit assumptions, save changes, and project results.
              </p>
            </div>
          )}

          {activeScenario && editForm && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 bg-white/95 px-6 py-5 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/85">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-xl font-semibold text-gray-900">{activeScenario.name}</h2>
                      {hasUnsavedChanges && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          Unsaved changes
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500">
                      {activePeriod
                        ? `${PERIOD_TYPE_LABELS[activePeriod.period_type] ?? activePeriod.period_type} · ${activePeriod.period_date}`
                        : `Period #${activeScenario.period_id}`}
                    </p>

                    {activeScenario.description && (
                      <p className="text-sm text-gray-400 mt-1">{activeScenario.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={!hasUnsavedChanges || saveMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save size={15} />
                      {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </button>

                    <button
                      onClick={handleRunProjection}
                      disabled={projecting || saveMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-400"
                    >
                      <TrendingUp size={15} />
                      {projecting ? 'Calculating…' : 'Run Projection'}
                    </button>

                    <button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 mb-1">Scenario</p>
                    <p className="text-sm font-semibold text-gray-900">{editForm.name}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 mb-1">Base period</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {activePeriod
                        ? `${PERIOD_TYPE_LABELS[activePeriod.period_type] ?? activePeriod.period_type} · ${activePeriod.period_date}`
                        : `Period #${editForm.period_id}`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className={`text-sm font-semibold ${hasUnsavedChanges ? 'text-amber-700' : 'text-green-700'}`}>
                      {hasUnsavedChanges ? 'Draft changes pending' : 'Saved'}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal size={15} className="text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-800">Assumptions</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Adjust key drivers below, then save and run a projection to refresh the modeled P&amp;L.
                    </p>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SliderInput
                      label="Revenue change"
                      value={editForm.revenue_change_pct}
                      onChange={(v) => setEditForm((f) => (f ? { ...f, revenue_change_pct: v } : f))}
                      helpText="Use this to model pricing, volume, or demand shifts."
                    />
                    <SliderInput
                      label="COGS change"
                      value={editForm.cogs_change_pct}
                      onChange={(v) => setEditForm((f) => (f ? { ...f, cogs_change_pct: v } : f))}
                      helpText="Model raw materials, production, or direct input cost changes."
                    />
                    <SliderInput
                      label="Operating expenses change"
                      value={editForm.opex_change_pct}
                      onChange={(v) => setEditForm((f) => (f ? { ...f, opex_change_pct: v } : f))}
                      helpText="Capture overhead or SG&A changes."
                    />
                    <SliderInput
                      label="Commodity price shift"
                      value={editForm.commodity_price_change_pct}
                      onChange={(v) => setEditForm((f) => (f ? { ...f, commodity_price_change_pct: v } : f))}
                      helpText="Useful when commodity inputs materially affect margins."
                    />
                    <SliderInput
                      label="Other income change"
                      value={editForm.other_income_change_pct}
                      onChange={(v) => setEditForm((f) => (f ? { ...f, other_income_change_pct: v } : f))}
                      helpText="Adjust one-off or ancillary income assumptions."
                    />
                    <SliderInput
                      label="Other expense change"
                      value={editForm.other_expense_change_pct}
                      onChange={(v) => setEditForm((f) => (f ? { ...f, other_expense_change_pct: v } : f))}
                      helpText="Capture financing or non-operating expense changes."
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">Projected P&amp;L</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Run a projection to compare base performance against your selected scenario assumptions.
                    </p>
                  </div>

                  <div className="p-5">
                    {projecting && (
                      <div className="py-10 text-center text-sm text-gray-400">Calculating projection…</div>
                    )}

                    {!projecting && !projection && (
                      <div className="py-10 text-center">
                        <TrendingUp size={28} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-sm font-medium text-gray-600">No projection yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Save assumptions and run the model to see projected results.
                        </p>
                      </div>
                    )}

                    {!projecting && projection && <ProjectionTable pnl={projection} />}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">New Scenario</h2>
                <p className="text-sm text-gray-500 mt-1">Create a saved what-if case from an existing base period.</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormError(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate(form)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Scenario name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g. Oil price recovery"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Brief description of the scenario"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Base period</label>
                <select
                  required
                  value={form.period_id}
                  onChange={(e) => setForm((f) => ({ ...f, period_id: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select a period…</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {PERIOD_TYPE_LABELS[p.period_type] ?? p.period_type} · {p.period_date}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormError(null)
                  }}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:bg-violet-400"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create Scenario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && activeScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-600">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delete scenario?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently delete <span className="font-medium text-gray-700">{activeScenario.name}</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(activeScenario.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:bg-red-400"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete Scenario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
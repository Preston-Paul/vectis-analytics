import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, X, Trash2, FlaskConical, TrendingUp, TrendingDown } from 'lucide-react'
import api from '../lib/api'
import type { Scenario, ScenarioPnL, FinancialPeriod } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Slider input
// ---------------------------------------------------------------------------

interface SliderProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}

function SliderInput({ label, value, onChange, min = -50, max = 50 }: SliderProps) {
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        <span className={`text-xs font-semibold tabular-nums ${color}`}>{fmtPct(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{min}%</span>
        <span>0%</span>
        <span>+{max}%</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Projection table
// ---------------------------------------------------------------------------

function ProjectionTable({ pnl }: { pnl: ScenarioPnL }) {
  const isSubtotal = (cat: string) => cat === 'SUBTOTAL'

  return (
    <div className="overflow-x-auto mt-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Base Net Income', value: pnl.base_net_income, highlight: false },
          { label: 'Projected Net Income', value: pnl.scenario_net_income, highlight: true },
          { label: 'Impact', value: pnl.net_income_change, pct: pnl.net_income_change_pct, highlight: false, delta: true },
        ].map((card) => (
          <div key={card.label} className={`rounded-lg border p-4 ${card.highlight ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-lg font-bold tabular-nums ${
              card.delta
                ? card.value >= 0 ? 'text-green-600' : 'text-red-600'
                : card.highlight ? 'text-teal-700' : 'text-gray-900'
            }`}>
              {card.delta && card.value >= 0 ? '+' : ''}{fmt(card.value)}
              {card.delta && card.pct != null && (
                <span className="text-sm font-medium ml-1">({fmtPct(card.pct)})</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Line-by-line table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-4 py-2 font-medium text-gray-600">Line Item</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Base</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Projected</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Change</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Change %</th>
          </tr>
        </thead>
        <tbody>
          {pnl.line_items.map((item, idx) => {
            const sub = isSubtotal(item.category)
            const favorable = item.change >= 0
            return (
              <tr
                key={idx}
                className={`${sub ? 'bg-teal-50 font-semibold' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className={`px-4 py-2.5 ${sub ? 'text-teal-800' : 'text-gray-900'}`}>{item.description}</td>
                <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{fmt(item.base_amount)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${sub ? 'text-teal-700' : 'text-gray-900'}`}>{fmt(item.scenario_amount)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${item.change === 0 ? 'text-gray-400' : favorable ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change === 0 ? '—' : `${favorable ? '+' : ''}${fmt(item.change)}`}
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${item.change === 0 ? 'text-gray-400' : favorable ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change === 0 ? '—' : fmtPct(item.change_pct)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

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

export default function ScenarioPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<ScenarioForm>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [activeScenarioId, setActiveScenarioId] = useState<number | null>(null)
  // Live-edit state for sliders
  const [editForm, setEditForm] = useState<ScenarioForm | null>(null)
  const [projectionKey, setProjectionKey] = useState(0)

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

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? null

  const { data: projection, isFetching: projecting } = useQuery({
    queryKey: ['projection', companyId, activeScenarioId, projectionKey],
    queryFn: async () => {
      if (!activeScenarioId || !companyId) return null
      // Save slider values to backend first, then fetch projection
      if (editForm) {
        await api.patch(`/scenarios/${companyId}/scenarios/${activeScenarioId}`, {
          revenue_change_pct: editForm.revenue_change_pct,
          cogs_change_pct: editForm.cogs_change_pct,
          opex_change_pct: editForm.opex_change_pct,
          other_income_change_pct: editForm.other_income_change_pct,
          other_expense_change_pct: editForm.other_expense_change_pct,
          commodity_price_change_pct: editForm.commodity_price_change_pct,
        })
        queryClient.invalidateQueries({ queryKey: ['scenarios', companyId] })
      }
      return fetchProjection(companyId, activeScenarioId)
    },
    enabled: !!activeScenarioId && !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (data: ScenarioForm) =>
      api.post(`/scenarios/${companyId}/scenarios`, {
        ...data,
        period_id: parseInt(data.period_id),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', companyId] })
      setShowModal(false)
      setForm(emptyForm())
      setFormError(null)
      setActiveScenarioId(res.data.id)
      setEditForm(null)
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? err.message
          : 'Failed to create scenario.'
      setFormError(typeof msg === 'string' ? msg : 'Failed to create scenario.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/scenarios/${companyId}/scenarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', companyId] })
      setActiveScenarioId(null)
      setEditForm(null)
    },
  })

  function selectScenario(s: Scenario) {
    setActiveScenarioId(s.id)
    setEditForm({
      period_id: String(s.period_id),
      name: s.name,
      description: s.description ?? '',
      revenue_change_pct: s.revenue_change_pct,
      cogs_change_pct: s.cogs_change_pct,
      opex_change_pct: s.opex_change_pct,
      other_income_change_pct: s.other_income_change_pct,
      other_expense_change_pct: s.other_expense_change_pct,
      commodity_price_change_pct: s.commodity_price_change_pct,
    })
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/companies" className="hover:text-teal-600">Companies</Link>
        <span className="mx-2">/</span>
        {companyId && (
          <>
            <Link to={`/companies/${companyId}`} className="hover:text-teal-600">Company #{companyId}</Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-gray-700">Scenario Modeling</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scenario Modeling</h1>
          <p className="text-sm text-gray-500 mt-0.5">Model what-if assumptions and see projected P&amp;L impact.</p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm(periods[0]?.id ? String(periods[0].id) : ''))
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
        >
          <PlusCircle size={15} />
          New Scenario
        </button>
      </div>

      {periods.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-700 mb-6">
          No financial periods found. Add a period with line items first before creating scenarios.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Scenario list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Saved Scenarios</h2>
            </div>
            {isLoading && <div className="p-4 text-sm text-gray-400">Loading…</div>}
            {!isLoading && scenarios.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <FlaskConical size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No scenarios yet.</p>
                <p className="text-xs text-gray-400 mt-0.5">Create one to model what-if assumptions.</p>
              </div>
            )}
            {!isLoading && scenarios.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {scenarios.map((s) => {
                  const period = periods.find((p) => p.id === s.period_id)
                  return (
                    <li
                      key={s.id}
                      onClick={() => selectScenario(s)}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${activeScenarioId === s.id ? 'bg-teal-50 border-l-2 border-teal-500' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                          {period && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {PERIOD_TYPE_LABELS[period.period_type] ?? period.period_type} · {period.period_date}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id) }}
                          className="text-gray-300 hover:text-red-500 flex-shrink-0 mt-0.5"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {s.revenue_change_pct !== 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.revenue_change_pct > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            Rev {fmtPct(s.revenue_change_pct)}
                          </span>
                        )}
                        {s.cogs_change_pct !== 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cogs_change_pct < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            COGS {fmtPct(s.cogs_change_pct)}
                          </span>
                        )}
                        {s.opex_change_pct !== 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.opex_change_pct < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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

        {/* Scenario detail / editor */}
        <div className="lg:col-span-2">
          {!activeScenario && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-center">
              <FlaskConical size={36} className="text-gray-200 mb-3" />
              <p className="text-gray-600 font-medium">Select or create a scenario</p>
              <p className="text-sm text-gray-400 mt-1">Adjust assumptions with the sliders to see projected P&amp;L impact.</p>
            </div>
          )}

          {activeScenario && editForm && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{activeScenario.name}</h2>
                  {activeScenario.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{activeScenario.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  Period #{activeScenario.period_id}
                </span>
              </div>

              {/* Sliders */}
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Assumptions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <SliderInput
                    label="Revenue change"
                    value={editForm.revenue_change_pct}
                    onChange={(v) => setEditForm((f) => f ? { ...f, revenue_change_pct: v } : f)}
                  />
                  <SliderInput
                    label="COGS change"
                    value={editForm.cogs_change_pct}
                    onChange={(v) => setEditForm((f) => f ? { ...f, cogs_change_pct: v } : f)}
                  />
                  <SliderInput
                    label="Operating expenses change"
                    value={editForm.opex_change_pct}
                    onChange={(v) => setEditForm((f) => f ? { ...f, opex_change_pct: v } : f)}
                  />
                  <SliderInput
                    label="Commodity price shift"
                    value={editForm.commodity_price_change_pct}
                    onChange={(v) => setEditForm((f) => f ? { ...f, commodity_price_change_pct: v } : f)}
                  />
                  <SliderInput
                    label="Other income change"
                    value={editForm.other_income_change_pct}
                    onChange={(v) => setEditForm((f) => f ? { ...f, other_income_change_pct: v } : f)}
                  />
                  <SliderInput
                    label="Other expense change"
                    value={editForm.other_expense_change_pct}
                    onChange={(v) => setEditForm((f) => f ? { ...f, other_expense_change_pct: v } : f)}
                  />
                </div>
                <button
                  onClick={() => setProjectionKey(k => k + 1)}
                  className="mt-5 w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors flex items-center justify-center gap-2"
                >
                  {projecting ? 'Calculating…' : (
                    <>
                      <TrendingUp size={15} />
                      Run Projection
                    </>
                  )}
                </button>
              </div>

              {/* Projection results */}
              <div className="px-6 py-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Projected P&amp;L</h3>
                {projecting && <div className="py-8 text-center text-sm text-gray-400">Calculating projection…</div>}
                {!projecting && !projection && (
                  <div className="py-8 text-center text-sm text-gray-400">Adjust assumptions and click Run Projection.</div>
                )}
                {!projecting && projection && <ProjectionTable pnl={projection} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Scenario Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Scenario</h2>
              <button onClick={() => { setShowModal(false); setFormError(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scenario name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Oil price recovery"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Brief description of the scenario"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base period</label>
                <select
                  required
                  value={form.period_id}
                  onChange={(e) => setForm((f) => ({ ...f, period_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  onClick={() => { setShowModal(false); setFormError(null) }}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium rounded-md px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create Scenario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

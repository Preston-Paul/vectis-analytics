import { useEffect, useMemo, useState } from 'react'
import { useTradingData } from '../../hooks/trading/useTradingData'
import type {
  OptionContract,
  StrategyAnalysis,
  StrategyDefinition,
  StrategyLeg,
} from '../../types/trading'

function formatCurrency(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '--'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`
}

function formatNumber(value: number, digits = 2) {
  return value.toFixed(digits)
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc' }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{hint}</div> : null}
    </div>
  )
}

function buildLegLabel(leg: StrategyLeg) {
  return `${leg.side.toUpperCase()} ${leg.quantity} ${leg.right.toUpperCase()} ${formatNumber(leg.strike, 0)}`
}

function buildPresetLegs(
  preset: string,
  spot: number,
  contracts: OptionContract[],
): StrategyLeg[] {
  const sortedCalls = contracts
    .filter((contract) => contract.right === 'call')
    .sort((a, b) => a.strike - b.strike)

  const sortedPuts = contracts
    .filter((contract) => contract.right === 'put')
    .sort((a, b) => a.strike - b.strike)

  const nearestCall = sortedCalls.reduce((closest, contract) => {
    const currentDiff = Math.abs(contract.strike - spot)
    const prevDiff = Math.abs(closest.strike - spot)
    return currentDiff < prevDiff ? contract : closest
  }, sortedCalls[0])

  const nearestPut = sortedPuts.reduce((closest, contract) => {
    const currentDiff = Math.abs(contract.strike - spot)
    const prevDiff = Math.abs(closest.strike - spot)
    return currentDiff < prevDiff ? contract : closest
  }, sortedPuts[0])

  const higherCall =
    sortedCalls.find((contract) => contract.strike > nearestCall.strike) ?? nearestCall

  const lowerPut =
    [...sortedPuts].reverse().find((contract) => contract.strike < nearestPut.strike) ?? nearestPut

  if (preset === 'long-call') {
    return [
      {
        contractSymbol: nearestCall.symbol,
        right: 'call',
        side: 'long',
        strike: nearestCall.strike,
        expiry: nearestCall.expiry,
        premium: nearestCall.mark,
        quantity: 1,
      },
    ]
  }

  if (preset === 'bull-call-spread') {
    return [
      {
        contractSymbol: nearestCall.symbol,
        right: 'call',
        side: 'long',
        strike: nearestCall.strike,
        expiry: nearestCall.expiry,
        premium: nearestCall.mark,
        quantity: 1,
      },
      {
        contractSymbol: higherCall.symbol,
        right: 'call',
        side: 'short',
        strike: higherCall.strike,
        expiry: higherCall.expiry,
        premium: higherCall.mark,
        quantity: 1,
      },
    ]
  }

  if (preset === 'long-put') {
    return [
      {
        contractSymbol: nearestPut.symbol,
        right: 'put',
        side: 'long',
        strike: nearestPut.strike,
        expiry: nearestPut.expiry,
        premium: nearestPut.mark,
        quantity: 1,
      },
    ]
  }

  if (preset === 'bear-put-spread') {
    return [
      {
        contractSymbol: nearestPut.symbol,
        right: 'put',
        side: 'long',
        strike: nearestPut.strike,
        expiry: nearestPut.expiry,
        premium: nearestPut.mark,
        quantity: 1,
      },
      {
        contractSymbol: lowerPut.symbol,
        right: 'put',
        side: 'short',
        strike: lowerPut.strike,
        expiry: lowerPut.expiry,
        premium: lowerPut.mark,
        quantity: 1,
      },
    ]
  }

  if (preset === 'long-straddle') {
    return [
      {
        contractSymbol: nearestCall.symbol,
        right: 'call',
        side: 'long',
        strike: nearestCall.strike,
        expiry: nearestCall.expiry,
        premium: nearestCall.mark,
        quantity: 1,
      },
      {
        contractSymbol: nearestPut.symbol,
        right: 'put',
        side: 'long',
        strike: nearestPut.strike,
        expiry: nearestPut.expiry,
        premium: nearestPut.mark,
        quantity: 1,
      },
    ]
  }

  return []
}

function PayoffChart({
  points,
  spot,
}: {
  points: Array<{ price: number; pnl: number }>
  spot: number
}) {
  const width = 920
  const height = 320
  const padding = 32

  const pnlValues = points.map((point) => point.pnl)
  const minY = Math.min(...pnlValues, 0)
  const maxY = Math.max(...pnlValues, 0)
  const yRange = maxY - minY || 1

  const priceMin = points[0]?.price ?? 0
  const priceMax = points[points.length - 1]?.price ?? 1
  const xRange = priceMax - priceMin || 1

  const toX = (price: number) =>
    padding + ((price - priceMin) / xRange) * (width - padding * 2)

  const toY = (pnl: number) =>
    height - padding - ((pnl - minY) / yRange) * (height - padding * 2)

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point.price)} ${toY(point.pnl)}`)
    .join(' ')

  const zeroY = toY(0)
  const spotX = toX(spot)

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>
        Expiration Payoff
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = padding + (tick / 4) * (height - padding * 2)
            const rawValue = maxY - (tick / 4) * yRange

            return (
              <g key={tick}>
                <line
                  x1={padding}
                  x2={width - padding}
                  y1={y}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />
                <text x={4} y={y + 4} fill="#64748b" fontSize="11">
                  {formatCurrency(rawValue, 0)}
                </text>
              </g>
            )
          })}

          <line
            x1={padding}
            x2={width - padding}
            y1={zeroY}
            y2={zeroY}
            stroke="#94a3b8"
            strokeDasharray="5 5"
          />

          <line
            x1={spotX}
            x2={spotX}
            y1={padding}
            y2={height - padding}
            stroke="#f59e0b"
            strokeDasharray="6 6"
          />

          <path
            d={path}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {[priceMin, (priceMin + priceMax) / 2, priceMax].map((price, index) => (
            <text
              key={index}
              x={toX(price)}
              y={height - 8}
              fill="#64748b"
              fontSize="11"
              textAnchor="middle"
            >
              {formatCurrency(price, 0)}
            </text>
          ))}
        </svg>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>
        Dashed vertical line marks current spot. Horizontal dashed line marks breakeven P&amp;L = 0.
      </div>
    </div>
  )
}

export default function StrategiesPage() {
  const [symbol, setSymbol] = useState('SPY')
  const [symbolInput, setSymbolInput] = useState('SPY')
  const [selectedExpiry, setSelectedExpiry] = useState('')
  const [preset, setPreset] = useState('long-call')
  const [legs, setLegs] = useState<StrategyLeg[]>([])
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null)
  const [running, setRunning] = useState(false)

  const {
    chain,
    error,
    refreshAll,
    analyzeStrategy,
  } = useTradingData({
    symbol,
    daysToExpiry: 30,
  })

  useEffect(() => {
    if (!selectedExpiry && chain?.expiries?.length) {
      setSelectedExpiry(chain.expiries[0].expiry)
    }
  }, [chain, selectedExpiry])

  const availableContracts = useMemo(() => {
    if (!chain) return []
    const expiry = selectedExpiry || chain.expiries[0]?.expiry
    return chain.contracts.filter((contract) => contract.expiry === expiry)
  }, [chain, selectedExpiry])

  const spot = chain?.underlying.price ?? 0

  const onLoadSymbol = async () => {
    const next = symbolInput.trim().toUpperCase()
    if (!next) return
    setSymbol(next)
    setSelectedExpiry('')
    setLegs([])
    setAnalysis(null)
  }

  const onApplyPreset = () => {
    if (!spot || !availableContracts.length) return
    const nextLegs = buildPresetLegs(preset, spot, availableContracts)
    setLegs(nextLegs)
    setAnalysis(null)
  }

  const onAddLeg = () => {
    const first = availableContracts[0]
    if (!first) return

    setLegs((current) => [
      ...current,
      {
        contractSymbol: first.symbol,
        right: first.right,
        side: 'long',
        strike: first.strike,
        expiry: first.expiry,
        premium: first.mark,
        quantity: 1,
      },
    ])
    setAnalysis(null)
  }

  const onUpdateLeg = <K extends keyof StrategyLeg>(
    index: number,
    key: K,
    value: StrategyLeg[K],
  ) => {
    setLegs((current) =>
      current.map((leg, legIndex) =>
        legIndex === index ? { ...leg, [key]: value } : leg,
      ),
    )
    setAnalysis(null)
  }

  const onUpdateLegContract = (index: number, symbolValue: string) => {
    const contract = availableContracts.find((item) => item.symbol === symbolValue)
    if (!contract) return

    setLegs((current) =>
      current.map((leg, legIndex) =>
        legIndex === index
          ? {
              ...leg,
              contractSymbol: contract.symbol,
              right: contract.right,
              strike: contract.strike,
              expiry: contract.expiry,
              premium: contract.mark,
            }
          : leg,
      ),
    )
    setAnalysis(null)
  }

  const onRemoveLeg = (index: number) => {
    setLegs((current) => current.filter((_, legIndex) => legIndex !== index))
    setAnalysis(null)
  }

  const onAnalyze = async () => {
    if (!legs.length || !spot) return

    const payload: StrategyDefinition = {
      symbol,
      spot,
      expiry: selectedExpiry,
      legs,
    }

    try {
      setRunning(true)
      const nextAnalysis = await analyzeStrategy(payload)
      setAnalysis(nextAnalysis)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        color: '#e2e8f0',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1480, margin: '0 auto', display: 'grid', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 30, color: '#f8fafc' }}>Strategies</h1>
            <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
              Build multi-leg trades, inspect payoff, and review breakevens.
            </p>
          </div>

          <button
            onClick={() => void refreshAll()}
            style={{
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#e2e8f0',
              padding: '10px 14px',
              borderRadius: 12,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Refresh Market Data
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 0.95fr) minmax(0, 2fr)',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 16,
              padding: 18,
              display: 'grid',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              Strategy Inputs
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Underlying</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={symbolInput}
                  onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
                  placeholder="SPY"
                  style={{
                    flex: 1,
                    background: '#020617',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                />
                <button
                  onClick={() => void onLoadSymbol()}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Load
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Expiry</label>
              <select
                value={selectedExpiry}
                onChange={(event) => {
                  setSelectedExpiry(event.target.value)
                  setLegs([])
                  setAnalysis(null)
                }}
                style={{
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                {(chain?.expiries ?? []).map((expiry) => (
                  <option key={expiry.expiry} value={expiry.expiry}>
                    {expiry.expiry} ({expiry.daysToExpiry} DTE)
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                background: '#020617',
                border: '1px solid #1e293b',
                borderRadius: 14,
                padding: 14,
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Spot</span>
                <strong>{spot ? formatCurrency(spot) : '--'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Contracts</span>
                <strong>{availableContracts.length}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Preset strategy</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={preset}
                  onChange={(event) => setPreset(event.target.value)}
                  style={{
                    flex: 1,
                    background: '#020617',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <option value="long-call">Long Call</option>
                  <option value="bull-call-spread">Bull Call Spread</option>
                  <option value="long-put">Long Put</option>
                  <option value="bear-put-spread">Bear Put Spread</option>
                  <option value="long-straddle">Long Straddle</option>
                </select>
                <button
                  onClick={onApplyPreset}
                  style={{
                    background: '#1d4ed8',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Apply
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onAddLeg}
                style={{
                  flex: 1,
                  background: '#0f766e',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Add Leg
              </button>
              <button
                onClick={() => void onAnalyze()}
                disabled={!legs.length || running}
                style={{
                  flex: 1,
                  background: running ? '#1d4ed8' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 14px',
                  cursor: running ? 'wait' : 'pointer',
                  fontWeight: 700,
                  opacity: legs.length ? 1 : 0.6,
                }}
              >
                {running ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>

            {error ? (
              <div
                style={{
                  background: 'rgba(127, 29, 29, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 12,
                  padding: 12,
                  color: '#fecaca',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>Strategy Legs</h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{legs.length} legs</span>
              </div>

              {!legs.length ? (
                <div style={{ padding: 18, color: '#94a3b8' }}>
                  Apply a preset or add legs manually to begin building a strategy.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12, padding: 16 }}>
                  {legs.map((leg, index) => (
                    <div
                      key={`${leg.contractSymbol}-${index}`}
                      style={{
                        background: '#020617',
                        border: '1px solid #1e293b',
                        borderRadius: 14,
                        padding: 14,
                        display: 'grid',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                          {buildLegLabel(leg)}
                        </div>
                        <button
                          onClick={() => onRemoveLeg(index)}
                          style={{
                            background: '#7f1d1d',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '8px 10px',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.6fr 0.8fr 0.8fr 0.8fr',
                          gap: 10,
                        }}
                      >
                        <select
                          value={leg.contractSymbol}
                          onChange={(event) => onUpdateLegContract(index, event.target.value)}
                          style={{
                            background: '#0f172a',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            borderRadius: 10,
                            padding: '10px 12px',
                          }}
                        >
                          {availableContracts.map((contract) => (
                            <option key={contract.symbol} value={contract.symbol}>
                              {contract.symbol} • {contract.right.toUpperCase()} • {formatNumber(contract.strike, 0)}
                            </option>
                          ))}
                        </select>

                        <select
                          value={leg.side}
                          onChange={(event) => onUpdateLeg(index, 'side', event.target.value as StrategyLeg['side'])}
                          style={{
                            background: '#0f172a',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            borderRadius: 10,
                            padding: '10px 12px',
                          }}
                        >
                          <option value="long">Long</option>
                          <option value="short">Short</option>
                        </select>

                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={leg.quantity}
                          onChange={(event) => onUpdateLeg(index, 'quantity', Number(event.target.value))}
                          style={{
                            background: '#0f172a',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            borderRadius: 10,
                            padding: '10px 12px',
                          }}
                        />

                        <input
                          type="number"
                          step="0.01"
                          value={leg.premium}
                          onChange={(event) => onUpdateLeg(index, 'premium', Number(event.target.value))}
                          style={{
                            background: '#0f172a',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            borderRadius: 10,
                            padding: '10px 12px',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!analysis ? (
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 16,
                  padding: 24,
                  color: '#94a3b8',
                }}
              >
                Analyze the strategy to generate payoff, breakevens, and risk metrics.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: 16,
                  }}
                >
                  <StatCard
                    label="Net Premium"
                    value={formatCurrency(analysis.netPremium)}
                    hint={analysis.netPremium >= 0 ? 'Net credit' : 'Net debit'}
                  />
                  <StatCard
                    label="Max Profit"
                    value={formatCurrency(analysis.maxProfit)}
                    hint="At expiration"
                  />
                  <StatCard
                    label="Max Loss"
                    value={formatCurrency(analysis.maxLoss)}
                    hint="At expiration"
                  />
                  <StatCard
                    label="Breakevens"
                    value={
                      analysis.breakevens.length
                        ? analysis.breakevens.map((value) => formatCurrency(value, 0)).join(', ')
                        : 'None'
                    }
                    hint="Underlying prices at zero P&L"
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 0.9fr)',
                    gap: 20,
                    alignItems: 'start',
                  }}
                >
                  <PayoffChart points={analysis.payoffCurve} spot={spot} />

                  <div
                    style={{
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: 16,
                      padding: 18,
                      display: 'grid',
                      gap: 14,
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                      Strategy Summary
                    </div>

                    <div
                      style={{
                        background: '#020617',
                        border: '1px solid #1e293b',
                        borderRadius: 14,
                        padding: 14,
                        display: 'grid',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Spot</span>
                        <strong>{formatCurrency(spot)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Legs</span>
                        <strong>{analysis.legs.length}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Delta</span>
                        <strong>{formatNumber(analysis.greeks.delta, 3)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Gamma</span>
                        <strong>{formatNumber(analysis.greeks.gamma, 3)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Theta</span>
                        <strong>{formatNumber(analysis.greeks.theta, 3)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Vega</span>
                        <strong>{formatNumber(analysis.greeks.vega, 3)}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Leg Labels</div>
                      {analysis.legs.map((leg, index) => (
                        <div
                          key={`${leg.contractSymbol}-${index}`}
                          style={{
                            background: '#020617',
                            border: '1px solid #1e293b',
                            borderRadius: 10,
                            padding: '10px 12px',
                            color: '#cbd5e1',
                            fontSize: 13,
                          }}
                        >
                          {buildLegLabel(leg)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid #1e293b',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>Leg Breakdown</h3>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Premium and contract-level composition
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                      <thead>
                        <tr style={{ background: '#111827' }}>
                          {['Contract', 'Side', 'Right', 'Strike', 'Expiry', 'Qty', 'Premium'].map((label) => (
                            <th
                              key={label}
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                fontSize: 12,
                                color: '#94a3b8',
                                fontWeight: 600,
                                borderBottom: '1px solid #1e293b',
                              }}
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.legs.map((leg, index) => (
                          <tr key={`${leg.contractSymbol}-${index}`} style={{ borderBottom: '1px solid #172033' }}>
                            <td style={{ padding: '12px', color: '#f8fafc', fontWeight: 600 }}>
                              {leg.contractSymbol}
                            </td>
                            <td style={{ padding: '12px', color: leg.side === 'long' ? '#22c55e' : '#ef4444' }}>
                              {leg.side}
                            </td>
                            <td style={{ padding: '12px', color: '#cbd5e1' }}>{leg.right}</td>
                            <td style={{ padding: '12px', color: '#cbd5e1' }}>{formatNumber(leg.strike, 0)}</td>
                            <td style={{ padding: '12px', color: '#cbd5e1' }}>{leg.expiry}</td>
                            <td style={{ padding: '12px', color: '#cbd5e1' }}>{leg.quantity}</td>
                            <td style={{ padding: '12px', color: '#38bdf8' }}>{formatCurrency(leg.premium)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import { useTradingData } from '../../hooks/trading/useTradingData'
import type { MonteCarloSummary } from '../../types/trading'

function formatCurrency(value: number, digits = 2) {
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

function PathChart({
  paths,
  spot,
}: {
  paths: number[][]
  spot: number
}) {
  const width = 920
  const height = 320
  const padding = 30

  const visiblePaths = paths.slice(0, 40)
  const allValues = visiblePaths.flat()
  const minY = Math.min(...allValues, spot)
  const maxY = Math.max(...allValues, spot)
  const yRange = maxY - minY || 1
  const steps = Math.max(...visiblePaths.map((path) => path.length - 1), 1)

  const buildPath = (path: number[]) =>
    path
      .map((value, index) => {
        const x = padding + (index / steps) * (width - padding * 2)
        const y = height - padding - ((value - minY) / yRange) * (height - padding * 2)
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')

  const spotY = height - padding - ((spot - minY) / yRange) * (height - padding * 2)

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
        Simulated Paths
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
            y1={spotY}
            y2={spotY}
            stroke="#f59e0b"
            strokeDasharray="6 6"
            strokeWidth={2}
          />

          {visiblePaths.map((path, index) => (
            <path
              key={index}
              d={buildPath(path)}
              fill="none"
              stroke="rgba(56, 189, 248, 0.18)"
              strokeWidth={1.5}
            />
          ))}
        </svg>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>
        Showing first 40 simulated paths. Dashed line marks current spot.
      </div>
    </div>
  )
}

function DistributionBars({
  summary,
}: {
  summary: MonteCarloSummary
}) {
  const items = [
    { label: 'P05', value: summary.p05, color: '#ef4444' },
    { label: 'P25', value: summary.p25, color: '#f97316' },
    { label: 'P50', value: summary.medianPrice, color: '#38bdf8' },
    { label: 'P75', value: summary.p75, color: '#22c55e' },
    { label: 'P95', value: summary.p95, color: '#10b981' },
  ]

  const max = Math.max(...items.map((item) => item.value))

  return (
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
        Percentile Outcomes
      </div>

      {items.map((item) => (
        <div key={item.label} style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
            <span>{item.label}</span>
            <span>{formatCurrency(item.value)}</span>
          </div>
          <div
            style={{
              height: 10,
              background: '#111827',
              borderRadius: 999,
              overflow: 'hidden',
              border: '1px solid #1e293b',
            }}
          >
            <div
              style={{
                width: `${(item.value / max) * 100}%`,
                height: '100%',
                background: item.color,
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MonteCarloPage() {
  const [symbol, setSymbol] = useState('SPY')
  const [symbolInput, setSymbolInput] = useState('SPY')
  const [drift, setDrift] = useState(0.08)
  const [volatility, setVolatility] = useState(0.22)
  const [days, setDays] = useState(30)
  const [simulations, setSimulations] = useState(500)
  const [result, setResult] = useState<MonteCarloSummary | null>(null)
  const [running, setRunning] = useState(false)

  const {
    chain,
    error,
    refreshAll,
    runMonteCarloAnalysis,
  } = useTradingData({
    symbol,
    daysToExpiry: days,
  })

  useEffect(() => {
    if (chain && !result) {
      setVolatility(chain.ivSnapshot.currentIv)
    }
  }, [chain, result])

  const spot = chain?.underlying.price ?? 0

  const scenarioBias = useMemo(() => {
    if (!result || !spot) return null

    if (result.medianPrice > spot * 1.02) return 'Bullish distribution bias'
    if (result.medianPrice < spot * 0.98) return 'Bearish distribution bias'
    return 'Balanced distribution bias'
  }, [result, spot])

  const onLoadSymbol = async () => {
    const next = symbolInput.trim().toUpperCase()
    if (!next) return
    setSymbol(next)
    setResult(null)
  }

  const onRunSimulation = async () => {
    if (!spot) return

    try {
      setRunning(true)

      const nextResult = await runMonteCarloAnalysis({
        spot,
        drift,
        volatility,
        days,
        simulations,
        rate: 0.045,
      })

      setResult(nextResult)
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
      <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gap: 20 }}>
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
            <h1 style={{ margin: 0, fontSize: 30, color: '#f8fafc' }}>Monte Carlo</h1>
            <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
              Scenario paths, percentile outcomes, and probability analysis.
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
            gridTemplateColumns: 'minmax(320px, 0.95fr) minmax(0, 2fr)',
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
              Simulation Inputs
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
                <span>Current IV</span>
                <strong>{chain ? formatPercent(chain.ivSnapshot.currentIv * 100) : '--'}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Annual drift</label>
              <input
                type="number"
                step="0.01"
                value={drift}
                onChange={(event) => setDrift(Number(event.target.value))}
                style={{
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Annual volatility</label>
              <input
                type="number"
                step="0.01"
                value={volatility}
                onChange={(event) => setVolatility(Number(event.target.value))}
                style={{
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Days</label>
              <input
                type="number"
                step="1"
                min="1"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                style={{
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Simulations</label>
              <input
                type="number"
                step="100"
                min="100"
                value={simulations}
                onChange={(event) => setSimulations(Number(event.target.value))}
                style={{
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              />
            </div>

            <button
              onClick={() => void onRunSimulation()}
              disabled={!spot || running}
              style={{
                background: running ? '#1d4ed8' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '13px 16px',
                cursor: running ? 'wait' : 'pointer',
                fontWeight: 700,
                opacity: !spot ? 0.6 : 1,
              }}
            >
              {running ? 'Running Simulation...' : 'Run Monte Carlo'}
            </button>

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
            {!result ? (
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 16,
                  padding: 24,
                  color: '#94a3b8',
                }}
              >
                Run a simulation to generate paths, probabilities, and percentile outcomes.
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
                    label="Expected Price"
                    value={formatCurrency(result.expectedPrice)}
                    hint={scenarioBias ?? undefined}
                  />
                  <StatCard
                    label="Median (P50)"
                    value={formatCurrency(result.medianPrice)}
                    hint="Middle simulation outcome"
                  />
                  <StatCard
                    label="Probability Above Spot"
                    value={formatPercent(result.probabilityAboveSpot * 100)}
                    hint={`Below spot ${formatPercent(result.probabilityBelowSpot * 100)}`}
                  />
                  <StatCard
                    label="Expected Move"
                    value={formatCurrency(result.expectedMove)}
                    hint={`${days} day horizon`}
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
                  <PathChart paths={result.paths} spot={spot} />
                  <DistributionBars summary={result} />
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
                    <h3 style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>Scenario Table</h3>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Percentile summary of simulated terminal prices
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                      <thead>
                        <tr style={{ background: '#111827' }}>
                          {['Metric', 'Value', 'Interpretation'].map((label) => (
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
                        {[
                          ['P05', formatCurrency(result.p05), 'Stress downside scenario'],
                          ['P25', formatCurrency(result.p25), 'Weak but not extreme outcome'],
                          ['P50', formatCurrency(result.medianPrice), 'Median outcome'],
                          ['P75', formatCurrency(result.p75), 'Favorable outcome'],
                          ['P95', formatCurrency(result.p95), 'Strong upside scenario'],
                          ['Mean', formatCurrency(result.expectedPrice), 'Average across all simulations'],
                        ].map(([metric, value, interpretation]) => (
                          <tr key={metric} style={{ borderBottom: '1px solid #172033' }}>
                            <td style={{ padding: '12px', color: '#f8fafc', fontWeight: 600 }}>{metric}</td>
                            <td style={{ padding: '12px', color: '#38bdf8' }}>{value}</td>
                            <td style={{ padding: '12px', color: '#94a3b8' }}>{interpretation}</td>
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
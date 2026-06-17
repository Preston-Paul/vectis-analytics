import { useMemo, useState } from 'react'
import { useTradingData } from '../../hooks/trading/useTradingData'
import type { FlowRecord } from '../../types/trading'

function formatCurrency(value: number, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
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

function getFlowTone(record: FlowRecord) {
  const side = String(record.side ?? '').toLowerCase()
  const right = String(record.right ?? '').toLowerCase()
  const sentiment = String(record.sentiment ?? '').toLowerCase()

  if (sentiment === 'bullish') return '#22c55e'
  if (sentiment === 'bearish') return '#ef4444'

  if (right === 'call' && side.includes('ask')) return '#22c55e'
  if (right === 'put' && side.includes('ask')) return '#ef4444'
  if (right === 'call' && side.includes('bid')) return '#f97316'
  if (right === 'put' && side.includes('bid')) return '#38bdf8'

  return '#94a3b8'
}

function getFlowLabel(record: FlowRecord) {
  if (record.sentiment) return String(record.sentiment)
  const right = String(record.right ?? '').toUpperCase()
  const side = String(record.side ?? '')
  return `${right} • ${side}`
}

function FlowBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const width = max <= 0 ? 0 : (value / max) * 100

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
        <span>{label}</span>
        <span>{formatCurrency(value)}</span>
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
            width: `${width}%`,
            height: '100%',
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  )
}

export default function FlowPage() {
  const [symbol, setSymbol] = useState('SPY')
  const [symbolInput, setSymbolInput] = useState('SPY')
  const [typeFilter, setTypeFilter] = useState<'all' | 'sweep' | 'block'>('all')
  const [rightFilter, setRightFilter] = useState<'all' | 'call' | 'put'>('all')
  const [minPremium, setMinPremium] = useState(100000)
  const [selectedRecord, setSelectedRecord] = useState<FlowRecord | null>(null)

  const {
    flow,
    loading,
    error,
    refreshAll,
  } = useTradingData({
    symbol,
    daysToExpiry: 30,
  })

  const filteredFlow = useMemo(() => {
    return flow
      .filter((record) => {
        const recordType = String(record.tradeType ?? record.type ?? '').toLowerCase()
        const recordRight = String(record.right ?? '').toLowerCase()
        const premium = Number(record.premium ?? 0)

        const matchesType =
          typeFilter === 'all' ? true : recordType.includes(typeFilter)

        const matchesRight =
          rightFilter === 'all' ? true : recordRight === rightFilter

        return matchesType && matchesRight && premium >= minPremium
      })
      .sort((a, b) => Number(b.premium ?? 0) - Number(a.premium ?? 0))
  }, [flow, minPremium, rightFilter, typeFilter])

  const totals = useMemo(() => {
    let totalPremium = 0
    let bullishPremium = 0
    let bearishPremium = 0
    let callPremium = 0
    let putPremium = 0
    let sweepPremium = 0
    let blockPremium = 0

    for (const record of filteredFlow) {
      const premium = Number(record.premium ?? 0)
      const sentiment = String(record.sentiment ?? '').toLowerCase()
      const right = String(record.right ?? '').toLowerCase()
      const type = String(record.tradeType ?? record.type ?? '').toLowerCase()
      const side = String(record.side ?? '').toLowerCase()

      totalPremium += premium

      if (type.includes('sweep')) sweepPremium += premium
      if (type.includes('block')) blockPremium += premium

      if (right === 'call') callPremium += premium
      if (right === 'put') putPremium += premium

      if (
        sentiment === 'bullish' ||
        (right === 'call' && side.includes('ask')) ||
        (right === 'put' && side.includes('bid'))
      ) {
        bullishPremium += premium
      }

      if (
        sentiment === 'bearish' ||
        (right === 'put' && side.includes('ask')) ||
        (right === 'call' && side.includes('bid'))
      ) {
        bearishPremium += premium
      }
    }

    return {
      totalPremium,
      bullishPremium,
      bearishPremium,
      callPremium,
      putPremium,
      sweepPremium,
      blockPremium,
      callPutRatio: putPremium > 0 ? callPremium / putPremium : callPremium > 0 ? Infinity : 0,
    }
  }, [filteredFlow])

  const maxBucket = Math.max(
    totals.totalPremium,
    totals.bullishPremium,
    totals.bearishPremium,
    totals.callPremium,
    totals.putPremium,
    totals.sweepPremium,
    totals.blockPremium,
  )

  const onLoadSymbol = () => {
    const next = symbolInput.trim().toUpperCase()
    if (!next) return
    setSymbol(next)
    setSelectedRecord(null)
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
            <h1 style={{ margin: 0, fontSize: 30, color: '#f8fafc' }}>Flow</h1>
            <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
              Unusual options activity, premium concentration, and tape inspection.
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
            Refresh Flow
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(0, 2fr)',
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
              Flow Filters
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
                  onClick={onLoadSymbol}
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
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Trade type</label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'all' | 'sweep' | 'block')}
                style={{
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <option value="all">All</option>
                <option value="sweep">Sweeps</option>
                <option value="block">Blocks</option>
              </select>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Contract side</label>
              <select
                value={rightFilter}
                onChange={(event) => setRightFilter(event.target.value as 'all' | 'call' | 'put')}
                style={{
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <option value="all">Calls + Puts</option>
                <option value="call">Calls only</option>
                <option value="put">Puts only</option>
              </select>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Minimum premium</label>
              <input
                type="number"
                step="50000"
                min="0"
                value={minPremium}
                onChange={(event) => setMinPremium(Number(event.target.value))}
                style={{
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              />
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
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Premium Buckets</div>
              <FlowBar label="Total Premium" value={totals.totalPremium} max={maxBucket} color="#38bdf8" />
              <FlowBar label="Bullish Premium" value={totals.bullishPremium} max={maxBucket} color="#22c55e" />
              <FlowBar label="Bearish Premium" value={totals.bearishPremium} max={maxBucket} color="#ef4444" />
              <FlowBar label="Sweep Premium" value={totals.sweepPremium} max={maxBucket} color="#a855f7" />
              <FlowBar label="Block Premium" value={totals.blockPremium} max={maxBucket} color="#f59e0b" />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 16,
              }}
            >
              <StatCard
                label="Filtered Trades"
                value={String(filteredFlow.length)}
                hint="After current filters"
              />
              <StatCard
                label="Call Premium"
                value={formatCurrency(totals.callPremium)}
                hint={`Put premium ${formatCurrency(totals.putPremium)}`}
              />
              <StatCard
                label="Call / Put Ratio"
                value={Number.isFinite(totals.callPutRatio) ? formatNumber(totals.callPutRatio, 2) : '∞'}
                hint="Premium-based ratio"
              />
              <StatCard
                label="Net Premium Bias"
                value={formatCurrency(totals.bullishPremium - totals.bearishPremium)}
                hint="Bullish minus bearish premium"
              />
            </div>

            {loading ? (
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 16,
                  padding: 20,
                  color: '#94a3b8',
                }}
              >
                Loading flow data...
              </div>
            ) : null}

            {error ? (
              <div
                style={{
                  background: 'rgba(127, 29, 29, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 16,
                  padding: 16,
                  color: '#fecaca',
                }}
              >
                {error}
              </div>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 0.95fr)',
                gap: 20,
                alignItems: 'start',
              }}
            >
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
                  <h3 style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>Flow Tape</h3>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    Sorted by premium
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                    <thead>
                      <tr style={{ background: '#111827' }}>
                        {['Time', 'Symbol', 'Type', 'Right', 'Strike', 'Expiry', 'Side', 'Premium', 'Size', 'Price', 'Vol/OI'].map((label) => (
                          <th
                            key={label}
                            style={{
                              textAlign: 'right',
                              padding: '10px 12px',
                              fontSize: 12,
                              color: '#94a3b8',
                              fontWeight: 600,
                              borderBottom: '1px solid #1e293b',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFlow.map((record, index) => {
                        const premium = Number(record.premium ?? 0)
                        const size = Number(record.size ?? record.contracts ?? 0)
                        const price = Number(record.price ?? record.mark ?? 0)
                        const openInterest = Number(record.openInterest ?? 0)
                        const volOi = openInterest > 0 ? size / openInterest : size > 0 ? size : 0
                        const tone = getFlowTone(record)
                        const selected = selectedRecord?.id === record.id

                        return (
                          <tr
                            key={record.id ?? `${record.symbol}-${index}`}
                            onClick={() => setSelectedRecord(record)}
                            style={{
                              borderBottom: '1px solid #172033',
                              background: selected ? 'rgba(59, 130, 246, 0.16)' : 'transparent',
                              cursor: 'pointer',
                            }}
                          >
                            <td style={{ padding: '12px', textAlign: 'right', color: '#94a3b8' }}>
                              {String(record.timestamp ?? record.time ?? '--')}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#f8fafc', fontWeight: 600 }}>
                              {String(record.symbol ?? symbol)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                              {String(record.tradeType ?? record.type ?? '--').toUpperCase()}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: tone, fontWeight: 700 }}>
                              {String(record.right ?? '--').toUpperCase()}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                              {formatNumber(Number(record.strike ?? 0), 0)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                              {String(record.expiry ?? '--')}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                              {String(record.side ?? '--')}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: tone, fontWeight: 700 }}>
                              {formatCurrency(premium)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                              {size.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                              {formatNumber(price)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: volOi >= 1 ? '#22c55e' : '#94a3b8' }}>
                              {formatNumber(volOi, 2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 16,
                  padding: 18,
                  display: 'grid',
                  gap: 16,
                  position: 'sticky',
                  top: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Trade Inspector</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>
                    {selectedRecord ? String(selectedRecord.symbol ?? symbol) : 'No trade selected'}
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
                    {selectedRecord ? getFlowLabel(selectedRecord) : 'Select a trade from the flow tape.'}
                  </div>
                </div>

                {selectedRecord ? (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                      }}
                    >
                      <StatCard label="Premium" value={formatCurrency(Number(selectedRecord.premium ?? 0))} />
                      <StatCard label="Contracts" value={String(Number(selectedRecord.size ?? selectedRecord.contracts ?? 0).toLocaleString())} />
                      <StatCard label="Strike" value={formatNumber(Number(selectedRecord.strike ?? 0), 0)} />
                      <StatCard label="Price" value={formatNumber(Number(selectedRecord.price ?? selectedRecord.mark ?? 0))} />
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
                        <span>Type</span>
                        <strong>{String(selectedRecord.tradeType ?? selectedRecord.type ?? '--').toUpperCase()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Right</span>
                        <strong>{String(selectedRecord.right ?? '--').toUpperCase()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Side</span>
                        <strong>{String(selectedRecord.side ?? '--')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Expiry</span>
                        <strong>{String(selectedRecord.expiry ?? '--')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Open Interest</span>
                        <strong>{Number(selectedRecord.openInterest ?? 0).toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Sentiment</span>
                        <strong style={{ color: getFlowTone(selectedRecord) }}>
                          {getFlowLabel(selectedRecord)}
                        </strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#94a3b8' }}>
                    Click a sweep or block trade to inspect contract details and premium context.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
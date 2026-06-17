import { useMemo, useState } from 'react'
import { useTradingData } from '../../hooks/trading/useTradingData'
import type { OptionContract, OptionExpirySummary } from '../../types/trading'

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

function formatNumber(value: number, digits = 2) {
  return value.toFixed(digits)
}

function greekColor(value: number) {
  if (value > 0) return '#16a34a'
  if (value < 0) return '#dc2626'
  return '#94a3b8'
}

type ContractTableProps = {
  title: string
  contracts: OptionContract[]
  selectedContract: OptionContract | null
  onSelect: (contract: OptionContract) => void
}

function ContractTable({
  title,
  contracts,
  selectedContract,
  onSelect,
}: ContractTableProps) {
  return (
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
        <h3 style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>{title}</h3>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{contracts.length} contracts</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#111827' }}>
              {['Strike', 'Bid', 'Ask', 'Mark', 'IV', 'Delta', 'Gamma', 'Theta', 'Vega', 'OI', 'Vol'].map((label) => (
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
            {contracts.map((contract) => {
              const selected = selectedContract?.symbol === contract.symbol

              return (
                <tr
                  key={contract.symbol}
                  onClick={() => onSelect(contract)}
                  style={{
                    cursor: 'pointer',
                    background: selected ? 'rgba(59, 130, 246, 0.16)' : 'transparent',
                    borderBottom: '1px solid #172033',
                  }}
                >
                  <td style={{ padding: '12px', textAlign: 'right', color: '#f8fafc', fontWeight: 600 }}>
                    {formatNumber(contract.strike, 0)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                    {formatNumber(contract.bid)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                    {formatNumber(contract.ask)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#f8fafc' }}>
                    {formatNumber(contract.mark)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                    {formatPercent(contract.impliedVolatility * 100)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: greekColor(contract.greeks.delta) }}>
                    {formatNumber(contract.greeks.delta, 3)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                    {formatNumber(contract.greeks.gamma, 3)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: greekColor(contract.greeks.theta) }}>
                    {formatNumber(contract.greeks.theta, 3)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                    {formatNumber(contract.greeks.vega, 3)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#94a3b8' }}>
                    {contract.openInterest.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#94a3b8' }}>
                    {contract.volume.toLocaleString()}
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

type StatCardProps = {
  label: string
  value: string
  hint?: string
}

function StatCard({ label, value, hint }: StatCardProps) {
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
      <div style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc' }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{hint}</div> : null}
    </div>
  )
}

export default function OptionsLabPage() {
  const [symbol, setSymbol] = useState('SPY')
  const [symbolInput, setSymbolInput] = useState('SPY')
  const [selectedExpiry, setSelectedExpiry] = useState<string>('')
  const [selectedRight, setSelectedRight] = useState<'call' | 'put'>('call')
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(null)

  const {
    chain,
    expectedMove,
    loading,
    error,
    refreshAll,
  } = useTradingData({
    symbol,
    daysToExpiry: 30,
  })

  const expiries = chain?.expiries ?? []

  const activeExpiry = useMemo(() => {
    if (!expiries.length) return null
    return (
      expiries.find((expiry) => expiry.expiry === selectedExpiry) ??
      expiries[0]
    )
  }, [expiries, selectedExpiry])

  const contractsForExpiry = useMemo(() => {
    if (!chain || !activeExpiry) return []
    return chain.contracts.filter((contract) => contract.expiry === activeExpiry.expiry)
  }, [chain, activeExpiry])

  const calls = useMemo(
    () => contractsForExpiry.filter((contract) => contract.right === 'call'),
    [contractsForExpiry],
  )

  const puts = useMemo(
    () => contractsForExpiry.filter((contract) => contract.right === 'put'),
    [contractsForExpiry],
  )

  const displayedContracts = selectedRight === 'call' ? calls : puts

  const atmContract = useMemo(() => {
    if (!chain || !displayedContracts.length) return null
    return displayedContracts.reduce((closest, contract) => {
      const currentDiff = Math.abs(contract.strike - chain.underlying.price)
      const prevDiff = Math.abs(closest.strike - chain.underlying.price)
      return currentDiff < prevDiff ? contract : closest
    }, displayedContracts[0])
  }, [chain, displayedContracts])

  const inspector = selectedContract ?? atmContract ?? null

  const onSubmitSymbol = () => {
    const next = symbolInput.trim().toUpperCase()
    if (!next) return
    setSymbol(next)
    setSelectedContract(null)
    setSelectedExpiry('')
  }

  const onPickExpiry = (expiry: OptionExpirySummary) => {
    setSelectedExpiry(expiry.expiry)
    setSelectedContract(null)
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
            <h1 style={{ margin: 0, fontSize: 30, color: '#f8fafc' }}>Options Lab</h1>
            <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
              Chain analytics, IV, Greeks, and contract inspection.
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
            Refresh
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: 16,
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 16,
              padding: 16,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Underlying</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                value={symbolInput}
                onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
                placeholder="SPY"
                style={{
                  flex: 1,
                  minWidth: 180,
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              />
              <button
                onClick={onSubmitSymbol}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Load Symbol
              </button>
            </div>

            {chain ? (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Price</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc' }}>
                    {formatCurrency(chain.underlying.price)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Change</div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: chain.underlying.change >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {chain.underlying.change >= 0 ? '+' : ''}
                    {formatCurrency(chain.underlying.change)} ({formatPercent(chain.underlying.changePercent)})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Session</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#cbd5e1', textTransform: 'capitalize' }}>
                    {chain.underlying.session}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <StatCard
            label="Expected Move (30D)"
            value={expectedMove ? formatCurrency(expectedMove.expectedMove) : '--'}
            hint={
              expectedMove
                ? `${formatCurrency(expectedMove.lowerBound)} to ${formatCurrency(expectedMove.upperBound)}`
                : 'Waiting for data'
            }
          />

          <StatCard
            label="Current IV"
            value={chain ? formatPercent(chain.ivSnapshot.currentIv * 100) : '--'}
            hint={
              chain
                ? `IV Rank ${formatPercent(chain.ivSnapshot.ivRank)} • IV Percentile ${formatPercent(chain.ivSnapshot.ivPercentile)}`
                : 'Waiting for data'
            }
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
            Loading trading data...
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

        {chain ? (
          <>
            <div
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingBottom: 4,
              }}
            >
              {expiries.map((expiry) => {
                const active = activeExpiry?.expiry === expiry.expiry

                return (
                  <button
                    key={expiry.expiry}
                    onClick={() => onPickExpiry(expiry)}
                    style={{
                      minWidth: 150,
                      textAlign: 'left',
                      background: active ? '#1d4ed8' : '#0f172a',
                      color: '#f8fafc',
                      border: active ? '1px solid #3b82f6' : '1px solid #1e293b',
                      borderRadius: 14,
                      padding: 14,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{expiry.expiry}</div>
                    <div style={{ fontSize: 12, color: active ? '#dbeafe' : '#94a3b8', marginTop: 6 }}>
                      {expiry.daysToExpiry} DTE • ATM IV {formatPercent(expiry.atmIv * 100)}
                    </div>
                  </button>
                )
              })}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2.3fr) minmax(320px, 0.9fr)',
                gap: 20,
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setSelectedRight('call')}
                    style={{
                      background: selectedRight === 'call' ? '#166534' : '#0f172a',
                      border: selectedRight === 'call' ? '1px solid #22c55e' : '1px solid #1e293b',
                      color: '#f8fafc',
                      borderRadius: 12,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Calls
                  </button>
                  <button
                    onClick={() => setSelectedRight('put')}
                    style={{
                      background: selectedRight === 'put' ? '#991b1b' : '#0f172a',
                      border: selectedRight === 'put' ? '1px solid #ef4444' : '1px solid #1e293b',
                      color: '#f8fafc',
                      borderRadius: 12,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Puts
                  </button>
                </div>

                <ContractTable
                  title={`${selectedRight === 'call' ? 'Call' : 'Put'} Chain`}
                  contracts={displayedContracts}
                  selectedContract={inspector}
                  onSelect={setSelectedContract}
                />
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
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Contract Inspector</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>
                    {inspector ? inspector.symbol : 'No contract selected'}
                  </div>
                  {inspector ? (
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
                      {inspector.expiry} • {inspector.right.toUpperCase()} • {formatNumber(inspector.strike, 0)} strike
                    </div>
                  ) : null}
                </div>

                {inspector ? (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                      }}
                    >
                      <StatCard label="Mark" value={formatCurrency(inspector.mark)} />
                      <StatCard label="IV" value={formatPercent(inspector.impliedVolatility * 100)} />
                      <StatCard label="Intrinsic" value={formatCurrency(inspector.intrinsicValue)} />
                      <StatCard label="Extrinsic" value={formatCurrency(inspector.extrinsicValue)} />
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                      }}
                    >
                      <StatCard label="Delta" value={formatNumber(inspector.greeks.delta, 3)} />
                      <StatCard label="Gamma" value={formatNumber(inspector.greeks.gamma, 3)} />
                      <StatCard label="Theta" value={formatNumber(inspector.greeks.theta, 3)} />
                      <StatCard label="Vega" value={formatNumber(inspector.greeks.vega, 3)} />
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
                        <span>Bid / Ask</span>
                        <strong>{formatNumber(inspector.bid)} / {formatNumber(inspector.ask)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Open Interest</span>
                        <strong>{inspector.openInterest.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Volume</span>
                        <strong>{inspector.volume.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>DTE</span>
                        <strong>{inspector.daysToExpiry}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>ITM</span>
                        <strong>{inspector.inTheMoney ? 'Yes' : 'No'}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#94a3b8' }}>Select a contract from the chain to inspect it.</div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
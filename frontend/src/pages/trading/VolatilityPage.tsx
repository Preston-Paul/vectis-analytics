import { useEffect, useMemo, useState } from 'react'
import { useTradingData } from '../../hooks/trading/useTradingData'
import type { SkewPoint } from '../../types/trading'

function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`
}

function formatNumber(value: number, digits = 2) {
  return value.toFixed(digits)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mixColor(stops: string[], t: number) {
  const safe = clamp(t, 0, 1)
  const scaled = safe * (stops.length - 1)
  const index = Math.floor(scaled)
  const frac = scaled - index
  const a = stops[index]
  const b = stops[Math.min(index + 1, stops.length - 1)]

  const toRgb = (hex: string) => {
    const clean = hex.replace('#', '')
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    }
  }

  const ca = toRgb(a)
  const cb = toRgb(b)

  const r = Math.round(ca.r + (cb.r - ca.r) * frac)
  const g = Math.round(ca.g + (cb.g - ca.g) * frac)
  const bCh = Math.round(ca.b + (cb.b - ca.b) * frac)

  return `rgb(${r}, ${g}, ${bCh})`
}

function getIvColor(value: number, min: number, max: number) {
  const palette = ['#0f172a', '#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444']
  const range = max - min || 1
  const t = (value - min) / range
  return mixColor(palette, t)
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

function MiniBar({
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
        <span>{formatPercent(value * 100)}</span>
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

function LineChart({
  title,
  points,
  xKey,
  yKey,
  lineColor,
  yFormatter,
  height = 260,
}: {
  title: string
  points: Array<Record<string, number | string>>
  xKey: string
  yKey: string
  lineColor: string
  yFormatter?: (value: number) => string
  height?: number
}) {
  const width = 760
  const padding = 36

  if (!points.length) {
    return (
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 16,
          padding: 18,
          color: '#94a3b8',
        }}
      >
        {title} unavailable.
      </div>
    )
  }

  const numericY = points.map((point) => Number(point[yKey]))
  const minY = Math.min(...numericY)
  const maxY = Math.max(...numericY)
  const yRange = maxY - minY || 1

  const path = points
    .map((point, index) => {
      const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)
      const y =
        height - padding - ((Number(point[yKey]) - minY) / yRange) * (height - padding * 2)

      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>{title}</div>

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
                <text x={6} y={y + 4} fill="#64748b" fontSize="11">
                  {yFormatter ? yFormatter(rawValue) : formatNumber(rawValue)}
                </text>
              </g>
            )
          })}

          <path
            d={path}
            fill="none"
            stroke={lineColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => {
            const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)
            const y =
              height - padding - ((Number(point[yKey]) - minY) / yRange) * (height - padding * 2)

            return (
              <g key={`${point[xKey]}-${index}`}>
                <circle cx={x} cy={y} r={4} fill={lineColor} />
                <text
                  x={x}
                  y={height - 10}
                  fill="#64748b"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {String(point[xKey])}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function SkewChart({
  title,
  points,
  showCalls,
  showPuts,
}: {
  title: string
  points: SkewPoint[]
  showCalls: boolean
  showPuts: boolean
}) {
  const width = 760
  const height = 280
  const padding = 36

  const values = points
    .flatMap((point) => [showCalls ? point.callIv ?? 0 : null, showPuts ? point.putIv ?? 0 : null])
    .filter((value): value is number => typeof value === 'number')

  if (!values.length) {
    return (
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 16,
          padding: 18,
          color: '#94a3b8',
        }}
      >
        {title} unavailable.
      </div>
    )
  }

  const minY = Math.min(...values)
  const maxY = Math.max(...values)
  const yRange = maxY - minY || 1

  const buildPath = (key: 'callIv' | 'putIv') =>
    points
      .map((point, index) => {
        const iv = point[key]
        if (typeof iv !== 'number') return ''
        const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)
        const y = height - padding - ((iv - minY) / yRange) * (height - padding * 2)
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .filter(Boolean)
      .join(' ')

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>{title}</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
          {showCalls ? <span style={{ color: '#22c55e' }}>● Calls</span> : null}
          {showPuts ? <span style={{ color: '#ef4444' }}>● Puts</span> : null}
        </div>
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
                <text x={6} y={y + 4} fill="#64748b" fontSize="11">
                  {formatPercent(rawValue * 100)}
                </text>
              </g>
            )
          })}

          {showCalls ? (
            <path
              d={buildPath('callIv')}
              fill="none"
              stroke="#22c55e"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {showPuts ? (
            <path
              d={buildPath('putIv')}
              fill="none"
              stroke="#ef4444"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {points.map((point, index) => {
            const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)

            return (
              <text
                key={`${point.strike}-${index}`}
                x={x}
                y={height - 10}
                fill="#64748b"
                fontSize="11"
                textAnchor="middle"
              >
                {point.strike}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function SurfaceLegend({
  minIv,
  maxIv,
}: {
  minIv: number
  maxIv: number
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: 'linear-gradient(90deg, #0f172a 0%, #0ea5e9 20%, #22c55e 40%, #eab308 65%, #f97316 82%, #ef4444 100%)',
          border: '1px solid #1e293b',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
        <span>{formatPercent(minIv * 100)}</span>
        <span>Implied volatility</span>
        <span>{formatPercent(maxIv * 100)}</span>
      </div>
    </div>
  )
}

function SurfaceHeatmap({
  dtes,
  strikes,
  zMatrix,
  selectedExpiry,
  selectedStrike,
  onSelectCell,
}: {
  dtes: number[]
  strikes: number[]
  zMatrix: Array<Array<number | null>>
  selectedExpiry: number | null
  selectedStrike: number | null
  onSelectCell: (dte: number, strike: number, iv: number | null) => void
}) {
  const values = zMatrix.flat().filter((value): value is number => typeof value === 'number')
  const minIv = values.length ? Math.min(...values) : 0
  const maxIv = values.length ? Math.max(...values) : 1

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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>Surface Heatmap</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Strike on X-axis, DTE on Y-axis, color = IV.
          </div>
        </div>
        <div style={{ minWidth: 240 }}>
          <SurfaceLegend minIv={minIv} maxIv={maxIv} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: Math.max(760, strikes.length * 54) }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `84px repeat(${strikes.length}, minmax(44px, 1fr))`,
              gap: 6,
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div />
            {strikes.map((strike) => (
              <div
                key={strike}
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatNumber(strike, 0)}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            {dtes.map((dte, rowIndex) => (
              <div
                key={dte}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `84px repeat(${strikes.length}, minmax(44px, 1fr))`,
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'right',
                    paddingRight: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dte} DTE
                </div>

                {strikes.map((strike, colIndex) => {
                  const iv = zMatrix[rowIndex]?.[colIndex] ?? null
                  const active = selectedExpiry === dte && selectedStrike === strike

                  return (
                    <button
                      key={`${dte}-${strike}`}
                      onClick={() => onSelectCell(dte, strike, iv)}
                      style={{
                        height: 42,
                        borderRadius: 10,
                        border: active ? '2px solid #f8fafc' : '1px solid #1e293b',
                        background: iv == null ? '#020617' : getIvColor(iv, minIv, maxIv),
                        color: iv != null && iv > (minIv + maxIv) / 2 ? '#020617' : '#f8fafc',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        opacity: iv == null ? 0.35 : 1,
                      }}
                      title={iv == null ? `${dte} DTE • ${strike} strike • no IV` : `${dte} DTE • ${strike} strike • ${formatPercent(iv * 100)}`}
                    >
                      {iv == null ? '—' : formatNumber(iv * 100, 1)}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SurfacePerspective({
  dtes,
  strikes,
  zMatrix,
  selectedExpiry,
  selectedStrike,
  onSelectCell,
}: {
  dtes: number[]
  strikes: number[]
  zMatrix: Array<Array<number | null>>
  selectedExpiry: number | null
  selectedStrike: number | null
  onSelectCell: (dte: number, strike: number, iv: number | null) => void
}) {
  const values = zMatrix.flat().filter((value): value is number => typeof value === 'number')
  const minIv = values.length ? Math.min(...values) : 0
  const maxIv = values.length ? Math.max(...values) : 1
  const chartWidth = 860
  const chartHeight = 420
  const left = 90
  const bottom = 64
  const top = 30
  const right = 30
  const innerWidth = chartWidth - left - right
  const innerHeight = chartHeight - top - bottom

  const xStep = strikes.length > 1 ? innerWidth / (strikes.length - 1) : innerWidth
  const depthStep = dtes.length > 1 ? 22 : 0
  const heightScale = innerHeight * 0.7 / Math.max(maxIv - minIv, 0.0001)

  const projectPoint = (row: number, col: number, iv: number) => {
    const x = left + col * xStep - row * depthStep
    const y = chartHeight - bottom - (iv - minIv) * heightScale - row * 10
    return { x, y }
  }

  const gridLines = dtes.map((dte, rowIndex) => {
    const points = strikes
      .map((strike, colIndex) => {
        const iv = zMatrix[rowIndex]?.[colIndex]
        if (iv == null) return null
        return { strike, iv, ...projectPoint(rowIndex, colIndex, iv) }
      })
      .filter((point): point is { strike: number; iv: number; x: number; y: number } => point !== null)

    return { dte, rowIndex, points }
  })

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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>3D Surface View</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Perspective surface: strike × DTE × IV.
          </div>
        </div>
        <div style={{ minWidth: 240 }}>
          <SurfaceLegend minIv={minIv} maxIv={maxIv} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <defs>
            <linearGradient id="surfaceGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          <rect
            x="0"
            y="0"
            width={chartWidth}
            height={chartHeight}
            fill="#0b1120"
            rx="18"
          />

          {[0, 1, 2, 3, 4].map((tick) => {
            const iv = minIv + ((maxIv - minIv) * tick) / 4
            const y = chartHeight - bottom - (iv - minIv) * heightScale

            return (
              <g key={tick}>
                <line
                  x1={left - 12}
                  x2={chartWidth - right - 10}
                  y1={y}
                  y2={y}
                  stroke="#172033"
                  strokeDasharray="5 5"
                />
                <text x={10} y={y + 4} fontSize="11" fill="#64748b">
                  {formatPercent(iv * 100)}
                </text>
              </g>
            )
          })}

          {gridLines.map(({ dte, points, rowIndex }) => (
            <g key={dte}>
              {points.length > 1 ? (
                <polyline
                  fill="none"
                  stroke={`rgba(56, 189, 248, ${0.18 + rowIndex * 0.08})`}
                  strokeWidth={2}
                  points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                />
              ) : null}

              {points.map((point) => {
                const active = selectedExpiry === dte && selectedStrike === point.strike
                const tone = getIvColor(point.iv, minIv, maxIv)

                return (
                  <g key={`${dte}-${point.strike}`}>
                    <line
                      x1={point.x}
                      x2={point.x}
                      y1={chartHeight - bottom - rowIndex * 10}
                      y2={point.y}
                      stroke="rgba(148, 163, 184, 0.22)"
                      strokeDasharray="3 4"
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={active ? 7 : 5}
                      fill={tone}
                      stroke={active ? '#f8fafc' : '#020617'}
                      strokeWidth={active ? 2 : 1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectCell(dte, point.strike, point.iv)}
                    />
                  </g>
                )
              })}

              {points[0] ? (
                <text
                  x={points[0].x - 18}
                  y={chartHeight - bottom - rowIndex * 10 + 4}
                  fontSize="11"
                  fill="#64748b"
                  textAnchor="end"
                >
                  {dte}d
                </text>
              ) : null}
            </g>
          ))}

          {strikes.map((strike, colIndex) => {
            const x = left + colIndex * xStep

            return (
              <text
                key={strike}
                x={x}
                y={chartHeight - 18}
                fontSize="11"
                fill="#64748b"
                textAnchor="middle"
              >
                {formatNumber(strike, 0)}
              </text>
            )
          })}

          <text x={chartWidth / 2} y={chartHeight - 2} fontSize="12" fill="#94a3b8" textAnchor="middle">
            Strike
          </text>
          <text x={22} y={18} fontSize="12" fill="#94a3b8">
            IV
          </text>
        </svg>
      </div>
    </div>
  )
}

export default function VolatilityPage() {
  const [symbol, setSymbol] = useState('SPY')
  const [symbolInput, setSymbolInput] = useState('SPY')
  const [selectedExpiry, setSelectedExpiry] = useState('')
  const [showCalls, setShowCalls] = useState(true)
  const [showPuts, setShowPuts] = useState(true)
  const [surfaceView, setSurfaceView] = useState<'3d' | 'heatmap'>('3d')
  const [surfaceRight, setSurfaceRight] = useState<'mid' | 'call' | 'put'>('mid')
  const [selectedSurfaceCell, setSelectedSurfaceCell] = useState<{
    dte: number | null
    strike: number | null
    iv: number | null
  }>({
    dte: null,
    strike: null,
    iv: null,
  })

  const { chain, loading, error, refreshAll } = useTradingData({
    symbol,
    daysToExpiry: 30,
  })

  useEffect(() => {
    if (!selectedExpiry && chain?.expiries?.length) {
      setSelectedExpiry(chain.expiries[0].expiry)
    }
  }, [chain, selectedExpiry])

  const selectedExpiryData = useMemo(() => {
    if (!chain) return null
    return chain.expiries.find((expiry) => expiry.expiry === selectedExpiry) ?? chain.expiries[0] ?? null
  }, [chain, selectedExpiry])

  const skewPoints = useMemo(() => {
    if (!chain || !selectedExpiryData) return []
    return chain.skew[selectedExpiryData.expiry] ?? []
  }, [chain, selectedExpiryData])

  const maxTermIv = useMemo(() => {
    if (!chain?.termStructure?.length) return 0
    return Math.max(...chain.termStructure.map((point) => point.atmIv))
  }, [chain])

  const selectedSkewSummary = useMemo(() => {
    if (!skewPoints.length || !chain) return null

    const atm = skewPoints.reduce((closest, point) => {
      const currentDiff = Math.abs(point.strike - chain.underlying.price)
      const prevDiff = Math.abs(closest.strike - chain.underlying.price)
      return currentDiff < prevDiff ? point : closest
    }, skewPoints[0])

    const lowestStrike = skewPoints[0]
    const highestStrike = skewPoints[skewPoints.length - 1]

    return {
      atmCallIv: atm.callIv ?? 0,
      atmPutIv: atm.putIv ?? 0,
      wingCallIv: highestStrike.callIv ?? 0,
      wingPutIv: lowestStrike.putIv ?? 0,
      rr25: (highestStrike.callIv ?? 0) - (lowestStrike.putIv ?? 0),
      skewSlope: (lowestStrike.putIv ?? 0) - (atm.putIv ?? 0),
    }
  }, [skewPoints, chain])

  const surfaceData = useMemo(() => {
    if (!chain?.contracts?.length || !chain?.expiries?.length) {
      return {
        dtes: [] as number[],
        strikes: [] as number[],
        zMatrix: [] as Array<Array<number | null>>,
        minIv: 0,
        maxIv: 0,
      }
    }

    const expiryToDte = new Map(chain.expiries.map((expiry) => [expiry.expiry, expiry.daysToExpiry]))

    const grouped = new Map<string, { call?: number; put?: number }>()

    for (const contract of chain.contracts) {
      const expiry = String(contract.expiry ?? '')
      const strike = Number(contract.strike ?? 0)
      const right = String(contract.right ?? '').toLowerCase()
      const dte = expiryToDte.get(expiry)

      if (!expiry || !strike || dte == null) continue

      const iv =
        Number(
          (contract as { impliedVolatility?: number; iv?: number; markIv?: number }).impliedVolatility ??
            (contract as { impliedVolatility?: number; iv?: number; markIv?: number }).iv ??
            (contract as { impliedVolatility?: number; iv?: number; markIv?: number }).markIv ??
            NaN,
        )

      if (!Number.isFinite(iv) || iv <= 0) continue

      const key = `${dte}__${strike}`
      const current = grouped.get(key) ?? {}

      if (right === 'call') current.call = iv
      if (right === 'put') current.put = iv

      grouped.set(key, current)
    }

    const dtes = Array.from(new Set(chain.expiries.map((expiry) => expiry.daysToExpiry))).sort((a, b) => a - b)
    const strikes = Array.from(
      new Set(
        chain.contracts
          .map((contract) => Number(contract.strike ?? 0))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    ).sort((a, b) => a - b)

    const spot = Number(chain.underlying.price ?? 0)
    const trimmedStrikes =
      strikes.length > 18
        ? strikes
            .sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot))
            .slice(0, 18)
            .sort((a, b) => a - b)
        : strikes

    const zMatrix = dtes.map((dte) =>
      trimmedStrikes.map((strike) => {
        const key = `${dte}__${strike}`
        const record = grouped.get(key)

        if (!record) return null
        if (surfaceRight === 'call') return record.call ?? null
        if (surfaceRight === 'put') return record.put ?? null

        if (typeof record.call === 'number' && typeof record.put === 'number') {
          return (record.call + record.put) / 2
        }

        return record.call ?? record.put ?? null
      }),
    )

    const values = zMatrix.flat().filter((value): value is number => typeof value === 'number')

    return {
      dtes,
      strikes: trimmedStrikes,
      zMatrix,
      minIv: values.length ? Math.min(...values) : 0,
      maxIv: values.length ? Math.max(...values) : 0,
    }
  }, [chain, surfaceRight])

  const selectedSurfaceSummary = useMemo(() => {
    const { dte, strike, iv } = selectedSurfaceCell
    if (dte == null || strike == null || iv == null || !chain) return null

    const moneyness = chain.underlying.price ? strike / chain.underlying.price : 0

    return {
      dte,
      strike,
      iv,
      moneyness,
    }
  }, [selectedSurfaceCell, chain])

  const onSubmitSymbol = () => {
    const next = symbolInput.trim().toUpperCase()
    if (!next) return
    setSymbol(next)
    setSelectedExpiry('')
    setSelectedSurfaceCell({ dte: null, strike: null, iv: null })
  }

  const onSelectSurfaceCell = (dte: number, strike: number, iv: number | null) => {
    setSelectedSurfaceCell({ dte, strike, iv })
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
            <h1 style={{ margin: 0, fontSize: 30, color: '#f8fafc' }}>Volatility</h1>
            <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
              IV regime, smile, skew, term structure, and a full surface view.
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
            Loading volatility data...
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
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 16,
              }}
            >
              <StatCard
                label="Current IV"
                value={formatPercent(chain.ivSnapshot.currentIv * 100)}
                hint={`RV20 ${formatPercent((chain.ivSnapshot.realizedVol20d ?? 0) * 100)}`}
              />
              <StatCard
                label="IV Rank"
                value={formatPercent(chain.ivSnapshot.ivRank)}
                hint={`52W Low ${formatPercent(chain.ivSnapshot.low52Week * 100)} • High ${formatPercent(chain.ivSnapshot.high52Week * 100)}`}
              />
              <StatCard
                label="IV Percentile"
                value={formatPercent(chain.ivSnapshot.ivPercentile)}
                hint="Based on IV history lookback"
              />
              <StatCard
                label="ATM Term IV"
                value={selectedExpiryData ? formatPercent(selectedExpiryData.atmIv * 100) : '--'}
                hint={selectedExpiryData ? `${selectedExpiryData.daysToExpiry} DTE` : 'Select expiry'}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 0.9fr)',
                gap: 20,
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'grid', gap: 20 }}>
                {surfaceView === '3d' ? (
                  <SurfacePerspective
                    dtes={surfaceData.dtes}
                    strikes={surfaceData.strikes}
                    zMatrix={surfaceData.zMatrix}
                    selectedExpiry={selectedSurfaceCell.dte}
                    selectedStrike={selectedSurfaceCell.strike}
                    onSelectCell={onSelectSurfaceCell}
                  />
                ) : (
                  <SurfaceHeatmap
                    dtes={surfaceData.dtes}
                    strikes={surfaceData.strikes}
                    zMatrix={surfaceData.zMatrix}
                    selectedExpiry={selectedSurfaceCell.dte}
                    selectedStrike={selectedSurfaceCell.strike}
                    onSelectCell={onSelectSurfaceCell}
                  />
                )}

                <LineChart
                  title="ATM Term Structure"
                  points={chain.termStructure.map((point) => ({
                    label: `${point.daysToExpiry}d`,
                    dte: point.daysToExpiry,
                    atmIv: point.atmIv,
                  }))}
                  xKey="label"
                  yKey="atmIv"
                  lineColor="#38bdf8"
                  yFormatter={(value) => formatPercent(value * 100)}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 20,
                  position: 'sticky',
                  top: 20,
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
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>Surface Controls</div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>View</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setSurfaceView('3d')}
                        style={{
                          flex: 1,
                          background: surfaceView === '3d' ? '#2563eb' : '#020617',
                          color: '#fff',
                          border: '1px solid #334155',
                          borderRadius: 12,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        3D Surface
                      </button>
                      <button
                        onClick={() => setSurfaceView('heatmap')}
                        style={{
                          flex: 1,
                          background: surfaceView === 'heatmap' ? '#2563eb' : '#020617',
                          color: '#fff',
                          border: '1px solid #334155',
                          borderRadius: 12,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        Heatmap
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Surface source</div>
                    <select
                      value={surfaceRight}
                      onChange={(event) => setSurfaceRight(event.target.value as 'mid' | 'call' | 'put')}
                      style={{
                        background: '#020617',
                        color: '#f8fafc',
                        border: '1px solid #334155',
                        borderRadius: 12,
                        padding: '12px 14px',
                      }}
                    >
                      <option value="mid">Call/Put Mid IV</option>
                      <option value="call">Call IV only</option>
                      <option value="put">Put IV only</option>
                    </select>
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Selected Surface Node</div>
                    {selectedSurfaceSummary ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                          <span>DTE</span>
                          <strong>{selectedSurfaceSummary.dte}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                          <span>Strike</span>
                          <strong>{formatNumber(selectedSurfaceSummary.strike, 0)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                          <span>IV</span>
                          <strong>{formatPercent(selectedSurfaceSummary.iv * 100)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                          <span>Moneyness</span>
                          <strong>{formatNumber(selectedSurfaceSummary.moneyness, 3)}x spot</strong>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: 13 }}>
                        Click any node or heatmap cell to inspect that strike-expiry IV.
                      </div>
                    )}
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Surface Read</div>
                    <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                      A steep front-month ridge or hot downside cells usually means the market is pricing near-term fear. A flatter back-end often signals calmer longer-dated expectations.
                    </div>
                  </div>
                </div>

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
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>Term Structure Ladder</div>
                  {chain.termStructure.map((point) => (
                    <MiniBar
                      key={point.expiry}
                      label={`${point.daysToExpiry} DTE`}
                      value={point.atmIv}
                      max={maxTermIv}
                      color="#0ea5e9"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '280px 1fr',
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
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>Skew Controls</div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Expiry</div>
                  <select
                    value={selectedExpiryData?.expiry ?? ''}
                    onChange={(event) => setSelectedExpiry(event.target.value)}
                    style={{
                      background: '#020617',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: 12,
                      padding: '12px 14px',
                    }}
                  >
                    {chain.expiries.map((expiry) => (
                      <option key={expiry.expiry} value={expiry.expiry}>
                        {expiry.expiry} ({expiry.daysToExpiry} DTE)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cbd5e1' }}>
                    <input
                      type="checkbox"
                      checked={showCalls}
                      onChange={(event) => setShowCalls(event.target.checked)}
                    />
                    Show call skew
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cbd5e1' }}>
                    <input
                      type="checkbox"
                      checked={showPuts}
                      onChange={(event) => setShowPuts(event.target.checked)}
                    />
                    Show put skew
                  </label>
                </div>

                {selectedSkewSummary ? (
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Skew Snapshot</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>ATM Call IV</span>
                      <strong>{formatPercent(selectedSkewSummary.atmCallIv * 100)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>ATM Put IV</span>
                      <strong>{formatPercent(selectedSkewSummary.atmPutIv * 100)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>Downside Put Wing</span>
                      <strong>{formatPercent(selectedSkewSummary.wingPutIv * 100)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>Upside Call Wing</span>
                      <strong>{formatPercent(selectedSkewSummary.wingCallIv * 100)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>Risk Reversal</span>
                      <strong>{formatPercent(selectedSkewSummary.rr25 * 100)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>Put Skew Slope</span>
                      <strong>{formatPercent(selectedSkewSummary.skewSlope * 100)}</strong>
                    </div>
                  </div>
                ) : null}
              </div>

              <SkewChart
                title={`IV Skew • ${selectedExpiryData?.expiry ?? ''}`}
                points={skewPoints}
                showCalls={showCalls}
                showPuts={showPuts}
              />
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
                <h3 style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>Volatility Surface Table</h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  ATM IV by expiry and strike skew summary
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: '#111827' }}>
                      {['Expiry', 'DTE', 'ATM IV', 'Call IV', 'Put IV', 'Call Volume', 'Put Volume', 'Call OI', 'Put OI'].map((label) => (
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
                    {chain.expiries.map((expiry) => (
                      <tr key={expiry.expiry} style={{ borderBottom: '1px solid #172033' }}>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#f8fafc', fontWeight: 600 }}>
                          {expiry.expiry}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                          {expiry.daysToExpiry}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#38bdf8' }}>
                          {formatPercent(expiry.atmIv * 100)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#22c55e' }}>
                          {formatPercent(expiry.callIv * 100)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#ef4444' }}>
                          {formatPercent(expiry.putIv * 100)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#94a3b8' }}>
                          {expiry.totalCallVolume.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#94a3b8' }}>
                          {expiry.totalPutVolume.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#94a3b8' }}>
                          {expiry.totalCallOi.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#94a3b8' }}>
                          {expiry.totalPutOi.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
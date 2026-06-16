import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, BookmarkPlus, BookmarkCheck,
  RefreshCw, Filter,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from 'recharts'
import api from '../lib/api'
import type { CommodityPrice } from '../types'

// ---------------------------------------------------------------------------
// Simulated data with richer metadata (category + unit)
// ---------------------------------------------------------------------------

const SIMULATED_PRICES: CommodityPrice[] = [
  { symbol: 'WTI',  name: 'WTI Crude Oil',              price: 82.45, change_pct: 1.23,  unit: '$/bbl',  category: 'Crude Oil' },
  { symbol: 'BRT',  name: 'Brent Crude Oil',             price: 86.12, change_pct: 0.87,  unit: '$/bbl',  category: 'Crude Oil' },
  { symbol: 'NG',   name: 'Natural Gas (Henry Hub)',      price: 2.84,  change_pct: -2.15, unit: '$/MMBtu', category: 'Natural Gas' },
  { symbol: 'HO',   name: 'Heating Oil',                 price: 2.73,  change_pct: 0.45,  unit: '$/gal',  category: 'Refined' },
  { symbol: 'RBOB', name: 'RBOB Gasoline',               price: 2.61,  change_pct: -0.32, unit: '$/gal',  category: 'Refined' },
  { symbol: 'LNG',  name: 'Liquefied Natural Gas',        price: 9.35,  change_pct: 3.11,  unit: '$/MMBtu', category: 'Natural Gas' },
  { symbol: 'ETH',  name: 'Ethanol',                     price: 1.72,  change_pct: -0.88, unit: '$/gal',  category: 'Refined' },
  { symbol: 'SUL',  name: 'Ultra-Low Sulfur Diesel',      price: 2.85,  change_pct: 0.19,  unit: '$/gal',  category: 'Refined' },
]

async function fetchCommodityPrices(): Promise<CommodityPrice[]> {
  try {
    const res = await api.get('/commodity/prices')
    return res.data
  } catch {
    return SIMULATED_PRICES
  }
}

// ---------------------------------------------------------------------------
// PriceCard
// ---------------------------------------------------------------------------

function PriceCard({
  commodity,
  inWatchlist,
  onToggleWatchlist,
}: {
  commodity: CommodityPrice
  inWatchlist: boolean
  onToggleWatchlist: (symbol: string) => void
}) {
  const isPositive = commodity.change_pct >= 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{commodity.symbol}</span>
            {commodity.category && (
              <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{commodity.category}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mt-0.5 leading-snug">{commodity.name}</h3>
        </div>
        <button
          onClick={() => onToggleWatchlist(commodity.symbol)}
          title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
            inWatchlist
              ? 'text-teal-600 bg-teal-50 hover:bg-teal-100'
              : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'
          }`}
        >
          {inWatchlist ? <BookmarkCheck size={15} /> : <BookmarkPlus size={15} />}
        </button>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <span className="text-xl font-bold text-gray-900 tabular-nums">
            ${commodity.price.toFixed(2)}
          </span>
          {commodity.unit && (
            <span className="text-xs text-gray-400 ml-1">{commodity.unit}</span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${
          isPositive ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isPositive ? '+' : ''}{commodity.change_pct.toFixed(2)}%
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CommodityPage() {
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set())
  const [categoryFilter, setCategoryFilter] = useState<string>('All')

  const { data: prices = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['commodity-prices'],
    queryFn: fetchCommodityPrices,
    staleTime: 60 * 1000,
  })

  const categories = useMemo(() => {
    const cats = Array.from(new Set(prices.map((p) => p.category ?? 'Other').filter(Boolean)))
    return ['All', ...cats]
  }, [prices])

  const filteredPrices = useMemo(() => {
    if (categoryFilter === 'All') return prices
    return prices.filter((p) => (p.category ?? 'Other') === categoryFilter)
  }, [prices, categoryFilter])

  const watchlistPrices = prices.filter((p) => watchlist.has(p.symbol))

  const toggleWatchlist = (symbol: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev)
      next.has(symbol) ? next.delete(symbol) : next.add(symbol)
      return next
    })
  }

  // Build chart data sorted by change_pct descending
  const chartData = useMemo(
    () =>
      [...filteredPrices]
        .sort((a, b) => b.change_pct - a.change_pct)
        .map((p) => ({ name: p.symbol, change: p.change_pct })),
    [filteredPrices]
  )

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Market Prices</h1>
          <p className="text-gray-500 text-sm mt-0.5">Energy commodity prices and market data.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 font-medium rounded-md px-3 py-2 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-6 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          {/* Category filter tabs */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Filter size={14} className="text-gray-400 flex-shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Price grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
            {filteredPrices.map((commodity) => (
              <PriceCard
                key={commodity.symbol}
                commodity={commodity}
                inWatchlist={watchlist.has(commodity.symbol)}
                onToggleWatchlist={toggleWatchlist}
              />
            ))}
          </div>

          {/* Bar chart of daily changes */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Daily Change Overview</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                />
                <Tooltip
                  formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, 'Change']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.change >= 0 ? '#059669' : '#dc2626'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Watchlist */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Watchlist
              {watchlistPrices.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">({watchlistPrices.length} items)</span>
              )}
            </h2>

            {watchlistPrices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-gray-200 rounded-lg">
                <BookmarkPlus size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Your watchlist is empty.</p>
                <p className="text-xs text-gray-300 mt-1">Click the bookmark icon on any card to add it here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Symbol</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Category</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600 text-xs">Price</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600 text-xs">Change</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {watchlistPrices.map((p) => {
                      const isPositive = p.change_pct >= 0
                      return (
                        <tr key={p.symbol} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-xs text-gray-500 uppercase tracking-wider">{p.symbol}</td>
                          <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{p.category ?? '—'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                            ${p.price.toFixed(2)}
                            <span className="text-xs text-gray-400 ml-1">{p.unit}</span>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${
                            isPositive ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {isPositive ? '+' : ''}{p.change_pct.toFixed(2)}%
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => toggleWatchlist(p.symbol)}
                              className="text-teal-500 hover:text-red-500 transition-colors"
                              title="Remove from watchlist"
                            >
                              <BookmarkCheck size={15} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

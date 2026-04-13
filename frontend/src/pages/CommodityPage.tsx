import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, BookmarkPlus, BookmarkCheck, RefreshCw } from 'lucide-react'
import api from '../lib/api'
import type { CommodityPrice } from '../types'

// Simulated commodity data (used as fallback if API is not connected)
const SIMULATED_PRICES: CommodityPrice[] = [
  { symbol: 'WTI', name: 'WTI Crude Oil', price: 82.45, change_pct: 1.23 },
  { symbol: 'BRT', name: 'Brent Crude Oil', price: 86.12, change_pct: 0.87 },
  { symbol: 'NG', name: 'Natural Gas (Henry Hub)', price: 2.84, change_pct: -2.15 },
  { symbol: 'HO', name: 'Heating Oil', price: 2.73, change_pct: 0.45 },
  { symbol: 'RBOB', name: 'RBOB Gasoline', price: 2.61, change_pct: -0.32 },
  { symbol: 'LNG', name: 'Liquefied Natural Gas', price: 9.35, change_pct: 3.11 },
  { symbol: 'ETH', name: 'Ethanol', price: 1.72, change_pct: -0.88 },
  { symbol: 'SUL', name: 'Ultra-Low Sulfur Diesel', price: 2.85, change_pct: 0.19 },
]

async function fetchCommodityPrices(): Promise<CommodityPrice[]> {
  try {
    const res = await api.get('/commodity/prices')
    return res.data
  } catch {
    // Return simulated data if endpoint not available
    return SIMULATED_PRICES
  }
}

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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{commodity.symbol}</span>
          <h3 className="text-sm font-semibold text-gray-900 mt-0.5">{commodity.name}</h3>
        </div>
        <button
          onClick={() => onToggleWatchlist(commodity.symbol)}
          title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          className={`p-1.5 rounded-md transition-colors ${
            inWatchlist
              ? 'text-teal-600 bg-teal-50 hover:bg-teal-100'
              : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'
          }`}
        >
          {inWatchlist ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
        </button>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900">
          ${commodity.price.toFixed(2)}
        </span>
        <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          {isPositive ? '+' : ''}{commodity.change_pct.toFixed(2)}%
        </div>
      </div>
    </div>
  )
}

export default function CommodityPage() {
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set())

  const { data: prices = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['commodity-prices'],
    queryFn: fetchCommodityPrices,
    staleTime: 60 * 1000, // 1 minute
  })

  const toggleWatchlist = (symbol: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) {
        next.delete(symbol)
      } else {
        next.add(symbol)
      }
      return next
    })
  }

  const watchlistPrices = prices.filter((p) => watchlist.has(p.symbol))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Prices</h1>
          <p className="text-gray-600 mt-1">Energy commodity prices and market data.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 font-medium rounded-md px-4 py-2 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-20 text-gray-500">Loading prices…</div>
      )}

      {!isLoading && (
        <>
          {/* Price Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {prices.map((commodity) => (
              <PriceCard
                key={commodity.symbol}
                commodity={commodity}
                inWatchlist={watchlist.has(commodity.symbol)}
                onToggleWatchlist={toggleWatchlist}
              />
            ))}
          </div>

          {/* Watchlist */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Watchlist
              {watchlistPrices.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">({watchlistPrices.length} items)</span>
              )}
            </h2>

            {watchlistPrices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-gray-300 rounded-lg">
                <BookmarkPlus size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Your watchlist is empty.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click the bookmark icon on any price card to add it here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Symbol</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Price</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Change</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlistPrices.map((p, idx) => {
                      const isPositive = p.change_pct >= 0
                      return (
                        <tr key={p.symbol} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2.5 font-bold text-xs text-gray-500 uppercase tracking-wider">{p.symbol}</td>
                          <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-900">${p.price.toFixed(2)}</td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{p.change_pct.toFixed(2)}%
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => toggleWatchlist(p.symbol)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove from watchlist"
                            >
                              <BookmarkCheck size={15} className="text-teal-600" />
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

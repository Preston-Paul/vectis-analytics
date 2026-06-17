import TradingShell from '../../components/trading/TradingShell'

export default function VolatilityPage() {
  return (
    <TradingShell>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">Volatility</h2>
        <p className="mt-2 text-sm text-slate-400">
          This page will hold IV rank, skew, term structure, and the 3D volatility surface.
        </p>
      </div>
    </TradingShell>
  )
}
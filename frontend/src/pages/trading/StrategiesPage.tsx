import TradingShell from '../../components/trading/TradingShell'

export default function StrategiesPage() {
  return (
    <TradingShell>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">Strategies</h2>
        <p className="mt-2 text-sm text-slate-400">
          This page will hold multi-leg strategy construction, payoff charts, and net Greeks.
        </p>
      </div>
    </TradingShell>
  )
}
import TradingShell from '../../components/trading/TradingShell'

export default function PortfolioPage() {
  return (
    <TradingShell>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">Portfolio Risk</h2>
        <p className="mt-2 text-sm text-slate-400">
          This page will hold net exposure, expiration ladders, concentration risk, and scenario stress.
        </p>
      </div>
    </TradingShell>
  )
}
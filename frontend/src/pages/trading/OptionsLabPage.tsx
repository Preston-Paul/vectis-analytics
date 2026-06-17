import TradingShell from '../../components/trading/TradingShell'

export default function OptionsLabPage() {
  return (
    <TradingShell>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">Options Lab</h2>
        <p className="mt-2 text-sm text-slate-400">
          This page will hold the options chain, contract inspector, Greeks, theoretical pricing, and P/L analysis.
        </p>
      </div>
    </TradingShell>
  )
}
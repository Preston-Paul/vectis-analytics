import TradingShell from '../../components/trading/TradingShell'

export default function FlowPage() {
  return (
    <TradingShell>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">Flow</h2>
        <p className="mt-2 text-sm text-slate-400">
          This page will hold unusual flow, sweeps, blocks, and contract activity analytics.
        </p>
      </div>
    </TradingShell>
  )
}
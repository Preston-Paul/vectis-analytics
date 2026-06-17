import TradingShell from '../../components/trading/TradingShell'

export default function TradingHomePage() {
  return (
    <TradingShell>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Market Regime
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">Neutral</p>
            <p className="mt-2 text-sm text-slate-400">Macro tape, volatility regime, and broad positioning will go here.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Watchlist
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">0 Symbols</p>
            <p className="mt-2 text-sm text-slate-400">Saved symbols and quick access contracts will live here.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Portfolio Greeks
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">--</p>
            <p className="mt-2 text-sm text-slate-400">Net delta, gamma, theta, and vega summary placeholder.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Flow Alerts
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">--</p>
            <p className="mt-2 text-sm text-slate-400">Unusual flow, sweeps, blocks, and event-driven alerts.</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Main Canvas
            </p>
            <div className="mt-4 flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/50">
              <p className="text-sm text-slate-400">
                This area will hold charts, options chains, volatility surfaces, and scenario views.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Event Timeline
              </p>
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-4 text-sm text-slate-400">
                Earnings, FOMC, CPI, dividend dates, and catalyst overlays.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Saved Scenarios
              </p>
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-4 text-sm text-slate-400">
                Earnings crush, vol expansion, +5% move, 7 DTE theta decay, and custom presets.
              </div>
            </div>
          </div>
        </section>
      </div>
    </TradingShell>
  )
}
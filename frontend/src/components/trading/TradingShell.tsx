import type { ReactNode } from 'react'
import TradingSidebar from './TradingSidebar'
import TradingTopbar from './TradingTopbar'

type TradingShellProps = {
  children: ReactNode
}

export default function TradingShell({ children }: TradingShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TradingTopbar />

      <div className="flex min-h-[calc(100vh-72px)]">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-slate-900/70 xl:block">
          <TradingSidebar />
        </aside>

        <main className="flex-1 bg-slate-950">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>

        <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-slate-900/40 2xl:block">
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Inspector
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-slate-200">No contract selected</p>
              <p className="mt-2 text-sm text-slate-400">
                This panel will hold option details, Greeks, scenario controls, and trade actions.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
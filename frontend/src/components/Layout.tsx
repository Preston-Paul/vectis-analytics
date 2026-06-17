import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  FlaskConical,
  PanelLeftClose,
  LineChart,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/useToast'
import ToastContainer from './Toast'

const navItems = [
  { to: '/overview', icon: LayoutDashboard, label: 'Overview', match: ['/overview', '/dashboard'] },
  { to: '/workspace', icon: Building2, label: 'Workspace', match: ['/workspace', '/companies'] },
  { to: '/commodities', icon: TrendingUp, label: 'Commodities', match: ['/commodities', '/commodity'] },
  { to: '/trading', icon: LineChart, label: 'Trading', match: ['/trading'] },
]

function AppLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'gap-3'} overflow-hidden`}>
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-teal-500/10 ring-1 ring-teal-400/20 flex-shrink-0">
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-label="Vectis Analytics">
          <polygon
            points="14,3 24.5,21 3.5,21"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M14 3V21" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.55" />
          <circle cx="14" cy="12" r="2.4" fill="#2dd4bf" />
        </svg>
      </div>

      {!collapsed && (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white tracking-tight truncate">Vectis Analytics</p>
          <p className="text-[11px] text-slate-400 truncate">Financial intelligence workspace</p>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  if (typeof window !== 'undefined') {
    ;(window as Window & { __addToast?: typeof addToast }).__addToast = addToast
  }

  const pageMeta = useMemo(() => {
    const path = location.pathname

    if (path.startsWith('/trading/options')) {
      return {
        title: 'Options Lab',
        subtitle: 'Inspect chains, contracts, Greeks, theoretical value, and payoff views.',
      }
    }

    if (path.startsWith('/trading/volatility')) {
      return {
        title: 'Volatility',
        subtitle: 'Analyze IV rank, skew, term structure, and surface behavior.',
      }
    }

    if (path.startsWith('/trading/monte-carlo')) {
      return {
        title: 'Monte Carlo',
        subtitle: 'Run path simulations, terminal distributions, and probability scenarios.',
      }
    }

    if (path.startsWith('/trading/strategies')) {
      return {
        title: 'Strategies',
        subtitle: 'Compare multi-leg structures, payoff curves, and risk profiles.',
      }
    }

    if (path.startsWith('/trading/portfolio')) {
      return {
        title: 'Portfolio Risk',
        subtitle: 'Review net Greeks, concentration, expiration ladders, and scenario stress.',
      }
    }

    if (path.startsWith('/trading/flow')) {
      return {
        title: 'Flow',
        subtitle: 'Track unusual options flow, sweeps, blocks, and contract activity.',
      }
    }

    if (path.startsWith('/trading')) {
      return {
        title: 'Trading',
        subtitle: 'Advanced trading workspace for options, volatility, scenarios, and flow.',
      }
    }

    if (path.startsWith('/workspace/')) {
      return {
        title: 'Workspace',
        subtitle: 'Manage company periods, imports, and reporting workflows.',
      }
    }

    if (path.startsWith('/workspace') || path.startsWith('/companies')) {
      return {
        title: 'Workspace',
        subtitle: 'Choose a company workspace and move into operations.',
      }
    }

    if (path.startsWith('/financials')) {
      return {
        title: 'Financials',
        subtitle: 'Review statements, periods, and performance detail.',
      }
    }

    if (path.startsWith('/scenarios')) {
      return {
        title: 'Scenario Lab',
        subtitle: 'Run what-if analysis and compare planning outcomes.',
      }
    }

    if (path.startsWith('/commodities') || path.startsWith('/commodity')) {
      return {
        title: 'Commodities',
        subtitle: 'Track market pricing and commodity signals.',
      }
    }

    return {
      title: 'Overview',
      subtitle: 'Monitor portfolio health, activity, and planning readiness.',
    }
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:relative z-30 flex flex-col h-full bg-slate-950 text-white transition-all duration-300
          border-r border-slate-800
          ${collapsed ? 'w-20' : 'w-72'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800 min-h-[76px]">
          <AppLogo collapsed={collapsed} />
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className="px-3 pt-4 pb-2">
          {!collapsed ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Navigation</p>
              <p className="text-xs text-slate-400 mt-1">
                Move between overview, company workspaces, market inputs, and trading tools.
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <PanelLeftClose size={16} />
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, match }) => {
            const isActive = match.some((prefix) => location.pathname.startsWith(prefix))

            return (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-teal-500/10 text-teal-300 ring-1 ring-teal-400/20'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            )
          })}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <NavLink
              to="/scenarios"
              title={collapsed ? 'Scenario Lab' : undefined}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all
                ${location.pathname.startsWith('/scenarios')
                  ? 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/20'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <FlaskConical size={18} className="flex-shrink-0" />
              {!collapsed && <span>Scenario Lab</span>}
            </NavLink>
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          {!collapsed && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.full_name ?? 'User'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email ?? ''}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            title="Sign out"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <AppLogo />

          <button
            onClick={() => setMobileOpen(false)}
            className={`ml-auto text-slate-400 hover:text-white transition-colors ${
              mobileOpen ? 'block' : 'hidden'
            }`}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </header>

        <div className="border-b border-gray-200 bg-white">
          <div className="px-4 sm:px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
              Vectis Platform
            </p>
            <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{pageMeta.title}</h1>
                <p className="text-sm text-gray-500">{pageMeta.subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
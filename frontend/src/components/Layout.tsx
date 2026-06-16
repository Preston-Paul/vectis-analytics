import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Building2, TrendingUp, LogOut, User,
  ChevronLeft, ChevronRight, Menu, X,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/useToast'
import ToastContainer from './Toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/commodity', icon: TrendingUp, label: 'Market Prices' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Expose addToast via a data attribute on the root so child pages can trigger toasts
  // (simpler than a Context for this scope)
  if (typeof window !== 'undefined') {
    (window as Window & { __addToast?: typeof addToast }).__addToast = addToast
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-30 flex flex-col h-full bg-slate-900 text-white transition-all duration-300
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-700 min-h-[72px]">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-label="Vectis Analytics">
                <polygon points="14,2 26,22 2,22" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round" />
                <line x1="14" y1="2" x2="14" y2="22" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.5" />
                <line x1="2" y1="22" x2="26" y2="22" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.5" />
                <circle cx="14" cy="12" r="2.5" fill="#2dd4bf" />
              </svg>
              <span className="font-bold text-teal-400 text-base tracking-tight whitespace-nowrap">Vectis Analytics</span>
            </div>
          )}
          {collapsed && (
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-label="Vectis Analytics" className="mx-auto">
              <polygon points="14,2 26,22 2,22" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round" />
              <line x1="14" y1="2" x2="14" y2="22" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.5" />
              <circle cx="14" cy="12" r="2.5" fill="#2dd4bf" />
            </svg>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-teal-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info & logout */}
        <div className="px-2 py-4 border-t border-slate-700">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {user?.full_name?.charAt(0)?.toUpperCase() ?? <User size={14} />}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name ?? 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email ?? ''}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title="Sign out"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <polygon points="14,2 26,22 2,22" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="14" cy="12" r="2.5" fill="#2dd4bf" />
            </svg>
            <span className="font-bold text-teal-400 text-sm tracking-tight">Vectis Analytics</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className={`ml-auto text-slate-400 hover:text-white transition-colors ${
              mobileOpen ? 'block' : 'hidden'
            }`}
          >
            <X size={22} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

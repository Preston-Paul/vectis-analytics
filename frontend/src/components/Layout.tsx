import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Building2, TrendingUp, LogOut, User } from 'lucide-react'
import { useAuth } from '../lib/auth'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/commodity', icon: TrendingUp, label: 'Commodity Prices' },
]

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            {/* SVG mark */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Vectis Analytics logo mark">
              <polygon points="14,2 26,22 2,22" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round"/>
              <line x1="14" y1="2" x2="14" y2="22" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.5"/>
              <line x1="2" y1="22" x2="26" y2="22" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.5"/>
              <circle cx="14" cy="12" r="2.5" fill="#2dd4bf"/>
            </svg>
            <span className="font-bold text-teal-400 text-lg tracking-tight">Vectis Analytics</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-teal-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info & logout */}
        <div className="px-3 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name ?? 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <Outlet />
      </main>
    </div>
  )
}

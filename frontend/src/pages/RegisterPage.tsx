import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { getErrorMessage } from '../lib/api'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains a number', ok: /\d/.test(password) },
    { label: 'Contains uppercase', ok: /[A-Z]/.test(password) },
  ]
  if (!password) return null
  return (
    <ul className="mt-2 space-y-1">
      {checks.map((c) => (
        <li key={c.label} className={`flex items-center gap-1.5 text-xs ${
          c.ok ? 'text-emerald-400' : 'text-slate-500'
        }`}>
          {c.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {c.label}
        </li>
      ))}
    </ul>
  )
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', email: '', company_name: '', password: '', confirm_password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        company_name: form.company_name,
      })
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed.'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
  const labelClass = "block text-xs font-medium text-slate-300 mb-1.5"

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="flex items-center gap-2.5 mb-8">
        <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-label="Vectis Analytics">
          <polygon points="14,2 26,22 2,22" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round" />
          <line x1="14" y1="2" x2="14" y2="22" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.5" />
          <line x1="2" y1="22" x2="26" y2="22" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="14" cy="12" r="2.5" fill="#2dd4bf" />
        </svg>
        <span className="font-bold text-white text-xl tracking-tight">Vectis Analytics</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-8">
        <h1 className="text-xl font-bold text-white mb-1">Create account</h1>
        <p className="text-slate-400 mb-6 text-sm">Start tracking financials — no credit card required.</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="full_name" className={labelClass}>Full name</label>
            <input id="full_name" name="full_name" type="text" required value={form.full_name} onChange={handleChange} className={inputClass} placeholder="Jane Smith" />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} className={inputClass} placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="company_name" className={labelClass}>Company name</label>
            <input id="company_name" name="company_name" type="text" required value={form.company_name} onChange={handleChange} className={inputClass} placeholder="Acme Energy Ltd." />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>Password</label>
            <div className="relative">
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" required
                value={form.password} onChange={handleChange}
                className={`${inputClass} pr-10`}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>
          <div>
            <label htmlFor="confirm_password" className={labelClass}>Confirm password</label>
            <input
              id="confirm_password" name="confirm_password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password" required
              value={form.confirm_password} onChange={handleChange}
              className={`${inputClass} ${
                form.confirm_password && form.confirm_password !== form.password
                  ? 'border-red-700 focus:ring-red-500'
                  : ''
              }`}
              placeholder="••••••••"
            />
            {form.confirm_password && form.confirm_password !== form.password && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors mt-1"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-400 font-medium hover:text-teal-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-6 text-xs text-slate-600">
        &copy; {new Date().getFullYear()} Vectis Analytics
      </p>
    </div>
  )
}

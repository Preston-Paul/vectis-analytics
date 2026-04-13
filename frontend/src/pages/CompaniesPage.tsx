import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, MapPin, PlusCircle, X } from 'lucide-react'
import api from '../lib/api'
import type { Company } from '../types'

const INDUSTRIES: { label: string; value: string }[] = [
  { label: 'Oil & Gas', value: 'OIL_GAS' },
  { label: 'Midstream', value: 'MIDSTREAM' },
  { label: 'Refining', value: 'REFINING' },
  { label: 'Trading', value: 'TRADING' },
  { label: 'Logistics', value: 'LOGISTICS' },
  { label: 'Other', value: 'OTHER' },
]
const REVENUE_RANGES = ['< $10M', '$10M–$50M', '$50M–$200M', '$200M–$1B', '> $1B']

async function fetchCompanies(): Promise<Company[]> {
  const res = await api.get('/companies')
  return res.data
}

interface NewCompanyForm {
  name: string
  industry: string
  revenue_range: string
  location: string
}

const emptyForm: NewCompanyForm = {
  name: '',
  industry: INDUSTRIES[0].value,
  revenue_range: REVENUE_RANGES[0],
  location: '',
}

export default function CompaniesPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewCompanyForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: companies = [], isLoading, isError } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  })

  const createMutation = useMutation({
    mutationFn: (data: NewCompanyForm) => api.post('/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setShowModal(false)
      setForm(emptyForm)
      setFormError(null)
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? err.message
          : 'Failed to create company.'
      setFormError(typeof msg === 'string' ? msg : 'Failed to create company.')
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    createMutation.mutate(form)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-1">Manage your portfolio of energy companies.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
        >
          <PlusCircle size={16} />
          Add Company
        </button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="text-center py-20 text-gray-500">Loading companies…</div>
      )}

      {isError && (
        <div className="text-center py-20 text-red-500">Failed to load companies. Please try again.</div>
      )}

      {!isLoading && !isError && companies.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <Building2 size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-700 font-medium">No companies yet</p>
          <p className="text-sm text-gray-500 mt-1">Add your first company to get started.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
          >
            <PlusCircle size={16} />
            Add Company
          </button>
        </div>
      )}

      {!isLoading && !isError && companies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((company) => (
            <Link
              key={company.id}
              to={`/companies/${company.id}`}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:border-teal-400 hover:shadow transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-md bg-teal-50 flex items-center justify-center">
                  <Building2 size={20} className="text-teal-600" />
                </div>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 rounded-full px-2.5 py-1">
                  {INDUSTRIES.find(i => i.value === company.industry)?.label ?? company.industry}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                {company.name}
              </h3>
              <div className="flex items-center gap-1 mt-2 text-gray-500">
                <MapPin size={13} />
                <span className="text-xs">{company.location}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Revenue: {company.revenue_range}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Add Company Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Company</h2>
              <button onClick={() => { setShowModal(false); setFormError(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Acme Energy Ltd."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.value} value={ind.value}>{ind.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Revenue range</label>
                <select
                  name="revenue_range"
                  value={form.revenue_range}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {REVENUE_RANGES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  name="location"
                  type="text"
                  required
                  value={form.location}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Houston, TX"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null) }}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium rounded-md px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
                >
                  {createMutation.isPending ? 'Saving…' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, MapPin, PlusCircle, X, Search } from 'lucide-react'
import api from '../lib/api'
import { getErrorMessage } from '../lib/api'
import { INDUSTRIES, INDUSTRY_LABELS, type Company } from '../types'
import SkeletonCard from '../components/SkeletonCard'

const REVENUE_RANGES = [
  '<$10M', '$10M–$50M', '$50M–$100M', '$100M–$500M', '$500M+',
]

const emptyForm = {
  name: '',
  industry: INDUSTRIES[0].value,
  location: '',
  revenue_range: REVENUE_RANGES[0],
  description: '',
}

export default function CompaniesPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('ALL')

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => (await api.get('/companies')).data,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => api.post('/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setShowModal(false)
      setForm(emptyForm)
      setFormError(null)
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const filteredCompanies = useMemo(() => {
    let result = companies
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q) ||
          c.industry?.toLowerCase().includes(q)
      )
    }
    if (industryFilter !== 'ALL') {
      result = result.filter((c) => c.industry === industryFilter)
    }
    return result
  }, [companies, search, industryFilter])

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {companies.length} {companies.length === 1 ? 'company' : 'companies'} in your portfolio
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
        >
          <PlusCircle size={16} />
          Add Company
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, location, or industry…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="ALL">All Industries</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind.value} value={ind.value}>{ind.label}</option>
          ))}
        </select>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredCompanies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-300 rounded-xl">
          <Building2 size={40} className="text-gray-200 mb-3" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            {companies.length === 0 ? 'No companies yet' : 'No results found'}
          </h3>
          <p className="text-sm text-gray-400 max-w-xs">
            {companies.length === 0
              ? 'Add your first company to start tracking financials.'
              : 'Try adjusting your search or filter.'}
          </p>
          {companies.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
            >
              <PlusCircle size={15} /> Add Company
            </button>
          )}
        </div>
      )}

      {/* Company cards */}
      {!isLoading && filteredCompanies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <Link
              key={company.id}
              to={`/companies/${company.id}`}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-teal-300 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-teal-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
                    {company.name}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {INDUSTRY_LABELS[company.industry] ?? company.industry}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{company.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Revenue:</span>
                  <span className="font-medium text-gray-700">{company.revenue_range}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Company Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Add Company</h2>
              <button
                onClick={() => { setShowModal(false); setFormError(null) }}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }}
              className="px-6 py-4 space-y-4"
            >
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{formError}</p>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Acme Energy LLC"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Industry *</label>
                <select
                  required
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
                <input
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Houston, TX"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Revenue Range *</label>
                <select
                  required
                  value={form.revenue_range}
                  onChange={(e) => setForm({ ...form, revenue_range: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {REVENUE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder="Brief description (optional)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null) }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-md transition-colors"
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

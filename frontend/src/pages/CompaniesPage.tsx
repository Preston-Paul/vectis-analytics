import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  MapPin,
  PlusCircle,
  X,
  Search,
  ArrowRight,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react'
import api from '../lib/api'
import { getErrorMessage } from '../lib/api'
import { INDUSTRIES, INDUSTRY_LABELS, type Company } from '../types'
import SkeletonCard from '../components/SkeletonCard'

const REVENUE_RANGES = ['<$10M', '$10M–$50M', '$50M–$100M', '$100M–$500M', '$500M+']

const emptyForm = {
  name: '',
  industry: INDUSTRIES[0].value,
  location: '',
  revenue_range: REVENUE_RANGES[0],
  description: '',
}

function WorkspaceCard({ company }: { company: Company }) {
  return (
    <Link
      to={`/workspace/${company.id}`}
      className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Building2 size={20} className="text-teal-700" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
              {company.name}
            </h3>
            <span className="inline-flex mt-1 text-[11px] text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
              {INDUSTRY_LABELS[company.industry] ?? company.industry}
            </span>
          </div>
        </div>

        <ArrowRight size={16} className="text-gray-300 group-hover:text-teal-600 transition-colors flex-shrink-0" />
      </div>

      <div className="space-y-2.5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{company.location}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Briefcase size={12} className="text-gray-400 flex-shrink-0" />
          <span className="text-gray-400">Revenue:</span>
          <span className="font-medium text-gray-700">{company.revenue_range}</span>
        </div>
      </div>

      {company.description && (
        <p className="mt-4 text-xs text-gray-500 line-clamp-2">
          {company.description}
        </p>
      )}
    </Link>
  )
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
          c.industry?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      )
    }

    if (industryFilter !== 'ALL') {
      result = result.filter((c) => c.industry === industryFilter)
    }

    return result
  }, [companies, search, industryFilter])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
        <div className="px-6 py-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-medium mb-3">
              <Building2 size={13} />
              Workspace
            </div>

            <h1 className="text-2xl font-bold text-gray-900">Company Workspaces</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              Choose a company workspace to manage imports, review financial periods, and move into analysis workflows.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            <PlusCircle size={16} />
            Add Workspace
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Workspaces</p>
          <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{companies.length}</p>
          <p className="text-xs text-gray-400 mt-1">Companies currently tracked</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Visible Results</p>
          <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{filteredCompanies.length}</p>
          <p className="text-xs text-gray-400 mt-1">Matching current search and filters</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Industry Coverage</p>
          <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">
            {new Set(companies.map((c) => c.industry)).size}
          </p>
          <p className="text-xs text-gray-400 mt-1">Distinct industries represented</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Search and filters</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, industry, or description…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Industries</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind.value} value={ind.value}>
                {ind.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} rows={2} />
          ))}
        </div>
      )}

      {!isLoading && filteredCompanies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-300 rounded-2xl bg-white">
          <Building2 size={40} className="text-gray-200 mb-3" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            {companies.length === 0 ? 'No workspaces yet' : 'No matching workspaces'}
          </h3>
          <p className="text-sm text-gray-400 max-w-sm">
            {companies.length === 0
              ? 'Create your first company workspace to start tracking financials and analysis.'
              : 'Try adjusting your search or industry filter to find the workspace you need.'}
          </p>

          {companies.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl px-4 py-2 text-sm transition-colors"
            >
              <PlusCircle size={15} />
              Add Workspace
            </button>
          )}
        </div>
      )}

      {!isLoading && filteredCompanies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <WorkspaceCard key={company.id} company={company} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Add Workspace</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setFormError(null)
                }}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate(form)
              }}
              className="px-6 py-4 space-y-4"
            >
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {formError}
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Acme Energy LLC"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Industry *</label>
                <select
                  required
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
                <input
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Houston, TX"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Revenue Range *</label>
                <select
                  required
                  value={form.revenue_range}
                  onChange={(e) => setForm({ ...form, revenue_range: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {REVENUE_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder="Brief description of this workspace (optional)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormError(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {createMutation.isPending ? 'Saving…' : 'Add Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
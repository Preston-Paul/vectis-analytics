import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
})

// Request interceptor: attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 gracefully and surface network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    // Enrich error message for network failures
    if (!error.response) {
      error.message = 'Network error — please check your connection.'
    }
    return Promise.reject(error)
  }
)

export default api

/** Helper: extract a human-readable error message from an Axios error */
export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred.'): string {
  if (err instanceof Error) {
    const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string }
    const detail = axiosErr.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d) => d.msg ?? d).join(', ')
    return axiosErr.message ?? fallback
  }
  return fallback
}

export function SkeletonKPI() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-7 bg-gray-100 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/4" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-32" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
      <div className="h-4 bg-gray-100 rounded w-20" />
    </div>
  )
}

export default function SkeletonCard({ rows = 2 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
      ))}
    </div>
  )
}
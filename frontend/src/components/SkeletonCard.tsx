/**
 * Reusable skeleton loading card.
 * Eliminates repeated "Loading…" text and provides better perceived performance.
 */
export default function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-100 rounded mb-2 ${i === rows - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkeletonKPI() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-5 w-5 bg-gray-200 rounded" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-md bg-gray-200 flex-shrink-0" />
      <div className="flex-1">
        <div className="h-3 bg-gray-200 rounded w-1/3 mb-1" />
        <div className="h-2 bg-gray-100 rounded w-1/4" />
      </div>
    </div>
  )
}

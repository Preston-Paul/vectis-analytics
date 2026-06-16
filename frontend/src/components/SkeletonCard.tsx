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

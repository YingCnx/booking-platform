export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-3 h-6 bg-gray-200 rounded animate-pulse" />
          <div>
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {/* Date picker skeleton */}
        <div>
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="flex gap-2 overflow-x-hidden">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>

        {/* Time slots skeleton */}
        <div>
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-3 gap-2.5">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

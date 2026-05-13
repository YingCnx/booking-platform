export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-3 h-6 bg-gray-200 rounded animate-pulse" />
          <div>
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-48 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        </div>
      </div>
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto">
        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 px-5 py-5 flex justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="w-16 space-y-2">
                <div className="h-5 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-3 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-200 h-24 animate-pulse" />
          <div className="px-5 py-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5 space-y-4">
          <div className="h-12 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-12 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-14 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    </main>
  )
}

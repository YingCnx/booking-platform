import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { SelectableLink } from '@/components/SelectableLink'

export const revalidate = 60

type Props = {
  params: Promise<{ branchId: string }>
}

export default async function BranchPage({ params }: Props) {
  const { branchId } = await params
  const supabase = await createClient()

  const [
    { data: branch },
    { data: services },
  ] = await Promise.all([
    supabase.from('branches')
      .select('id, name, address, open_time, close_time')
      .eq('id', branchId).single(),
    supabase.from('services')
      .select('id, name, description, duration_minutes')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('duration_minutes'),
  ])

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-lg bg-white/80">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link href="/branch" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform">
            <span className="text-lg leading-none">‹</span>
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">{branch?.name}</h1>
            {branch?.address && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[250px]">{branch.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Open status badge */}
      <div className="px-4 pt-4 max-w-lg mx-auto">
        <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          เปิด {String(branch?.open_time ?? '').slice(0,5)} – {String(branch?.close_time ?? '').slice(0,5)} น.
        </div>
      </div>

      {/* Services */}
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">บริการที่เปิดจอง</h2>
        <div className="space-y-3">
          {services?.map((service) => (
            <SelectableLink
              key={service.id}
              href={`/branch/${branchId}/service/${service.id}`}
              className="block bg-white rounded-3xl border border-gray-100 px-5 py-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="font-bold text-gray-900 text-base">{service.name}</div>
                  {service.description && (
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <span>⏱</span>
                    <span>{service.duration_minutes} นาที</span>
                  </div>
                </div>
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                  <span className="text-gray-400">→</span>
                </div>
              </div>
            </SelectableLink>
          ))}

          {(!services || services.length === 0) && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-sm">ยังไม่มีบริการที่เปิดให้จอง</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

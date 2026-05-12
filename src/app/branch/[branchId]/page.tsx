import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

type Props = {
  params: Promise<{ branchId: string }>
}

export default async function BranchPage({ params }: Props) {
  const { branchId } = await params
  const supabase = await createClient()

  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .single()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('price')

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link href="/" className="text-gray-400 text-2xl leading-none">‹</Link>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">{branch?.name}</h1>
            {branch?.address && (
              <p className="text-xs text-gray-400 mt-0.5">{branch.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Open hours badge */}
      <div className="px-4 pt-4">
        <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          เปิด {String(branch?.open_time ?? '').slice(0,5)} – {String(branch?.close_time ?? '').slice(0,5)} น.
        </div>
      </div>

      {/* Services */}
      <div className="px-4 pt-5 pb-8 max-w-lg mx-auto">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">เลือกบริการ</h2>
        <div className="space-y-3">
          {services?.map((service) => (
            <Link
              key={service.id}
              href={`/branch/${branchId}/service/${service.id}`}
              className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-5 py-5 active:bg-gray-50 transition"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="font-semibold text-gray-900">{service.name}</div>
                {service.description && (
                  <div className="text-sm text-gray-400 mt-0.5 truncate">{service.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-1.5">⏱ {service.duration_minutes} นาที</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="font-bold text-gray-900 text-lg">฿{service.price}</div>
                <div className="text-xs text-gray-400 mt-0.5">จอง →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </main>
  )
}

import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { SelectableLink } from '@/components/SelectableLink'

export const revalidate = 60

export default async function BranchListPage() {
  const supabase = await createClient()
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, address, open_time, close_time')
    .order('created_at')

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-white">
      {/* Header — gradient + ทันสมัย */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 pt-14 pb-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-semibold">Booking</div>
          <h1 className="text-3xl font-bold tracking-tight text-white">จองคิวออนไลน์</h1>
          <p className="mt-2 text-gray-400 text-sm">เลือกสาขาที่ต้องการให้บริการ</p>
        </div>
      </div>

      {/* Branch list */}
      <div className="px-4 py-6 space-y-3 max-w-lg mx-auto -mt-4">
        {branches?.map((branch) => (
          <SelectableLink
            key={branch.id}
            href={`/branch/${branch.id}`}
            className="block bg-white rounded-3xl border border-gray-100 px-5 py-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-green-600 font-medium">เปิดทำการ</span>
                </div>
                <div className="font-bold text-gray-900 text-base">{branch.name}</div>
                {branch.address && (
                  <div className="text-sm text-gray-500 mt-1 truncate">{branch.address}</div>
                )}
                <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <span>🕐</span>
                  <span>{String(branch.open_time).slice(0,5)} – {String(branch.close_time).slice(0,5)}</span>
                </div>
              </div>
              <div className="flex-shrink-0 ml-3 w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                <span className="text-gray-400">→</span>
              </div>
            </div>
          </SelectableLink>
        ))}

        {(!branches || branches.length === 0) && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🏪</div>
            <p className="text-sm">ยังไม่มีสาขาที่เปิดให้บริการ</p>
          </div>
        )}
      </div>
    </main>
  )
}

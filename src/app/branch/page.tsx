import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function BranchListPage() {
  const supabase = await createClient()
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, address, open_time, close_time')
    .order('created_at')

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-8 border-b">
        <h1 className="text-3xl font-bold tracking-tight">จองคิวออนไลน์</h1>
        <p className="mt-2 text-gray-500 text-sm">เลือกสาขาที่ต้องการ</p>
      </div>

      <div className="px-4 py-5 space-y-3 max-w-lg mx-auto">
        {branches?.map((branch) => (
          <Link
            key={branch.id}
            href={`/branch/${branch.id}`}
            className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-5 py-5 active:bg-gray-50 transition"
          >
            <div>
              <div className="font-semibold text-gray-900">{branch.name}</div>
              {branch.address && (
                <div className="text-sm text-gray-400 mt-0.5">{branch.address}</div>
              )}
              <div className="text-xs text-gray-400 mt-1.5">
                🕐 {String(branch.open_time).slice(0,5)} – {String(branch.close_time).slice(0,5)}
              </div>
            </div>
            <span className="text-gray-300 text-xl flex-shrink-0 ml-3">›</span>
          </Link>
        ))}
      </div>
    </main>
  )
}

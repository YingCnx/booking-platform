import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id, name, open_time, close_time, slot_interval_minutes, booking_mode')
    .order('created_at')

  // ✅ ดึง pending ทุกวัน (ไม่กรองวันที่)
  const { data: allPending } = await supabase
    .from('bookings')
    .select(`
      id, branch_id, booking_date, start_time, total_price,
      customers ( name, phone ),
      services ( name ),
      branches ( id, name )
    `)
    .eq('status', 'pending')
    .gte('booking_date', today)   // ตั้งแต่วันนี้เป็นต้นไป ไม่เอาอดีต
    .order('booking_date')
    .order('start_time')

  // ✅ ดึง confirmed วันนี้เท่านั้น
  const { data: todayConfirmed } = await supabase
    .from('bookings')
    .select(`
      id, branch_id, booking_date, start_time, end_time, total_price,
      customers ( name, phone ),
      services ( name ),
      branches ( id, name )
    `)
    .eq('status', 'confirmed')
    .eq('booking_date', today)
    .order('start_time')

  if (branchError) console.error('branches error:', branchError)

  const pending   = (allPending   ?? []) as any[]
  const confirmed = (todayConfirmed ?? []) as any[]

  function formatDate(dateStr: string) {
    if (dateStr === today) return 'วันนี้'
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'พรุ่งนี้'
    return new Date(dateStr).toLocaleDateString('th-TH', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-5 py-5 sticky top-0 z-10 bg-black">
        <div className="text-xs text-gray-500 uppercase tracking-widest">Admin</div>
        <h1 className="text-2xl font-bold mt-1">Dashboard</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-8">

        {branchError && (
          <div className="border border-red-800 bg-red-950/30 rounded-xl p-4 text-sm text-red-400">
            {branchError.message}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-xl p-4 border ${pending.length > 0 ? 'border-amber-700 bg-amber-950/30' : 'border-gray-800 bg-gray-900'}`}>
            <div className={`text-3xl font-bold tabular-nums ${pending.length > 0 ? 'text-amber-300' : 'text-white'}`}>
              {pending.length}
            </div>
            <div className="text-xs text-gray-500 mt-1.5 uppercase tracking-wider">รอยืนยัน</div>
            {pending.length > 0 && (
              <div className="mt-1.5 text-xs text-amber-500 animate-pulse">● ต้องดำเนินการ</div>
            )}
          </div>
          <div className="border border-gray-800 bg-gray-900 rounded-xl p-4">
            <div className="text-3xl font-bold tabular-nums text-emerald-400">{confirmed.length}</div>
            <div className="text-xs text-gray-500 mt-1.5 uppercase tracking-wider">ยืนยันวันนี้</div>
          </div>
          <div className="border border-gray-800 bg-gray-900 rounded-xl p-4">
            <div className="text-3xl font-bold tabular-nums">{branches?.length ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1.5 uppercase tracking-wider">สาขา</div>
          </div>
        </div>

        {/* PENDING — ทุกวัน */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold">⏳ รอยืนยัน</h2>
            {pending.length > 0 && (
              <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </div>

          {!pending.length ? (
            <div className="border border-gray-800 bg-gray-900 rounded-xl px-5 py-8 text-center text-gray-600 text-sm">
              ไม่มีรายการรอยืนยัน
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((b) => (
                <Link key={b.id}
                  href={`/admin/branches/${b.branch_id}?date=${b.booking_date}`}
                  className="flex items-center gap-4 border border-amber-800/50 bg-amber-950/20 hover:bg-amber-950/40 rounded-xl px-4 py-4 transition active:scale-[0.99]"
                >
                  {/* วันที่ + เวลา */}
                  <div className="flex-shrink-0 text-center w-16">
                    <div className="text-xs text-amber-400 font-medium">
                      {formatDate(b.booking_date)}
                    </div>
                    <div className="text-lg font-bold tabular-nums mt-0.5">
                      {String(b.start_time).slice(0, 5)}
                    </div>
                  </div>

                  {/* ข้อมูล */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{b.customers?.name}</div>
                    <div className="text-sm text-gray-400 mt-0.5 truncate">
                      {b.services?.name} · {b.branches?.name}
                    </div>
                  </div>

                  {/* ราคา + arrow */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-bold text-amber-300">฿{b.total_price}</div>
                    <div className="text-xs text-amber-600 mt-0.5">ยืนยัน →</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* TODAY CONFIRMED */}
        <section>
          <h2 className="text-lg font-bold mb-4">✅ คิววันนี้</h2>

          {!confirmed.length ? (
            <div className="border border-gray-800 bg-gray-900 rounded-xl px-5 py-8 text-center text-gray-600 text-sm">
              ยังไม่มีคิวที่ยืนยันวันนี้
            </div>
          ) : (
            <div className="border border-gray-800 bg-gray-900 rounded-xl overflow-hidden divide-y divide-gray-800">
              {confirmed.map((b) => (
                <Link key={b.id}
                  href={`/admin/branches/${b.branch_id}?date=${b.booking_date}`}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-800 transition"
                >
                  <span className="text-base font-bold tabular-nums w-12 flex-shrink-0">
                    {String(b.start_time).slice(0, 5)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{b.customers?.name}</div>
                    <div className="text-xs text-gray-500 truncate">{b.services?.name} · {b.branches?.name}</div>
                  </div>
                  <span className="text-sm font-bold text-gray-400 flex-shrink-0">฿{b.total_price}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full border bg-emerald-950 text-emerald-400 border-emerald-800 flex-shrink-0">
                    ยืนยัน
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* BRANCHES */}
        <section>
          <h2 className="text-lg font-bold mb-4">สาขา</h2>
          <div className="space-y-2">
            {branches?.map((branch: any) => (
              <Link key={branch.id} href={`/admin/branches/${branch.id}`}
                className="flex items-center justify-between border border-gray-800 bg-gray-900 hover:bg-gray-800 rounded-xl px-5 py-4 transition group"
              >
                <div>
                  <div className="font-semibold">{branch.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {String(branch.open_time).slice(0, 5)} – {String(branch.close_time).slice(0, 5)}
                    {' · '}{branch.slot_interval_minutes} นาที/slot
                  </div>
                </div>
                <span className="text-gray-600 group-hover:text-white transition">→</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

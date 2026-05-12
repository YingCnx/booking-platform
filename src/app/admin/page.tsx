import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id, name, open_time, close_time, slot_interval_minutes, booking_mode, max_parallel_bookings')
    .order('created_at')

  const { data: todayBookings, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, start_time, end_time, status, total_price,
      customers ( name, phone ),
      services ( name ),
      branches ( name )
    `)
    .eq('booking_date', today)
    .neq('status', 'cancelled')
    .order('start_time')

  if (branchError) console.error('branches error:', branchError)
  if (bookingError) console.error('bookings error:', bookingError)

  const pending   = todayBookings?.filter(b => b.status === 'pending') ?? []
  const confirmed = todayBookings?.filter(b => b.status === 'confirmed') ?? []
  const total     = todayBookings?.length ?? 0

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">

        {/* SIDEBAR */}
        <aside className="hidden lg:flex w-72 min-h-screen border-r border-gray-800 bg-gray-950 flex-col">
          <div className="px-6 py-8 border-b border-gray-800">
            <div className="text-xs uppercase tracking-[0.25em] text-gray-500">Booking SaaS</div>
            <h1 className="text-2xl font-bold mt-3">Admin Panel</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {['Dashboard', 'Bookings', 'Branches', 'Customers'].map((item, i) => (
              <div key={item} className={`px-4 py-3 rounded-lg text-sm transition ${
                i === 0 ? 'bg-white text-black font-medium' : 'text-gray-400 hover:bg-gray-900 hover:text-white cursor-pointer'
              }`}>{item}</div>
            ))}
          </nav>
          <div className="p-6 border-t border-gray-800 text-sm text-gray-500">{today}</div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0">
          <header className="border-b border-gray-800 px-6 lg:px-10 py-6">
            <div className="text-sm text-gray-500">Overview</div>
            <h2 className="text-3xl font-bold mt-1">Dashboard</h2>
          </header>

          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 space-y-10">

            {(branchError || bookingError) && (
              <div className="border border-red-800 bg-red-950/30 rounded-xl p-5 text-sm text-red-400">
                {branchError && <div>branches: {branchError.message}</div>}
                {bookingError && <div>bookings: {bookingError.message}</div>}
              </div>
            )}

            {/* STATS */}
            <div className="grid gap-6 md:grid-cols-4">
              <StatCard value={total} label="คิววันนี้" />
              {/* pending มี highlight พิเศษ */}
              <div className={`border rounded-xl p-6 ${pending.length > 0 ? 'border-amber-700 bg-amber-950/30' : 'border-gray-800 bg-gray-900'}`}>
                <div className={`text-5xl font-bold ${pending.length > 0 ? 'text-amber-300' : 'text-white'}`}>{pending.length}</div>
                <div className="text-gray-500 mt-3 text-sm">รอยืนยัน</div>
                {pending.length > 0 && (
                  <div className="mt-2 text-xs text-amber-500 animate-pulse">● ต้องดำเนินการ</div>
                )}
              </div>
              <StatCard value={confirmed.length} label="ยืนยันแล้ว" />
              <StatCard value={branches?.length ?? 0} label="สาขา" />
            </div>

            {/* PENDING — แยก section ออกมาเลย */}
            {pending.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="text-xl font-bold">⏳ รอการยืนยัน</h3>
                  <span className="bg-amber-500 text-black text-xs font-bold px-2.5 py-1 rounded-full">{pending.length}</span>
                </div>
                <div className="space-y-3">
                  {(pending as any[]).map((b) => (
                    <Link key={b.id} href={`/admin/branches/${b.branches?.id ?? ''}`}
                      className="flex items-center justify-between border border-amber-800/60 bg-amber-950/20 hover:bg-amber-950/40 rounded-xl px-5 py-4 transition"
                    >
                      <div>
                        <div className="font-bold">{b.customers?.name}</div>
                        <div className="text-sm text-gray-400 mt-0.5">
                          {b.services?.name} · {b.start_time?.slice(0, 5)} · {b.branches?.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-amber-300">฿{b.total_price}</span>
                        <span className="text-xs text-amber-500 border border-amber-700 px-3 py-1.5 rounded-full">ไปยืนยัน →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* TODAY'S QUEUE */}
            <section>
              <div className="mb-4">
                <h3 className="text-xl font-bold">คิววันนี้</h3>
                <p className="text-gray-500 text-sm mt-1">เฉพาะที่ยืนยันแล้ว</p>
              </div>
              {!confirmed.length ? (
                <div className="border border-gray-800 bg-gray-900 rounded-xl p-10 text-center text-gray-500">
                  ยังไม่มีคิวที่ยืนยันวันนี้
                </div>
              ) : (
                <div className="space-y-3">
                  {(confirmed as any[]).map((b) => (
                    <div key={b.id} className="border border-gray-800 bg-gray-900 rounded-xl px-5 py-4 flex items-center gap-4">
                      <span className="text-lg font-bold tabular-nums w-14">{b.start_time?.slice(0, 5)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{b.customers?.name}</div>
                        <div className="text-sm text-gray-500">{b.services?.name} · {b.branches?.name}</div>
                      </div>
                      <span className="text-sm font-bold text-gray-400">฿{b.total_price}</span>
                      <span className="text-xs px-3 py-1 rounded-full border bg-emerald-950 text-emerald-400 border-emerald-800">ยืนยัน</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* BRANCHES */}
            <section>
              <div className="mb-4">
                <h3 className="text-xl font-bold">สาขา</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {branches?.map((branch: any) => (
                  <Link key={branch.id} href={`/admin/branches/${branch.id}`}
                    className="border border-gray-800 bg-gray-900 hover:bg-gray-800 rounded-xl p-6 transition group block"
                  >
                    <div className="text-lg font-semibold">{branch.name}</div>
                    <div className="text-gray-400 mt-3 text-sm">
                      {String(branch.open_time).slice(0, 5)} – {String(branch.close_time).slice(0, 5)}
                    </div>
                    <div className="text-gray-500 text-sm mt-1">{branch.slot_interval_minutes} นาที/slot · {branch.booking_mode}</div>
                    <div className="mt-4 text-sm text-white flex items-center gap-1">
                      จัดการสาขา <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  )
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="border border-gray-800 bg-gray-900 rounded-xl p-6">
      <div className="text-5xl font-bold">{value}</div>
      <div className="text-gray-500 mt-3 text-sm">{label}</div>
    </div>
  )
}

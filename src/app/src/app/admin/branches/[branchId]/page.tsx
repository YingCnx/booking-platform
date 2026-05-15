import { createClient } from '@/utils/supabase/server'
import { requireAdminSession } from '@/lib/admin-session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { BookingTable } from './BookingTable'
import { WorkingHoursForm } from './WorkingHoursForm'

type Props = {
  params: Promise<{ branchId: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function BranchAdminPage({ params, searchParams }: Props) {
  const admin = await requireAdminSession()
  const supabase = await createClient()
  const { branchId } = await params
  const { tab = 'bookings' } = await searchParams

  const today = new Date().toISOString().split('T')[0]

  const { data: branch } = await supabase
    .from('branches').select('*').eq('id', branchId).single()

  // ✅ กัน admin ของร้านอื่นเข้ามาดู
  if (!branch || branch.shop_id !== admin.shopId) {
    redirect('/admin')
  }

  // ✅ ดึงทุก booking ตั้งแต่วันนี้เป็นต้นไป ไม่กรองวันที่
  const { data: rawBookings, error } = await supabase
    .from('bookings')
    .select(`
      id, start_time, end_time, status, total_price, booking_date,
      customers ( name, phone ),
      services ( name, duration_minutes, price )
    `)
    .eq('branch_id', branchId)
    .gte('booking_date', today)
    .neq('status', 'cancelled')
    .order('booking_date')
    .order('start_time')

  const bookings = (rawBookings ?? []).map((b: any) => ({
    ...b,
    customers: Array.isArray(b.customers) ? b.customers[0] : b.customers,
    services:  Array.isArray(b.services)  ? b.services[0]  : b.services,
  }))

  // ✅ group by booking_date
  const grouped = bookings.reduce((acc: Record<string, typeof bookings>, b) => {
    const d = b.booking_date
    if (!acc[d]) acc[d] = []
    acc[d].push(b)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()

  const totalPending = bookings.filter(b => b.status === 'pending').length

  function formatDateLabel(dateStr: string) {
    if (dateStr === today) return 'วันนี้'
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'พรุ่งนี้'
    return new Date(dateStr).toLocaleDateString('th-TH', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
  }

  const tabs = [
    { key: 'bookings', label: '📋 คิว' },
    { key: 'settings', label: '⚙️ ตั้งค่า' },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-5 py-4 sticky top-0 z-10 bg-black">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/admin" className="hover:text-white transition">Admin</Link>
          <span>/</span>
          <span className="text-white font-medium">{branch?.name}</span>
        </div>
        <div className="flex gap-1 mt-3">
          {tabs.map(t => (
            <Link key={t.key}
              href={`/admin/branches/${branchId}?tab=${t.key}`}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium transition',
                tab === t.key ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-gray-900',
              ].join(' ')}
            >
              {t.label}
            </Link>
          ))}
          <Link href={`/admin/branches/${branchId}/services`}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-900 transition">
            🛠 บริการ
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {error && (
          <div className="border border-red-800 bg-red-950/30 rounded-xl p-4 text-sm text-red-400">
            {error.message}
          </div>
        )}

        {/* TAB: BOOKINGS */}
        {tab === 'bookings' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl p-4 border ${totalPending > 0 ? 'border-amber-700 bg-amber-950/30' : 'border-gray-800 bg-gray-900'}`}>
                <div className={`text-3xl font-bold ${totalPending > 0 ? 'text-amber-300' : 'text-white'}`}>
                  {totalPending}
                </div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">รอยืนยัน</div>
                {totalPending > 0 && (
                  <div className="mt-1.5 text-xs text-amber-500 animate-pulse">● ต้องดำเนินการ</div>
                )}
              </div>
              <div className="border border-gray-800 bg-gray-900 rounded-xl p-4">
                <div className="text-3xl font-bold">{bookings.length}</div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">คิวทั้งหมด</div>
              </div>
            </div>

            {/* ✅ แสดงแยกตามวัน */}
            {sortedDates.length === 0 ? (
              <div className="border border-gray-800 bg-gray-900 rounded-xl px-5 py-10 text-center text-gray-600 text-sm">
                ไม่มีคิวที่กำลังจะมาถึง
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(dateStr => {
                  const dayBookings = grouped[dateStr]
                  const dayPending  = dayBookings.filter((b: any) => b.status === 'pending').length
                  const isToday     = dateStr === today

                  return (
                    <div key={dateStr}>
                      {/* Date header */}
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className={`font-bold text-base ${isToday ? 'text-white' : 'text-gray-300'}`}>
                          {formatDateLabel(dateStr)}
                        </h2>
                        {dayPending > 0 && (
                          <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                            {dayPending} รอยืนยัน
                          </span>
                        )}
                        <span className="text-xs text-gray-600 ml-auto">
                          {dayBookings.length} คิว
                        </span>
                      </div>

                      {/* Bookings ของวันนั้น */}
                      <BookingTable bookings={dayBookings} />
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* TAB: SETTINGS */}
        {tab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-1">ตั้งค่าสาขา</h2>
              <p className="text-sm text-gray-500">เวลาเปิด-ปิด, ช่วง slot, วันหยุด</p>
            </div>
            <WorkingHoursForm branch={branch} />
          </div>
        )}

      </div>
    </div>
  )
}

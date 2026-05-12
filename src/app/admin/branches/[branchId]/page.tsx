import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { BookingTable } from './BookingTable'
import { WorkingHoursForm } from './WorkingHoursForm'

type Props = {
  params: Promise<{ branchId: string }>
  searchParams: Promise<{ date?: string }>
}

export default async function BranchAdminPage({ params, searchParams }: Props) {
  const supabase = await createClient()
  const { branchId } = await params
  const { date } = await searchParams

  const today = new Date().toISOString().split('T')[0]
  const selectedDate = date ?? today

  const { data: branch } = await supabase
    .from('branches').select('*').eq('id', branchId).single()

  const { data: rawBookings, error } = await supabase
    .from('bookings')
    .select(`
      id, start_time, end_time, status, total_price, notes,
      customers ( name, phone ),
      services ( name, duration_minutes, price )
    `)
    .eq('branch_id', branchId)
    .eq('booking_date', selectedDate)
    .order('start_time')

  const bookings = rawBookings?.map((b: any) => ({
    ...b,
    customers: Array.isArray(b.customers) ? b.customers[0] : b.customers,
    services:  Array.isArray(b.services)  ? b.services[0]  : b.services,
  }))

  // ✅ ข้อ 2: แสดง 14 วัน (เมื่อวาน + 13 วันข้างหน้า) ไม่ใช่แค่วันนี้
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i - 1)
    return d.toISOString().split('T')[0]
  })

  const pending   = bookings?.filter(b => b.status === 'pending').length   ?? 0
  const confirmed = bookings?.filter(b => b.status === 'confirmed').length ?? 0

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-5 py-4 flex items-center gap-3 sticky top-0 z-10 bg-black">
        <Link href="/admin" className="text-gray-500 text-sm hover:text-white transition">← Admin</Link>
        <span className="text-gray-700">/</span>
        <h1 className="font-bold truncate">{branch?.name}</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {error && (
          <div className="border border-red-800 bg-red-950/30 rounded-xl p-4 text-sm text-red-400">
            {error.message}
          </div>
        )}

        {/* Date tabs — scroll แนวนอน */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
          {dates.map(d => {
            const isToday    = d === today
            const isSelected = d === selectedDate
            const isPast     = d < today
            const label = new Date(d).toLocaleDateString('th-TH', {
              weekday: 'short', day: 'numeric', month: 'short',
            })
            return (
              <Link key={d}
                href={`/admin/branches/${branchId}?date=${d}`}
                className={[
                  'flex-shrink-0 snap-start px-3 py-2 rounded-xl border text-xs whitespace-nowrap transition text-center min-w-[72px]',
                  isSelected
                    ? 'bg-white text-black border-white font-bold'
                    : isPast
                    ? 'border-gray-800 text-gray-600 bg-gray-900'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white bg-gray-900',
                ].join(' ')}
              >
                <div>{isToday ? 'วันนี้' : label.split(' ')[0]}</div>
                <div className="opacity-70">{label.split(' ').slice(1).join(' ')}</div>
              </Link>
            )
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-4 border ${pending > 0 ? 'border-amber-700 bg-amber-950/30' : 'border-gray-800 bg-gray-900'}`}>
            <div className={`text-3xl font-bold ${pending > 0 ? 'text-amber-300' : 'text-white'}`}>{pending}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">รอยืนยัน</div>
          </div>
          <div className="border border-gray-800 bg-gray-900 rounded-xl p-4">
            <div className="text-3xl font-bold text-emerald-400">{confirmed}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">ยืนยันแล้ว</div>
          </div>
        </div>

        <BookingTable bookings={bookings as any ?? []} />
        <WorkingHoursForm branch={branch} />

      </div>
    </div>
  )
}

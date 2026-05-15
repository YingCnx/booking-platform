import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { SelectableLink } from '@/components/SelectableLink'
import {
  todayInBangkok,
  currentMinutesInBangkok,
  generateDates,
} from '@/lib/timezone'

type Props = {
  params: Promise<{ branchId: string; serviceId: string }>
  searchParams: Promise<{ date?: string }>
}

const MIN_ADVANCE_MINUTES = 60

function formatDateShort(dateStr: string, today: string) {
  const d = new Date(dateStr)
  const isToday = dateStr === today
  if (isToday) {
    return {
      top: 'วันนี้',
      bottom: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
    }
  }
  return {
    top: d.toLocaleDateString('th-TH', { weekday: 'short' }),
    bottom: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
  }
}

export default async function ServiceTimePage({ params, searchParams }: Props) {
  const { branchId, serviceId } = await params
  const { date } = await searchParams
  const today = todayInBangkok()
  const supabase = await createClient()

  const [
    { data: service },
    { data: branch },
  ] = await Promise.all([
    supabase.from('services')
      .select('id, name, duration_minutes')
      .eq('id', serviceId).single(),
    supabase.from('branches')
      .select('id, name, open_time, close_time, slot_interval_minutes, booking_mode, max_parallel_bookings, holiday_dates')
      .eq('id', branchId).single(),
  ])

  const openTime    = String(branch?.open_time  ?? '09:00').slice(0, 5)
  const closeTime   = String(branch?.close_time ?? '18:00').slice(0, 5)
  const slotInterval = branch?.slot_interval_minutes ?? 30
  const duration    = service?.duration_minutes ?? 60

  const [oH, oM] = openTime.split(':').map(Number)
  const [cH, cM] = closeTime.split(':').map(Number)
  const openTotal  = oH * 60 + oM
  const closeTotal = cH * 60 + cM

  const currentMin = currentMinutesInBangkok()
  const minBookableTime = currentMin + MIN_ADVANCE_MINUTES
  const isTodayPastBusiness = minBookableTime + duration > closeTotal
  const allDates = generateDates(7)
  const dates = isTodayPastBusiness ? allDates.slice(1) : allDates

  if (dates.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-gray-500 text-sm">ไม่มีวันที่จองได้</p>
        </div>
      </main>
    )
  }

  const selectedDate = date && dates.includes(date) ? date : dates[0]

  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('branch_id', branchId)
    .eq('booking_date', selectedDate)
    .in('status', ['pending', 'confirmed'])

  const allTimes: string[] = []
  for (let t = openTotal; t + duration <= closeTotal; t += slotInterval) {
    allTimes.push(`${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`)
  }

  const holidays: string[] = branch?.holiday_dates ?? []
  const isClosed = holidays.includes(selectedDate)
  const isToday = selectedDate === today

  const slots = allTimes.map(time => {
    const [h, m] = time.split(':').map(Number)
    const slotMin = h * 60 + m
    const endMin = slotMin + duration
    const endTime = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`
    const isTooSoon = isToday && slotMin < minBookableTime
    const overlap = bookings?.filter(b =>
      time < String(b.end_time).slice(0, 5) && endTime > String(b.start_time).slice(0, 5)
    ).length ?? 0
    let available = !isTooSoon
    if (available) {
      if (branch?.booking_mode === 'single' && overlap >= 1) available = false
      if (branch?.booking_mode === 'capacity' && overlap >= (branch?.max_parallel_bookings ?? 1)) available = false
    }
    return { time, available }
  })

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-lg bg-white/80">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link href={`/branch/${branchId}`} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform">
            <span className="text-lg leading-none">‹</span>
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">{service?.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">⏱ {duration} นาที</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-7">
        {/* Date picker */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">เลือกวัน</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x scroll-smooth">
            {dates.map(d => {
              const { top, bottom } = formatDateShort(d, today)
              const isSelected = selectedDate === d
              return (
                <SelectableLink key={d}
                  href={`/branch/${branchId}/service/${serviceId}?date=${d}`}
                  className={[
                    'flex-shrink-0 snap-start flex flex-col items-center justify-center w-18 h-20 rounded-2xl border text-center',
                    isSelected
                      ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-900 shadow-lg shadow-gray-900/20'
                      : 'bg-white text-gray-700 border-gray-100 shadow-sm',
                  ].join(' ')}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{top}</span>
                  <span className={`text-xs mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>{bottom}</span>
                </SelectableLink>
              )
            })}
          </div>
        </section>

        {/* Time slots */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">เลือกเวลา</h2>

          {isClosed ? (
            <div className="bg-white rounded-3xl border border-gray-100 px-5 py-12 text-center shadow-sm">
              <div className="text-5xl mb-3">🚫</div>
              <p className="text-gray-500 text-sm font-medium">วันหยุด ไม่รับการจอง</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 px-5 py-12 text-center shadow-sm">
              <div className="text-5xl mb-3">😔</div>
              <p className="text-gray-400 text-sm">ไม่มีเวลาว่าง</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {slots.map(slot =>
                slot.available ? (
                  <SelectableLink key={slot.time}
                    href={`/branch/${branchId}/service/${serviceId}/confirm?time=${slot.time}&date=${selectedDate}`}
                    className="block bg-white border border-gray-100 rounded-2xl py-4 text-center text-sm font-bold text-gray-800 shadow-sm"
                  >
                    {slot.time}
                  </SelectableLink>
                ) : (
                  <div key={slot.time}
                    className="bg-gray-50 border border-gray-50 rounded-2xl py-4 text-center text-sm font-medium text-gray-300 opacity-60 pointer-events-none"
                  >
                    {slot.time}
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

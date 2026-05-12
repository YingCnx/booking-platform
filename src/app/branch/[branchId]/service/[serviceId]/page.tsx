import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

type Props = {
  params: Promise<{ branchId: string; serviceId: string }>
  searchParams: Promise<{ date?: string }>
}

// ✅ เวลาไทย
function getThailandNow() {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Bangkok',
    })
  )
}

function getThailandToday() {
  return getThailandNow()
    .toISOString()
    .split('T')[0]
}

function generateDates() {
  // ✅ 7 วันจากเวลาไทย
  return Array.from({ length: 7 }, (_, i) => {
    const d = getThailandNow()
    d.setDate(d.getDate() + i)

    return d.toISOString().split('T')[0]
  })
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr)

  const isToday =
    dateStr === getThailandToday()

  if (isToday) {
    return {
      top: 'วันนี้',
      bottom: d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
      }),
    }
  }

  return {
    top: d.toLocaleDateString('th-TH', {
      weekday: 'short',
    }),
    bottom: d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    }),
  }
}

export default async function ServiceTimePage({
  params,
  searchParams,
}: Props) {
  const { branchId, serviceId } =
    await params

  const { date } =
    await searchParams

  const dates = generateDates()

  const today = dates[0]

  // ✅ กัน date นอกช่วง
  const selectedDate =
    date && dates.includes(date)
      ? date
      : today

  const supabase = await createClient()

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single()

  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .single()

  const openTime = String(
    branch?.open_time ?? '09:00'
  ).slice(0, 5)

  const closeTime = String(
    branch?.close_time ?? '18:00'
  ).slice(0, 5)

  const slotInterval =
    branch?.slot_interval_minutes ?? 30

  const duration =
    service?.duration_minutes ?? 60

  const [oH, oM] =
    openTime.split(':').map(Number)

  const [cH, cM] =
    closeTime.split(':').map(Number)

  const openTotal =
    oH * 60 + oM

  const closeTotal =
    cH * 60 + cM

  const allTimes: string[] = []

  for (
    let t = openTotal;
    t + duration <= closeTotal;
    t += slotInterval
  ) {
    allTimes.push(
      `${Math.floor(t / 60)
        .toString()
        .padStart(2, '0')}:${(t % 60)
        .toString()
        .padStart(2, '0')}`
    )
  }

  const holidays: string[] =
    branch?.holiday_dates ?? []

  const isClosed =
    holidays.includes(selectedDate)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time, status')
    .eq('branch_id', branchId)
    .eq('booking_date', selectedDate)
    .in('status', ['pending', 'confirmed'])

  // ✅ เวลาไทยจริง
  const isToday =
    selectedDate === today

  const thailandNow = getThailandNow()

  const currentMinutes =
    thailandNow.getHours() * 60 +
    thailandNow.getMinutes()

  const slots = allTimes.map(time => {
    const [h, m] =
      time.split(':').map(Number)

    const slotMinutes =
      h * 60 + m

    const endMin =
      slotMinutes + duration

    const endTime =
      `${Math.floor(endMin / 60)
        .toString()
        .padStart(2, '0')}:${(endMin % 60)
        .toString()
        .padStart(2, '0')}`

    // ✅ กันเวลาที่ผ่านมาแล้ว
    const isPast =
      isToday &&
      slotMinutes <= currentMinutes

    const overlap =
      bookings?.filter(b =>
        time <
          String(b.end_time).slice(0, 5) &&
        endTime >
          String(b.start_time).slice(0, 5)
      ).length ?? 0

    let available = !isPast

    if (available) {
      if (
        branch?.booking_mode === 'single' &&
        overlap >= 1
      ) {
        available = false
      }

      if (
        branch?.booking_mode ===
          'capacity' &&
        overlap >=
          (branch?.max_parallel_bookings ??
            1)
      ) {
        available = false
      }
    }

    return {
      time,
      available,
      isPast,
    }
  })

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">

          <Link
            href={`/branch/${branchId}`}
            className="text-gray-400 text-2xl leading-none"
          >
            ‹
          </Link>

          <div>
            <h1 className="font-bold text-gray-900 leading-tight">
              {service?.name}
            </h1>

            <p className="text-xs text-gray-400 mt-0.5">
              {duration} นาที · ฿
              {service?.price}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* Date picker */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            เลือกวัน
          </h2>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x">

            {dates.map(d => {
              const { top, bottom } =
                formatDateShort(d)

              const isSelected =
                selectedDate === d

              return (
                <Link
                  key={d}
                  href={`/branch/${branchId}/service/${serviceId}?date=${d}`}
                  className={[
                    'flex-shrink-0 snap-start flex flex-col items-center justify-center w-16 h-16 rounded-2xl border text-center transition',

                    isSelected
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 active:bg-gray-50',
                  ].join(' ')}
                >
                  <span className="text-xs font-medium">
                    {top}
                  </span>

                  <span className="text-xs mt-0.5 opacity-70">
                    {bottom}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            เลือกเวลา
          </h2>

          {isClosed ? (
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-10 text-center">
              <div className="text-3xl mb-2">
                🚫
              </div>

              <p className="text-gray-500 text-sm">
                วันหยุด ไม่รับการจอง
              </p>
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-10 text-center">
              <p className="text-gray-400 text-sm">
                ไม่มีเวลาว่าง
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">

              {slots.map(slot =>
                slot.available ? (
                  <Link
                    key={slot.time}
                    href={`/branch/${branchId}/service/${serviceId}/confirm?time=${slot.time}&date=${selectedDate}`}
                    className="bg-white border border-gray-200 rounded-2xl py-4 text-center text-sm font-semibold text-gray-800 active:bg-gray-900 active:text-white transition"
                  >
                    {slot.time}
                  </Link>
                ) : (
                  <div
                    key={slot.time}
                    className="bg-gray-100 border border-gray-100 rounded-2xl py-4 text-center text-sm font-medium text-gray-300 opacity-60 pointer-events-none"
                  >
                    <div>
                      {slot.time}
                    </div>

                    <div className="text-xs mt-0.5">
                      {slot.isPast
                        ? 'ผ่านแล้ว'
                        : 'เต็ม'}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
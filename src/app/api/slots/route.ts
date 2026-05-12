import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

function generateTimeSlots(
  openTime: string,
  closeTime: string,
  slotInterval: number,
  serviceDuration: number,
): string[] {
  const slots: string[] = []
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)
  const openTotal = openH * 60 + openM
  const closeTotal = closeH * 60 + closeM
  let current = openTotal
  while (current + serviceDuration <= closeTotal) {
    const h = Math.floor(current / 60)
    const m = current % 60
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    current += slotInterval
  }
  return slots
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')
  const serviceId = searchParams.get('serviceId')
  const date = searchParams.get('date')

  if (!branchId || !serviceId || !date) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single()

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .single()

  if (!branch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  // ✅ schema จริงใช้ slot_interval_minutes
  const openTime: string = branch.open_time ?? '09:00'
  const closeTime: string = branch.close_time ?? '18:00'
  const slotInterval: number = branch.slot_interval_minutes ?? branch.slot_duration_minutes ?? 30

  // ✅ holiday_dates เป็น date[] ใน DB
  const holidays: string[] = branch.holiday_dates ?? []
  if (holidays.includes(date)) {
    return NextResponse.json({ service, branch, slots: [], closed: true, reason: 'วันหยุด' })
  }

  // ✅ กัน cancelled ออกจาก overlap check
  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time, status')
    .eq('branch_id', branchId)
    .eq('booking_date', date)
    .neq('status', 'cancelled')

  const allSlots = generateTimeSlots(openTime, closeTime, slotInterval, service.duration_minutes)

  const slots = allSlots.map((slot) => {
    const [h, m] = slot.split(':').map(Number)
    const endMinutes = h * 60 + m + service.duration_minutes
    const slotEnd = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

    const overlapping = bookings?.filter((b) =>
      slot < b.end_time.slice(0, 5) && slotEnd > b.start_time.slice(0, 5)
    ).length ?? 0

    let available = true
    if (branch.booking_mode === 'single' && overlapping >= 1) available = false
    if (branch.booking_mode === 'capacity' && overlapping >= branch.max_parallel_bookings) available = false

    return { time: slot, available, totalBookings: overlapping }
  })

  return NextResponse.json({ service, branch, slots })
}

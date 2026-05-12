// ==============================================
// Cron Job — ส่ง reminder ก่อนนัด 1 วัน
// ตั้ง cron ที่ Vercel: ทุกวัน 20:00 (8pm)
// ==============================================

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { pushMessage, buildReminderFlex } from '@/lib/line'

export async function GET(req: Request) {

  // ป้องกัน unauthorized call
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // หา bookings พรุ่งนี้ที่ status confirmed และลูกค้ามี line_user_id
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id, booking_date, start_time,
      customers ( name, line_user_id ),
      services ( name ),
      branches ( name, address )
    `)
    .eq('booking_date', tomorrowStr)
    .eq('status', 'confirmed')

  if (error) {
    console.error('Cron reminder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  for (const booking of bookings ?? []) {
    const customer = booking.customers as any
    const service  = booking.services as any
    const branch   = booking.branches as any

    if (!customer?.line_user_id) { skipped++; continue }

    await pushMessage(customer.line_user_id, [
      buildReminderFlex({
        customerName:  customer.name,
        serviceName:   service?.name ?? '',
        branchName:    branch?.name ?? '',
        branchAddress: branch?.address ?? undefined,
        date:          booking.booking_date,
        time:          String(booking.start_time).slice(0, 5),
      }),
    ])
    sent++
  }

  return NextResponse.json({
    ok: true,
    date: tomorrowStr,
    sent,
    skipped,
  })
}

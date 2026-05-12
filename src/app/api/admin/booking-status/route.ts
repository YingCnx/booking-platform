import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(req: Request) {
  const body = await req.json()
  const { bookingId, status } = body

  // ✅ validate bookingId ก่อน — ป้องกัน "undefined" เข้า DB
  if (!bookingId || bookingId === 'undefined') {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  const allowed = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createClient()

  // ✅ update ก่อน แล้ว select แยก — ไม่ join ตอน update เพื่อหลีกเลี่ยง FK null error
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // ดึง booking พร้อม relations แยก
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      *,
      customers ( name, phone, line_user_id ),
      services ( name, price ),
      branches ( name, address )
    `)
    .eq('id', bookingId)
    .single()

  if (fetchError) {
    // ถ้า fetch join fail ก็ยังถือว่า update สำเร็จ
    console.error('fetch after update error:', fetchError)
    return NextResponse.json({ ok: true, bookingId, status })
  }

  // ส่ง LINE แจ้งลูกค้าเมื่อ confirmed
  if (status === 'confirmed') {
    const customer = booking.customers as any
    const service  = booking.services as any
    const branch   = booking.branches as any

    if (customer?.line_user_id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/line/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_confirmed',
            data: {
              lineUserId:   customer.line_user_id,
              customerName: customer.name,
              serviceName:  service?.name ?? '',
              branchName:   branch?.name ?? '',
              date:         booking.booking_date,
              time:         String(booking.start_time).slice(0, 5),
              price:        service?.price ?? booking.total_price,
            },
          }),
        })
      } catch (err) {
        console.error('LINE notify failed (non-critical):', err)
      }
    }
  }

  return NextResponse.json({ ok: true, booking })
}

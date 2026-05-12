import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(req: Request) {
  const { bookingId, status } = await req.json()

  if (!bookingId || bookingId === 'undefined')
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })

  const allowed = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
  if (!allowed.includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const supabase = await createClient()

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *, booking_date,
      customers ( name, phone, line_user_id ),
      services ( name, price ),
      branches ( id, name, address, shop_id )
    `)
    .eq('id', bookingId).single()

  // ✅ ส่ง LINE แจ้งลูกค้าเมื่อ confirmed ด้วย credentials ของร้านนั้น
  if (status === 'confirmed' && booking) {
    const customer = booking.customers as any
    const service  = booking.services  as any
    const branch   = booking.branches  as any

    if (customer?.line_user_id && branch?.shop_id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/line/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_confirmed',
            shopId: branch.shop_id,   // ✅ ส่ง shopId ให้ notify ดึง credentials ถูกร้าน
            data: {
              lineUserId:   customer.line_user_id,
              customerName: customer.name,
              serviceName:  service?.name ?? '',
              branchName:   branch?.name  ?? '',
              date:         booking.booking_date,
              time:         String(booking.start_time).slice(0, 5),
              price:        service?.price ?? booking.total_price,
            },
          }),
        })
      } catch (err) {
        console.error('LINE notify failed:', err)
      }
    }
  }

  return NextResponse.json({ ok: true, booking })
}

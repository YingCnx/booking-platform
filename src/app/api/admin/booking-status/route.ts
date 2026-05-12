import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(req: Request) {
  const { bookingId, status } = await req.json()

  const allowed = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: booking, error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select(`
      *,
      customers ( name, phone, line_user_id ),
      services ( name, price ),
      branches ( name, address )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ✅ ส่ง LINE แจ้งลูกค้าเมื่อ confirmed
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
              lineUserId: customer.line_user_id,
              customerName: customer.name,
              serviceName: service?.name,
              branchName: branch?.name,
              date: booking.booking_date,
              time: String(booking.start_time).slice(0, 5),
              price: service?.price ?? booking.total_price,
            },
          }),
        })
      } catch (err) {
        console.error('LINE notify failed (non-critical):', err)
      }
    }
  }

  return NextResponse.json({ booking })
}

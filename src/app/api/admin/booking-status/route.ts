import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAdminSession } from '@/lib/admin-session'

export async function PATCH(req: Request) {
  // ✅ ต้องเป็น admin
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId, status } = await req.json()

  if (!bookingId || bookingId === 'undefined')
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })

  const allowed = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
  if (!allowed.includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const supabase = await createClient()

  // ✅ verify booking belongs to admin's shop
  const { data: bookingCheck } = await supabase
    .from('bookings')
    .select('id, branches ( shop_id )')
    .eq('id', bookingId)
    .single()

  const bookingShopId = (bookingCheck?.branches as any)?.shop_id
  if (!bookingCheck || bookingShopId !== admin.shopId) {
    return NextResponse.json({ error: 'ไม่อนุญาตให้แก้ไข booking ของร้านอื่น' }, { status: 403 })
  }

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

  if (status === 'confirmed' && booking) {
    const customer = booking.customers as any
    const service  = booking.services  as any
    const branch   = booking.branches  as any

    const { data: details } = await supabase
      .from('booking_details')
      .select('field_label, value')
      .eq('booking_id', bookingId)
    const detailsForFlex = (details ?? []).map(d => ({ label: d.field_label, value: d.value }))

    if (customer?.line_user_id && branch?.shop_id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/line/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_confirmed',
            shopId: branch.shop_id,
            data: {
              lineUserId:   customer.line_user_id,
              customerName: customer.name,
              serviceName:  service?.name ?? '',
              branchName:   branch?.name  ?? '',
              date:         booking.booking_date,
              time:         String(booking.start_time).slice(0, 5),
              price:        service?.price ?? booking.total_price,
              details:      detailsForFlex,
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

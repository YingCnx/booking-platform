import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getShopLineCredentials, pushMessage } from '@/lib/line'

export async function POST(req: Request) {
  const { bookingId, message } = await req.json()

  if (!bookingId || !message?.trim()) {
    return NextResponse.json({ error: 'bookingId และ message required' }, { status: 400 })
  }

  const supabase = await createClient()

  // ดึง booking + customer + shop
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id,
      customers ( line_user_id, name ),
      branches ( shop_id )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'ไม่พบ booking' }, { status: 404 })
  }

  const customer = booking.customers as any
  const branch   = booking.branches  as any

  if (!customer?.line_user_id) {
    return NextResponse.json({ error: 'ลูกค้าไม่ได้ผูก LINE' }, { status: 400 })
  }

  // ดึง LINE credentials ของร้าน
  const creds = await getShopLineCredentials(branch.shop_id)
  if (!creds.accessToken) {
    return NextResponse.json({ error: 'ร้านยังไม่ได้ตั้งค่า LINE' }, { status: 400 })
  }

  // ส่งข้อความหาลูกค้า
  const ok = await pushMessage(
    customer.line_user_id,
    [{ type: 'text', text: message.trim() }],
    creds.accessToken,
  )

  if (!ok) {
    return NextResponse.json({ error: 'ส่งข้อความไม่สำเร็จ' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, customerName: customer.name })
}

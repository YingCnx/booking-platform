import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m + minutes, 0, 0)
  return d.toTimeString().slice(0, 5)
}

// ✅ verify LINE idToken → ได้ lineUserId จริง
async function verifyLineIdToken(idToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: process.env.LINE_CHANNEL_ID ?? '',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    // data.sub = LINE userId (Uxxxxxxxxx)
    return data.sub ?? null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const form = await req.formData()

  const branchId    = form.get('branchId') as string
  const serviceId   = form.get('serviceId') as string
  const time        = form.get('time') as string
  const bookingDate = form.get('date') as string
  const name        = form.get('name') as string
  const phone       = form.get('phone') as string
  const idToken     = form.get('idToken') as string | null  // ✅ รับ idToken แทน lineUserId

  if (!branchId || !serviceId || !time || !bookingDate || !name)
    return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })

  // ✅ verify idToken → lineUserId
  let lineUserId: string | null = null
  if (idToken) {
    lineUserId = await verifyLineIdToken(idToken)
    if (!lineUserId) {
      return NextResponse.json({ message: 'ไม่สามารถยืนยันตัวตน LINE ได้' }, { status: 401 })
    }
  }

  const { data: service } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  const { data: branch } = await supabase
    .from('branches').select('*').eq('id', branchId).single()

  if (!service || !branch)
    return NextResponse.json({ message: 'ไม่พบข้อมูล' }, { status: 404 })

  const endTime = addMinutes(time, service.duration_minutes)

  // overlap check
  const { data: existing } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('branch_id', branchId)
    .eq('booking_date', bookingDate)
    .in('status', ['pending', 'confirmed'])

  const overlapping = existing?.filter((b: any) =>
    time < String(b.end_time).slice(0, 5) &&
    endTime > String(b.start_time).slice(0, 5)
  ).length ?? 0

  if (branch.booking_mode === 'single' && overlapping >= 1)
    return NextResponse.json({ message: 'เวลานี้ถูกจองแล้ว' }, { status: 409 })
  if (branch.booking_mode === 'capacity' && overlapping >= branch.max_parallel_bookings)
    return NextResponse.json({ message: 'เวลานี้เต็มแล้ว' }, { status: 409 })

  // upsert customer — ถ้ามีเบอร์นี้แล้วใช้ตัวเดิม
  let customer: any = null
  if (phone) {
    const { data: existing } = await supabase
      .from('customers').select('*')
      .eq('shop_id', branch.shop_id).eq('phone', phone).maybeSingle()
    if (existing) {
      customer = existing
      // อัพเดต line_user_id ถ้ายังไม่มี
      if (lineUserId && !existing.line_user_id) {
        await supabase.from('customers')
          .update({ line_user_id: lineUserId })
          .eq('id', existing.id)
        customer.line_user_id = lineUserId
      }
    }
  }

  if (!customer) {
    const { data: c, error } = await supabase
      .from('customers')
      .insert({ shop_id: branch.shop_id, name, phone, line_user_id: lineUserId })
      .select().single()
    if (error || !c)
      return NextResponse.json({ message: 'บันทึกข้อมูลไม่สำเร็จ' }, { status: 500 })
    customer = c
  }

  // สร้าง booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      branch_id:    branchId,
      customer_id:  customer.id,
      service_id:   serviceId,
      booking_date: bookingDate,
      start_time:   time,
      end_time:     endTime,
      status:       'pending',
      total_price:  service.price,
    })
    .select().single()

  if (bookingError || !booking)
    return NextResponse.json(
      { message: bookingError?.message ?? 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )

  await supabase.from('booking_services').insert({
    booking_id:       booking.id,
    service_id:       serviceId,
    duration_minutes: service.duration_minutes,
    price:            service.price,
  })

  // ส่ง LINE notify (ทั้งลูกค้า + admin)
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/line/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'booking_pending',
        data: {
          bookingId:    booking.id,
          lineUserId:   customer.line_user_id ?? null,
          customerName: name,
          phone:        phone ?? '',
          serviceName:  service.name,
          branchName:   branch.name,
          date:         bookingDate,
          time,
          price:        service.price,
        },
      }),
    })
  } catch {}

  return NextResponse.json({ ok: true, bookingId: booking.id })
}

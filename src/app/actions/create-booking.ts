'use server'

import { createClient } from '@/utils/supabase/server'
import { getLineSession } from '@/lib/line-session'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m + minutes, 0, 0)
  return d.toTimeString().slice(0, 5)
}

export async function createBooking(formData: FormData) {
  const supabase = await createClient()

  const branchId    = formData.get('branchId') as string
  const serviceId   = formData.get('serviceId') as string
  const time        = formData.get('time') as string
  const bookingDate = formData.get('date') as string
  const name        = (formData.get('name') as string)?.trim()
  const phone       = (formData.get('phone') as string)?.trim()

  if (!branchId || !serviceId || !time || !bookingDate || !name)
    redirect('/error?message=ข้อมูลไม่ครบถ้วน')
  if (!/^\d{10}$/.test(phone))
    redirect('/error?message=เบอร์โทรต้อง 10 หลัก')

  const session = await getLineSession()
  const lineUserId = session?.lineUserId ?? null

  // ✅ Optimize: รัน 3 queries พร้อมกัน
  const [
    { data: service },
    { data: branch },
    { data: existingBookings, error: existingErr },
  ] = await Promise.all([
    supabase.from('services').select('id, name, duration_minutes, price').eq('id', serviceId).single(),
    supabase.from('branches').select('id, name, shop_id, booking_mode, max_parallel_bookings').eq('id', branchId).single(),
    supabase.from('bookings').select('start_time, end_time')
      .eq('branch_id', branchId)
      .eq('booking_date', bookingDate)
      .in('status', ['pending', 'confirmed']),
  ])

  if (!service) redirect('/error?message=ไม่พบบริการ')
  if (!branch) redirect('/error?message=ไม่พบสาขา')
  if (existingErr) redirect('/error?message=ไม่สามารถตรวจสอบคิวได้')

  const endTime = addMinutes(time, service.duration_minutes)

  const overlapping = existingBookings?.filter((b: any) =>
    time < String(b.end_time).slice(0, 5) && endTime > String(b.start_time).slice(0, 5)
  ).length ?? 0

  if (branch.booking_mode === 'single' && overlapping >= 1)
    redirect('/error?message=เวลานี้ถูกจองแล้ว')
  if (branch.booking_mode === 'capacity' && overlapping >= branch.max_parallel_bookings)
    redirect('/error?message=เวลานี้เต็มแล้ว')

  // ✅ Optimize: หา existing customer ครั้งเดียว (LINE > phone)
  let customer: any = null
  if (lineUserId) {
    const { data } = await supabase
      .from('customers').select('id, line_user_id')
      .eq('shop_id', branch.shop_id)
      .eq('line_user_id', lineUserId)
      .maybeSingle()
    customer = data
  }
  if (!customer) {
    const { data } = await supabase
      .from('customers').select('id, line_user_id')
      .eq('shop_id', branch.shop_id)
      .eq('phone', phone)
      .maybeSingle()
    customer = data
  }

  // upsert
  if (customer) {
    const updates: any = { name, phone, updated_at: new Date().toISOString() }
    if (lineUserId && !customer.line_user_id) updates.line_user_id = lineUserId
    await supabase.from('customers').update(updates).eq('id', customer.id)
  } else {
    const { data: newC, error: cErr } = await supabase
      .from('customers')
      .insert({ shop_id: branch.shop_id, name, phone, line_user_id: lineUserId })
      .select('id').single()
    if (cErr || !newC) redirect('/error?message=บันทึกข้อมูลลูกค้าไม่สำเร็จ')
    customer = newC
  }

  // สร้าง booking
  const { data: booking, error: bookingErr } = await supabase
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
    .select('id').single()

  if (bookingErr || !booking)
    redirect(`/error?message=${encodeURIComponent(bookingErr?.message ?? 'ไม่สามารถสร้าง booking ได้')}`)

  // ✅ Optimize: booking_services insert ไม่ block redirect (ไม่ critical)
  // ✅ LINE notify ทำหลัง response (ไม่ block ลูกค้า)
  const bookingId = booking.id
  const finalLineUserId = lineUserId ?? customer.line_user_id ?? null

  after(async () => {
    await Promise.allSettled([
      supabase.from('booking_services').insert({
        booking_id:       bookingId,
        service_id:       serviceId,
        duration_minutes: service.duration_minutes,
        price:            service.price,
      }),
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/line/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:   'booking_pending',
          shopId: branch.shop_id,
          data: {
            bookingId,
            lineUserId:   finalLineUserId,
            customerName: name,
            phone,
            serviceName:  service.name,
            branchName:   branch.name,
            date:         bookingDate,
            time,
            price:        service.price,
          },
        }),
      }).catch(err => console.error('LINE notify failed:', err)),
    ])
  })

  redirect('/success?pending=true')
}

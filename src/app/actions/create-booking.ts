'use server'

import { createClient } from '@/utils/supabase/server'
import { getLineSession } from '@/lib/line-session'
import { redirect } from 'next/navigation'

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, mins + minutes, 0, 0)
  return date.toTimeString().slice(0, 5)
}

export async function createBooking(formData: FormData) {
  const supabase = await createClient()

  const branchId    = formData.get('branchId') as string
  const serviceId   = formData.get('serviceId') as string
  const time        = formData.get('time') as string
  const bookingDate = formData.get('date') as string
  const name        = formData.get('name') as string
  const phone       = formData.get('phone') as string

  // ✅ ดึง lineUserId จาก cookie ที่ /liff set ไว้
  const session = await getLineSession()
  const lineUserId = session?.lineUserId ?? null

  if (!branchId || !serviceId || !time || !bookingDate || !name) {
    redirect('/error?message=ข้อมูลไม่ครบถ้วน')
  }

  const { data: service } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  if (!service) redirect('/error?message=ไม่พบบริการ')

  const { data: branch } = await supabase
    .from('branches').select('*').eq('id', branchId).single()
  if (!branch) redirect('/error?message=ไม่พบสาขา')

  const { data: shop } = await supabase
    .from('shops').select('id').eq('id', branch.shop_id).single()

  const endTime = addMinutes(time, service.duration_minutes)

  const { data: existingBookings, error: existingError } = await supabase
    .from('bookings')
    .select('start_time, end_time, status')
    .eq('branch_id', branchId)
    .eq('booking_date', bookingDate)
    .in('status', ['pending', 'confirmed'])

  if (existingError) redirect('/error?message=ไม่สามารถตรวจสอบคิวได้')

  const overlapping = existingBookings?.filter((b: any) =>
    time < String(b.end_time).slice(0, 5) && endTime > String(b.start_time).slice(0, 5)
  ).length ?? 0

  if (branch.booking_mode === 'single' && overlapping >= 1)
    redirect('/error?message=เวลานี้ถูกจองแล้ว')
  if (branch.booking_mode === 'capacity' && overlapping >= branch.max_parallel_bookings)
    redirect('/error?message=เวลานี้เต็มแล้ว')

  // upsert customer
  let customer: any = null
  if (phone) {
    const { data: existing } = await supabase
      .from('customers').select('*')
      .eq('shop_id', branch.shop_id).eq('phone', phone).maybeSingle()
    if (existing) {
      customer = existing
      if (lineUserId && !existing.line_user_id) {
        await supabase.from('customers')
          .update({ line_user_id: lineUserId })
          .eq('id', existing.id)
        customer.line_user_id = lineUserId
      }
    }
  }

  if (!customer) {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({ shop_id: branch.shop_id, name, phone, line_user_id: lineUserId })
      .select().single()
    if (customerError || !newCustomer)
      redirect('/error?message=ไม่สามารถบันทึกข้อมูลลูกค้าได้')
    customer = newCustomer
  }

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
    redirect(`/error?message=${encodeURIComponent(bookingError?.message ?? 'ไม่สามารถสร้าง booking ได้')}`)

  await supabase.from('booking_services').insert({
    booking_id:       booking.id,
    service_id:       serviceId,
    duration_minutes: service.duration_minutes,
    price:            service.price,
  })

  // ส่ง LINE notify
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/line/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:   'booking_pending',
        shopId: shop?.id,
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
  } catch (err) {
    console.error('LINE notify failed (non-critical):', err)
  }

  redirect('/success?pending=true')
}

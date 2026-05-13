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
  const name        = (formData.get('name') as string)?.trim()
  const phone       = (formData.get('phone') as string)?.trim()

  // ✅ validate
  if (!branchId || !serviceId || !time || !bookingDate || !name) {
    redirect('/error?message=ข้อมูลไม่ครบถ้วน')
  }
  if (!/^\d{10}$/.test(phone)) {
    redirect('/error?message=เบอร์โทรต้อง 10 หลัก')
  }

  // ✅ ดึง lineUserId จาก session
  const session = await getLineSession()
  const lineUserId = session?.lineUserId ?? null

  const { data: service } = await supabase
    .from('services').select('*').eq('id', serviceId).single()
  if (!service) redirect('/error?message=ไม่พบบริการ')

  const { data: branch } = await supabase
    .from('branches').select('*').eq('id', branchId).single()
  if (!branch) redirect('/error?message=ไม่พบสาขา')

  const { data: shop } = await supabase
    .from('shops').select('id').eq('id', branch.shop_id).single()

  const endTime = addMinutes(time, service.duration_minutes)

  // overlap check
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

  // ===========================================
  // ✅ Upsert customer — ยึด line_user_id เป็นหลัก
  // ===========================================
  let customer: any = null

  // 1. หา customer จาก line_user_id ก่อน (ถ้ามี session)
  if (lineUserId) {
    const { data: byLine } = await supabase
      .from('customers').select('*')
      .eq('shop_id', branch.shop_id)
      .eq('line_user_id', lineUserId)
      .maybeSingle()
    if (byLine) {
      customer = byLine
      // อัพเดต name + phone เสมอ (ใช้ค่าล่าสุดจากฟอร์ม)
      await supabase.from('customers')
        .update({ name, phone, updated_at: new Date().toISOString() })
        .eq('id', byLine.id)
      customer.name = name
      customer.phone = phone
    }
  }

  // 2. ถ้าไม่เจอจาก LINE — หาด้วยเบอร์ (เผื่อเคยจองก่อน LINE)
  if (!customer) {
    const { data: byPhone } = await supabase
      .from('customers').select('*')
      .eq('shop_id', branch.shop_id)
      .eq('phone', phone)
      .maybeSingle()
    if (byPhone) {
      customer = byPhone
      // ผูก lineUserId เข้ามา + อัพเดต name
      const updates: any = { name, updated_at: new Date().toISOString() }
      if (lineUserId && !byPhone.line_user_id) {
        updates.line_user_id = lineUserId
      }
      await supabase.from('customers').update(updates).eq('id', byPhone.id)
      customer.name = name
      if (updates.line_user_id) customer.line_user_id = lineUserId
    }
  }

  // 3. สร้างใหม่ถ้ายังไม่เจอ
  if (!customer) {
    const { data: newC, error: cErr } = await supabase
      .from('customers')
      .insert({ shop_id: branch.shop_id, name, phone, line_user_id: lineUserId })
      .select().single()
    if (cErr || !newC) redirect('/error?message=บันทึกข้อมูลลูกค้าไม่สำเร็จ')
    customer = newC
  }

  // ===========================================
  // สร้าง booking
  // ===========================================
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

  // LINE notify
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
    console.error('LINE notify failed:', err)
  }

  redirect('/success?pending=true')
}

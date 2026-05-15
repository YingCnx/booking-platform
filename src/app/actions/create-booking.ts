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

  // ✅ อ่าน field keys ที่ส่งมา
  const fieldKeysRaw   = (formData.get('_field_keys')   as string) ?? ''
  const fieldLabelsRaw = (formData.get('_field_labels') as string) ?? ''
  const fieldKeys   = fieldKeysRaw.split(',').filter(Boolean)
  const fieldLabels = fieldLabelsRaw.split('|')

  // เก็บค่าทุก field ที่ส่งมา
  const fieldValues: Record<string, string> = {}
  fieldKeys.forEach(k => {
    const v = (formData.get(`field_${k}`) as string)?.trim() ?? ''
    fieldValues[k] = v
  })

  // ✅ field สำคัญ (system)
  const name  = fieldValues.name  ?? ''
  const phone = fieldValues.phone ?? ''

  if (!branchId || !serviceId || !time || !bookingDate || !name)
    redirect('/error?message=ข้อมูลไม่ครบถ้วน')
  if (phone && !/^\d{10}$/.test(phone))
    redirect('/error?message=เบอร์โทรต้อง 10 หลัก')

  const session = await getLineSession()
  const lineUserId = session?.lineUserId ?? null

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

  // ===========================================
  // Customer upsert — ยึด line_user_id เป็นหลัก
  // ถ้ามี line_user_id ใน DB แล้ว → UPDATE ชื่อ+เบอร์เสมอ ไม่ INSERT ใหม่
  // ===========================================
  let customer: any = null

  if (lineUserId) {
    const { data } = await supabase
      .from('customers').select('id, line_user_id')
      .eq('shop_id', branch.shop_id)
      .eq('line_user_id', lineUserId)
      .maybeSingle()
    customer = data
  }

  if (customer) {
    // มี line_user_id ในระบบแล้ว → UPDATE ชื่อ+เบอร์เสมอ
    await supabase.from('customers').update({
      name, phone,
      updated_at: new Date().toISOString(),
    }).eq('id', customer.id)
  } else {
    // ไม่เจอจาก LINE → หาจากเบอร์ (ถ้ามี)
    if (phone) {
      const { data: byPhone } = await supabase
        .from('customers').select('id, line_user_id')
        .eq('shop_id', branch.shop_id)
        .eq('phone', phone)
        .maybeSingle()
      if (byPhone) {
        const updates: any = { name, updated_at: new Date().toISOString() }
        if (lineUserId && !byPhone.line_user_id) updates.line_user_id = lineUserId
        await supabase.from('customers').update(updates).eq('id', byPhone.id)
        customer = byPhone
      }
    }
    if (!customer) {
      const { data: newC, error: cErr } = await supabase
        .from('customers')
        .insert({ shop_id: branch.shop_id, name, phone, line_user_id: lineUserId })
        .select('id').single()
      if (cErr || !newC) redirect('/error?message=บันทึกข้อมูลลูกค้าไม่สำเร็จ')
      customer = newC
    }
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

  const bookingId = booking.id
  const finalLineUserId = lineUserId ?? customer.line_user_id ?? null

  // ✅ บันทึก booking_details — field ที่ไม่ใช่ system (ไม่ใช่ name/phone)
  const detailRows: { booking_id: string; field_key: string; field_label: string; value: string }[] = []
  fieldKeys.forEach((k, i) => {
    if (k === 'name' || k === 'phone') return  // skip system fields
    const v = fieldValues[k]
    if (!v) return
    detailRows.push({
      booking_id: bookingId,
      field_key:  k,
      field_label: fieldLabels[i] ?? k,
      value: v,
    })
  })

  // เตรียม details array สำหรับ Flex Message
  const detailsForFlex = detailRows.map(r => ({ label: r.field_label, value: r.value }))

  // ✅ insert booking_services + booking_details + notify หลัง response
  after(async () => {
    await Promise.allSettled([
      supabase.from('booking_services').insert({
        booking_id:       bookingId,
        service_id:       serviceId,
        duration_minutes: service.duration_minutes,
        price:            service.price,
      }),
      detailRows.length > 0
        ? supabase.from('booking_details').insert(detailRows)
        : Promise.resolve(),
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
            details:      detailsForFlex,
          },
        }),
      }).catch(err => console.error('LINE notify failed:', err)),
    ])
  })

  redirect('/success?pending=true')
}

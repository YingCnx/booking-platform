'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

function addMinutes(
  time: string,
  minutes: number
) {

  const [hours, mins] =
    time.split(':').map(Number)

  const date = new Date()

  date.setHours(
    hours,
    mins + minutes,
    0,
    0
  )

  return date
    .toTimeString()
    .slice(0, 5)
}

// verify token กับ LINE
async function verifyLineToken(
  idToken: string
) {

  const response = await fetch(
    'https://api.line.me/oauth2/v2.1/verify',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },

      body: new URLSearchParams({
        id_token: idToken,

        client_id:
          process.env.NEXT_PUBLIC_LIFF_ID!,
      }),
    }
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

export async function createBooking(
  formData: FormData
) {

  const supabase =
    await createClient()

  const branchId =
    formData.get('branchId') as string

  const serviceId =
    formData.get('serviceId') as string

  const time =
    formData.get('time') as string

  const bookingDate =
    formData.get('date') as string

  const name =
    formData.get('name') as string

  const phone =
    formData.get('phone') as string

  const idToken =
    formData.get('idToken') as string

  // ต้อง login LINE เท่านั้น
  const profile =
    await verifyLineToken(idToken)

  if (!profile?.sub) {

    redirect(
      '/error?message=กรุณาเปิดผ่าน LINE'
    )
  }

  // line user id จริง
  const lineUserId = profile.sub

  if (
    !branchId ||
    !serviceId ||
    !time ||
    !bookingDate ||
    !name
  ) {

    redirect(
      '/error?message=ข้อมูลไม่ครบ'
    )
  }

  // service
  const { data: service } =
    await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single()

  if (!service) {

    redirect(
      '/error?message=ไม่พบบริการ'
    )
  }

  // branch
  const { data: branch } =
    await supabase
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .single()

  if (!branch) {

    redirect(
      '/error?message=ไม่พบสาขา'
    )
  }

  const endTime =
    addMinutes(
      time,
      service.duration_minutes
    )

  // overlap
  const {
    data: existingBookings
  } = await supabase
    .from('bookings')
    .select(`
      start_time,
      end_time,
      status
    `)
    .eq('branch_id', branchId)
    .eq('booking_date', bookingDate)
    .in('status', [
      'pending',
      'confirmed',
    ])

  const overlapping =
    existingBookings?.filter(
      (b: any) =>

        time <
          String(b.end_time)
            .slice(0, 5)

        &&

        endTime >
          String(b.start_time)
            .slice(0, 5)
    ).length ?? 0

  if (
    branch.booking_mode === 'single'
    &&
    overlapping >= 1
  ) {

    redirect(
      '/error?message=เวลานี้ถูกจองแล้ว'
    )
  }

  if (
    branch.booking_mode === 'capacity'
    &&
    overlapping >=
      branch.max_parallel_bookings
  ) {

    redirect(
      '/error?message=เวลานี้เต็มแล้ว'
    )
  }

  // customer
  let customer: any = null

  if (phone) {

    const { data: existing } =
      await supabase
        .from('customers')
        .select('*')
        .eq(
          'shop_id',
          branch.shop_id
        )
        .eq('phone', phone)
        .maybeSingle()

    if (existing) {

      customer = existing

      // update line id
      if (
        !existing.line_user_id
      ) {

        await supabase
          .from('customers')
          .update({
            line_user_id:
              lineUserId
          })
          .eq(
            'id',
            existing.id
          )

        customer.line_user_id =
          lineUserId
      }
    }
  }

  // create customer
  if (!customer) {

    const {
      data: newCustomer,
      error: customerError
    } = await supabase
      .from('customers')
      .insert({
        shop_id:
          branch.shop_id,

        name,

        phone,

        line_user_id:
          lineUserId,
      })
      .select()
      .single()

    if (
      customerError
      ||
      !newCustomer
    ) {

      redirect(
        '/error?message=สร้างลูกค้าไม่สำเร็จ'
      )
    }

    customer = newCustomer
  }

  // create booking
  const {
    data: booking,
    error: bookingError
  } = await supabase
    .from('bookings')
    .insert({
      branch_id: branchId,

      customer_id:
        customer.id,

      service_id:
        serviceId,

      booking_date:
        bookingDate,

      start_time: time,

      end_time: endTime,

      status: 'pending',

      total_price:
        service.price,
    })
    .select()
    .single()

  if (
    bookingError
    ||
    !booking
  ) {

    redirect(
      `/error?message=${encodeURIComponent(
        bookingError?.message ??
        'booking failed'
      )}`
    )
  }

  // booking services
  await supabase
    .from('booking_services')
    .insert({
      booking_id:
        booking.id,

      service_id:
        serviceId,

      duration_minutes:
        service.duration_minutes,

      price:
        service.price,
    })

  redirect(
    '/success?pending=true'
  )
}
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

// ==============================================
// VERIFY LINE ID TOKEN
// ==============================================

async function verifyLineToken(
  idToken: string
) {

  try {

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
            process.env
              .NEXT_PUBLIC_LIFF_ID!,
        }),
      }
    )

    if (!response.ok) {
      return null
    }

    return response.json()

  } catch (err) {

    console.error(
      'LINE verify error:',
      err
    )

    return null
  }
}

// ==============================================
// SEND LINE NOTIFY
// ==============================================

async function sendLineNotify(
  type: string,
  data: object
) {

  try {

    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/line/notify`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          type,
          data,
        }),
      }
    )

  } catch (err) {

    console.error(
      'LINE notify failed:',
      err
    )
  }
}

// ==============================================
// CREATE BOOKING
// ==============================================

export async function createBooking(
  formData: FormData
) {

  const supabase =
    await createClient()

  // ============================================
  // FORM DATA
  // ============================================

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

  // ✅ รับ idToken แทน lineUserId
  const idToken =
    formData.get('idToken') as string

  // ============================================
  // VERIFY LINE TOKEN
  // ============================================

  const profile =
    await verifyLineToken(idToken)

  // ถ้า verify ไม่ผ่าน
  if (!profile?.sub) {

    redirect(
      '/error?message=กรุณาเปิดผ่าน LINE'
    )
  }

  // ✅ LINE USER ID จริง
  const lineUserId =
    profile.sub

  // ============================================
  // VALIDATE
  // ============================================

  if (
    !branchId ||
    !serviceId ||
    !time ||
    !bookingDate ||
    !name
  ) {

    redirect(
      '/error?message=ข้อมูลไม่ครบถ้วน'
    )
  }

  // ============================================
  // GET SERVICE
  // ============================================

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

  // ============================================
  // GET BRANCH
  // ============================================

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

  // ============================================
  // CALCULATE END TIME
  // ============================================

  const endTime =
    addMinutes(
      time,
      service.duration_minutes
    )

  // ============================================
  // CHECK OVERLAP
  // ============================================

  const {
    data: existingBookings,
    error: existingError,
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

  if (existingError) {

    redirect(
      '/error?message=ไม่สามารถตรวจสอบคิวได้'
    )
  }

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

  // single mode
  if (
    branch.booking_mode === 'single'
    &&
    overlapping >= 1
  ) {

    redirect(
      '/error?message=เวลานี้ถูกจองแล้ว'
    )
  }

  // capacity mode
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

  // ============================================
  // UPSERT CUSTOMER
  // ============================================

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

    // existing customer
    if (existing) {

      customer = existing

      // update line id
      if (
        lineUserId &&
        !existing.line_user_id
      ) {

        await supabase
          .from('customers')
          .update({
            line_user_id:
              lineUserId,
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
      error: customerError,
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
        '/error?message=ไม่สามารถบันทึกลูกค้าได้'
      )
    }

    customer = newCustomer
  }

  // ============================================
  // CREATE BOOKING
  // ============================================

  const {
    data: booking,
    error: bookingError,
  } = await supabase
    .from('bookings')
    .insert({
      branch_id:
        branchId,

      customer_id:
        customer.id,

      service_id:
        serviceId,

      booking_date:
        bookingDate,

      start_time:
        time,

      end_time:
        endTime,

      // รอร้านยืนยัน
      status:
        'pending',

      total_price:
        service.price,
    })
    .select()
    .single()

  if (
    bookingError ||
    !booking
  ) {

    redirect(
      `/error?message=${encodeURIComponent(
        bookingError?.message ??
        'ไม่สามารถสร้าง booking ได้'
      )}`
    )
  }

  // ============================================
  // BOOKING SERVICES
  // ============================================

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

  // ============================================
  // SEND LINE NOTIFY
  // ============================================

  await sendLineNotify(
    'booking_pending',
    {
      bookingId:
        booking.id,

      lineUserId,

      customerName:
        name,

      phone:
        phone ?? '',

      serviceName:
        service.name,

      branchName:
        branch.name,

      date:
        bookingDate,

      time,

      price:
        service.price,
    }
  )

  // ============================================
  // SUCCESS
  // ============================================

  redirect(
    '/success?pending=true'
  )
}